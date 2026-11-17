"""
User storage.

Records returned from this module include "password_hash". 
Callers must never send a user record to the client as is
"""

from .utils import new_id, utc_now_iso

class DuplicateEmailError(Exception):
    """ raised when an account with this email already exists """

def normalize_email(email):
    # return the canonical form used for storing and comparing emails
    return email.strip().lower()

class UserRepository:
    def __init__(self, store):
        self._store = store

    def create(self, email, password_hash):
        # create a user, or raise DeuplicateEmailError if the email is taken

        email = normalize_email(email)

        with self._store.transaction() as users:
            if any(user["email"] == email for user in users):
                raise DuplicateEmailError(email)
            user = {
                "id": new_id(),
                "email": email,
                "password_hash": password_hash,
                "created_at": utc_now_iso(),
            }

            users.append(user)

        return user

    def find_by_email(self, email):
        email = normalize_email(email)
        return next((user for user in self._store.read() if user["email"] == email), None)

    def find_by_id(self, user_id):
        return next((user for user in self._store.read() if user["id"] == user_id), None)
