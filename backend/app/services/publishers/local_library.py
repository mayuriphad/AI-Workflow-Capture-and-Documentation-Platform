"""
Always-available publish target: copies the exported document into a
local "SOP Library" folder, served back over HTTP. Needs no external
credentials, so Publish always has one real, working option even before
SharePoint/Confluence are configured.
"""
import shutil
from pathlib import Path

from app.config import PUBLISHED_DIR
from app.services.publishers.base import PublishResult


class LocalLibraryPublisher:
    name = "local_library"

    def is_configured(self) -> bool:
        return True

    def publish(self, file_path: str, title: str) -> PublishResult:
        try:
            dest = PUBLISHED_DIR / Path(file_path).name
            shutil.copy2(file_path, dest)
            return PublishResult(success=True, remote_url=f"/library-files/{dest.name}", error=None)
        except Exception as exc:  # noqa: BLE001 -- surfaced to the caller as a publish failure, not a crash
            return PublishResult(success=False, remote_url=None, error=str(exc))
