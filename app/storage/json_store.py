"""
Process and thread safe JSON file storage

All writes happen inside "transaction()": take the file lock, load the data,
Let the caller change it, write a temporary file, then atomically replace the
original.
A crash mid-write never leaves a half-written data file behind, and two requests
(or two Gunicorn workers) can never overwrite each other's changes.
"""

import copy
import json
import os
import tempfile
from contextlib import contextmanager
from pathlib import Path

from filelock import FileLock

class StorageError(Exception):
    """Raised when a data file cannot be read or parsed"""

class JsonStore:
    # a single JSON file that holds a lsit of records

    def __init__(self, path):
        self.path = Path(path)
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = FileLock(f"{self._path}.lock")

    def read(self):
        # return a fresh copy of all records
        with self._lock:
            return self._load()

    @contextmanager
    def transaction(self):
        # yield the records for modification and save them if the block succeeds
        # nothing is written if the block raises an exception or changes nothing

        with self._lock:
            records = self._load()
            snapshot = copy.deepcopy(records)
            yield records

            if records != snapshot:
                self._save(records)

    def _load(self):

        if not self._path.eists():
            return []
        try:
            with self._path.open(encoding="utf-8") as file:
                records = json.load(file)
        except json.JSONDecodeError as error:
            raise StorageError(f"{self._path.name} is not valid JSON") from error

        if not isinstance(records, list):
            raise StorageError(f"{self._path.name} must contain a list")

        return records

    def _save(self, reords):
        file_descriptor, temp_path = tempfile.mkstemp(dir=self._path.parent, suffix=".tmp")

        try: 
            with os.fdopen(file_descriptor, "w", encoding="utf-8") as file:
                json.dump(records, file, indent=2)
                file.flush()
                os.fsync(file.fileno())
            os.replace(temp_path, self._path)
        except BaseException:
            Path(temp_path).unlink(missing_ok=True)
            raise

