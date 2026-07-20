"""
Publishes the exported document as a Confluence page (creating or updating
one matching the project title) with the export file attached, via
Confluence Cloud's REST API and email + API-token basic auth.
"""
import base64
from pathlib import Path

from app.config import CONFLUENCE_API_TOKEN, CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, CONFLUENCE_SPACE_KEY
from app.services.publishers.base import PublishResult


class ConfluencePublisher:
    name = "confluence"

    def is_configured(self) -> bool:
        return bool(CONFLUENCE_BASE_URL and CONFLUENCE_EMAIL and CONFLUENCE_API_TOKEN and CONFLUENCE_SPACE_KEY)

    def _headers(self) -> dict:
        token = base64.b64encode(f"{CONFLUENCE_EMAIL}:{CONFLUENCE_API_TOKEN}".encode()).decode()
        return {"Authorization": f"Basic {token}"}

    def publish(self, file_path: str, title: str) -> PublishResult:
        if not self.is_configured():
            return PublishResult(
                success=False, remote_url=None,
                error="Confluence is not configured. Set CONFLUENCE_BASE_URL/EMAIL/API_TOKEN/SPACE_KEY in .env.",
            )
        try:
            import httpx

            headers = self._headers()
            existing = httpx.get(
                f"{CONFLUENCE_BASE_URL}/wiki/rest/api/content",
                params={"spaceKey": CONFLUENCE_SPACE_KEY, "title": title, "expand": "version"},
                headers=headers, timeout=30,
            )
            existing.raise_for_status()
            results = existing.json().get("results", [])

            body = {"storage": {"value": f"<p>SOP document: {title} (see attachment).</p>", "representation": "storage"}}
            if results:
                page = results[0]
                resp = httpx.put(
                    f"{CONFLUENCE_BASE_URL}/wiki/rest/api/content/{page['id']}",
                    headers={**headers, "Content-Type": "application/json"},
                    json={
                        "id": page["id"], "type": "page", "title": title,
                        "version": {"number": page["version"]["number"] + 1}, "body": body,
                    },
                    timeout=30,
                )
            else:
                resp = httpx.post(
                    f"{CONFLUENCE_BASE_URL}/wiki/rest/api/content",
                    headers={**headers, "Content-Type": "application/json"},
                    json={"type": "page", "title": title, "space": {"key": CONFLUENCE_SPACE_KEY}, "body": body},
                    timeout=30,
                )
            resp.raise_for_status()
            page_data = resp.json()

            with open(file_path, "rb") as f:
                attach_resp = httpx.post(
                    f"{CONFLUENCE_BASE_URL}/wiki/rest/api/content/{page_data['id']}/child/attachment",
                    headers={**headers, "X-Atlassian-Token": "nocheck"},
                    files={"file": (Path(file_path).name, f)},
                    timeout=60,
                )
            attach_resp.raise_for_status()

            links = page_data.get("_links", {})
            remote_url = f"{links.get('base', CONFLUENCE_BASE_URL)}{links.get('webui', '')}"
            return PublishResult(success=True, remote_url=remote_url, error=None)
        except Exception as exc:  # noqa: BLE001 -- surfaced to the caller as a publish failure, not a crash
            return PublishResult(success=False, remote_url=None, error=str(exc))
