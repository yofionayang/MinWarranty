"""Warranty Storage
Every operation takes the owner's ``user_id``. A warranty that belongs to
someone else is indistinguishable from one that does not exist (``None`` or
``False`` is returned), so routes can answer 404 for both cases and never
reveal that another user's record exists.
"""

from .utils import new_id, utc_now_iso

EDITABLE_FIELDS = frozenset(
    {
        "product_name",
        "purchase_date",
        "warranty_months",
        "retailer",
        "serial_number",
        "notes",
    }
)

def _checked_fields(fields):
    # reject anything a client should never be able to set (id, user_id, ...)

    unknown = set(fields) - EDITABLE_FIELDS

    if unknown:
        raise ValueError(f"Unknown warranty fields: {sorted(unknown)}")
    return dict(fields)

def _find_owned(warranties, user_id, warranty_id):
    return next(
        (
            warranty
            for warranty in warranties
                if warranty["id"] == warranty_id and warranty["user_id"] == user_id
        ),
        None,
    )

class WarrantyRepository:

    def __init__(self,store):
        self._store = store

    def list_for_user(self, user_id):
        return [w for w in self._store.read() if w["user_id"] == user_id]

    def get(self, user_id, warranty_id):
        return _find_owned(self._store.read(), user_id, warranty_id)

    def create(self, user_id, fields):

        fields = _checked_fields(fields)
        now = utc_now_iso()

        warranty = {
            "id": new_id(),
            "user_id": user_id,
            **fields,
            "created_at": now,
            "updated_at": now,
        }

        with self._store.transaction() as warranties:
            warranties.append(warranty)
        return warranty

def update(self, user_id, warranty_id, fields):
    # replace the editable fileds. Returns the updated warranty or none

    fields = _checked_fields(fields)

    with self._store.transaction() as warranties:
        warranty = _find_owned(warranties, user_id, warranty_id)

        if warranty is None:
            return None

        warranty.update(fields)
        warranty["updated_at"] = utc_now_iso()

        return dict(warranty)

def delete(self, user_id, warranty_id):
    # delete a warranty. Returns True if it was deleted, False otherwise

    with self._store.transaction() as warranties:
        warranty= _find_owned(warranties, user_id, warranty_id)

        if warranty is None:
            return False

        warranties.remove(warranty)

        return True
        

        