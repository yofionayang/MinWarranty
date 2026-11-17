"""
Small helpers shared by the storage modules
"""

from datetime import datetime, timezone
from uuid import uuid4


def new_id():
    # return a random, unguessable identifier
    return uuid4().hex

def utc_now_iso():
    # return the current UTC time as an ISO 8601 string

    return datetime.now(timezone.utc).isoformat(timespec="seconds")

