from concurrent.futures import ThreadPoolExecutor

import pytest

from app.storage import (
    DuplicateEmailError,
    JsonStore,
    StorageError,
    UserRepository,
    WarrantyRepository,
)

WARRANTY_FIELDS = {
    "product_name": "Sony Headphones",
    "purchase_date": "2025-03-14",
    "warranty_months": 24,
    "retailer": "Best Buy",
    "serial_number": "SN-1",
    "notes": "",
}


@pytest.fixture
def store(tmp_path):
    return JsonStore(tmp_path / "records.json")


@pytest.fixture
def users(tmp_path):
    return UserRepository(JsonStore(tmp_path / "users.json"))


@pytest.fixture
def warranties(tmp_path):
    return WarrantyRepository(JsonStore(tmp_path / "warranties.json"))


# JsonStore


def test_reading_a_missing_file_returns_an_empty_list(store):
    assert store.read() == []


def test_transaction_saves_changes(store):
    with store.transaction() as records:
        records.append({"name": "a"})

    assert store.read() == [{"name": "a"}]


def test_transaction_that_raises_saves_nothing(store):
    with pytest.raises(RuntimeError):
        with store.transaction() as records:
            records.append({"name": "a"})
            raise RuntimeError("boom")

    assert store.read() == []


def test_transaction_without_changes_does_not_create_the_file(tmp_path):
    path = tmp_path / "records.json"
    store = JsonStore(path)

    with store.transaction():
        pass

    assert not path.exists()


def test_no_temporary_files_are_left_behind(tmp_path, store):
    with store.transaction() as records:
        records.append({"name": "a"})

    suffixes = {entry.suffix for entry in tmp_path.iterdir()}
    assert ".tmp" not in suffixes


def test_corrupt_json_raises_a_storage_error(tmp_path):
    path = tmp_path / "records.json"
    path.write_text("{not json", encoding="utf-8")

    with pytest.raises(StorageError):
        JsonStore(path).read()


def test_a_non_list_file_raises_a_storage_error(tmp_path):
    path = tmp_path / "records.json"
    path.write_text('{"a": 1}', encoding="utf-8")

    with pytest.raises(StorageError):
        JsonStore(path).read()


def test_concurrent_transactions_do_not_lose_updates(store):
    def add_record(number):
        with store.transaction() as records:
            records.append({"n": number})

    with ThreadPoolExecutor(max_workers=8) as pool:
        list(pool.map(add_record, range(50)))

    assert sorted(record["n"] for record in store.read()) == list(range(50))


# UserRepository


def test_created_user_can_be_found_by_id_and_email(users):
    created = users.create("alice@example.com", "hash")

    assert users.find_by_id(created["id"])["email"] == "alice@example.com"
    assert users.find_by_email("alice@example.com")["id"] == created["id"]


def test_email_lookup_ignores_case_and_surrounding_spaces(users):
    created = users.create("Alice@Example.com", "hash")

    assert users.find_by_email("alice@example.com")["id"] == created["id"]
    assert users.find_by_email("  ALICE@example.com ")["id"] == created["id"]


def test_duplicate_email_is_rejected_regardless_of_case(users):
    users.create("alice@example.com", "hash")

    with pytest.raises(DuplicateEmailError):
        users.create("ALICE@example.com", "other-hash")


def test_unknown_user_returns_none(users):
    assert users.find_by_email("nobody@example.com") is None
    assert users.find_by_id("missing") is None


def test_users_survive_a_new_repository_instance(tmp_path):
    path = tmp_path / "users.json"
    UserRepository(JsonStore(path)).create("alice@example.com", "hash")

    assert UserRepository(JsonStore(path)).find_by_email("alice@example.com") is not None


# WarrantyRepository


def test_create_assigns_an_id_owner_and_timestamps(warranties):
    warranty = warranties.create("user-a", WARRANTY_FIELDS)

    assert warranty["id"]
    assert warranty["user_id"] == "user-a"
    assert warranty["created_at"] == warranty["updated_at"]
    assert warranty["product_name"] == "Sony Headphones"


def test_list_returns_only_the_owners_warranties(warranties):
    warranties.create("user-a", WARRANTY_FIELDS)
    warranties.create("user-b", WARRANTY_FIELDS)

    listed = warranties.list_for_user("user-a")

    assert len(listed) == 1
    assert listed[0]["user_id"] == "user-a"


def test_get_returns_none_for_another_users_warranty(warranties):
    theirs = warranties.create("user-b", WARRANTY_FIELDS)

    assert warranties.get("user-a", theirs["id"]) is None
    assert warranties.get("user-b", theirs["id"]) is not None


def test_get_returns_none_for_an_unknown_id(warranties):
    assert warranties.get("user-a", "missing") is None


def test_update_changes_the_owners_record(warranties):
    mine = warranties.create("user-a", WARRANTY_FIELDS)

    updated = warranties.update("user-a", mine["id"], {**WARRANTY_FIELDS, "product_name": "Renamed"})

    assert updated["product_name"] == "Renamed"
    assert warranties.get("user-a", mine["id"])["product_name"] == "Renamed"


def test_update_of_another_users_warranty_returns_none_and_changes_nothing(warranties):
    theirs = warranties.create("user-b", WARRANTY_FIELDS)

    result = warranties.update("user-a", theirs["id"], {**WARRANTY_FIELDS, "product_name": "Hacked"})

    assert result is None
    assert warranties.get("user-b", theirs["id"])["product_name"] == "Sony Headphones"


def test_delete_removes_the_owners_warranty(warranties):
    mine = warranties.create("user-a", WARRANTY_FIELDS)

    assert warranties.delete("user-a", mine["id"]) is True
    assert warranties.get("user-a", mine["id"]) is None


def test_delete_of_another_users_warranty_returns_false_and_keeps_it(warranties):
    theirs = warranties.create("user-b", WARRANTY_FIELDS)

    assert warranties.delete("user-a", theirs["id"]) is False
    assert warranties.get("user-b", theirs["id"]) is not None


@pytest.mark.parametrize("field", ["id", "user_id", "created_at", "updated_at", "extra"])
def test_fields_that_clients_must_not_set_are_rejected(warranties, field):
    mine = warranties.create("user-a", WARRANTY_FIELDS)
    bad_fields = {**WARRANTY_FIELDS, field: "x"}

    with pytest.raises(ValueError):
        warranties.create("user-a", bad_fields)
    with pytest.raises(ValueError):
        warranties.update("user-a", mine["id"], bad_fields)
