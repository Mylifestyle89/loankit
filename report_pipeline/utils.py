import json
import os
import time
from pathlib import Path
from typing import Optional


class FileLockManager:
    def __init__(
        self,
        root_dir: Path | str = ".",
        retry_interval_sec: float = 0.2,
        timeout_sec: float = 5.0,
        stale_sec: float = 60.0,
    ) -> None:
        root = Path(root_dir).resolve()
        self._lock_dir = root / "report_assets" / ".locks"
        self._retry_interval_sec = retry_interval_sec
        self._timeout_sec = timeout_sec
        self._stale_sec = stale_sec

    def _sanitize_resource_id(self, resource_id: str) -> str:
        allowed = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-")
        return "".join(ch if ch in allowed else "_" for ch in resource_id)

    def _lock_path(self, resource_id: str) -> Path:
        safe = self._sanitize_resource_id(resource_id)
        return self._lock_dir / f"{safe}.lock"

    def _is_stale(self, lock_path: Path) -> bool:
        try:
            stat = lock_path.stat()
        except FileNotFoundError:
            return False
        age_sec = time.time() - stat.st_mtime
        return age_sec > self._stale_sec

    def acquire_lock(self, resource_id: str) -> None:
        if not resource_id.strip():
            raise ValueError("resource_id is required.")

        self._lock_dir.mkdir(parents=True, exist_ok=True)
        lock_path = self._lock_path(resource_id)
        started = time.time()

        while (time.time() - started) <= self._timeout_sec:
            try:
                fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                try:
                    payload = {
                        "resourceId": resource_id,
                        "pid": os.getpid(),
                        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    }
                    os.write(fd, json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"))
                finally:
                    os.close(fd)
                return
            except FileExistsError:
                if self._is_stale(lock_path):
                    try:
                        lock_path.unlink()
                    except FileNotFoundError:
                        pass
                    continue
                time.sleep(self._retry_interval_sec)

        raise TimeoutError(
            f"Timeout acquiring lock for resource '{resource_id}' after {self._timeout_sec} seconds."
        )

    def release_lock(self, resource_id: str) -> None:
        if not resource_id.strip():
            return
        lock_path = self._lock_path(resource_id)
        try:
            lock_path.unlink()
        except FileNotFoundError:
            pass

