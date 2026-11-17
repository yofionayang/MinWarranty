"""
Storage layer: JSON-file persistence with per-user data isolation
"""

from .json_store import JsonStore, StorageError
from .users import DuplicateEmailError, UserRepository
from .warranties import WarrantyRepository

__all__ = [
    "DuplicateEmailError",
    "JsonStore",
    "StorageError",
    "UserRepository",
    "WarrantyRepository",
]