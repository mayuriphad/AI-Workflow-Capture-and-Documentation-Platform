"""
Publishes the exported document to a SharePoint document library via the
Microsoft Graph API.

Uses MSAL device-code delegated auth (one-time interactive browser login,
token cached in memory for the process lifetime) rather than app-only
client-credentials -- client-credentials needs an Azure AD app registration
with admin consent, a much heavier setup for a personal desktop tool than a
one-time interactive login.
"""
from pathlib import Path

from app.config import SHAREPOINT_CLIENT_ID, SHAREPOINT_DRIVE_ID, SHAREPOINT_SITE_ID, SHAREPOINT_TENANT_ID
from app.services.publishers.base import PublishResult

GRAPH_SCOPES = ["Files.ReadWrite.All", "Sites.ReadWrite.All"]


class SharePointPublisher:
    name = "sharepoint"

    def __init__(self) -> None:
        self._msal_app = None

    def is_configured(self) -> bool:
        return bool(SHAREPOINT_CLIENT_ID and SHAREPOINT_TENANT_ID and SHAREPOINT_SITE_ID and SHAREPOINT_DRIVE_ID)

    def _get_token(self) -> str:
        import msal

        if self._msal_app is None:
            self._msal_app = msal.PublicClientApplication(
                SHAREPOINT_CLIENT_ID, authority=f"https://login.microsoftonline.com/{SHAREPOINT_TENANT_ID}"
            )

        accounts = self._msal_app.get_accounts()
        result = self._msal_app.acquire_token_silent(GRAPH_SCOPES, account=accounts[0]) if accounts else None

        if not result:
            flow = self._msal_app.initiate_device_flow(scopes=GRAPH_SCOPES)
            if "user_code" not in flow:
                raise RuntimeError("Failed to start SharePoint device-code login")
            print(flow["message"])  # one-time interactive login prompt, visible in the backend's console
            result = self._msal_app.acquire_token_by_device_flow(flow)

        if "access_token" not in result:
            raise RuntimeError(f"SharePoint auth failed: {result.get('error_description', result)}")
        return result["access_token"]

    def publish(self, file_path: str, title: str) -> PublishResult:
        if not self.is_configured():
            return PublishResult(
                success=False, remote_url=None,
                error="SharePoint is not configured. Set SHAREPOINT_TENANT_ID/CLIENT_ID/SITE_ID/DRIVE_ID in .env.",
            )
        try:
            import httpx

            token = self._get_token()
            filename = Path(file_path).name
            url = (
                f"https://graph.microsoft.com/v1.0/sites/{SHAREPOINT_SITE_ID}"
                f"/drives/{SHAREPOINT_DRIVE_ID}/root:/{filename}:/content"
            )
            resp = httpx.put(
                url, headers={"Authorization": f"Bearer {token}"}, content=Path(file_path).read_bytes(), timeout=60
            )
            resp.raise_for_status()
            return PublishResult(success=True, remote_url=resp.json().get("webUrl"), error=None)
        except Exception as exc:  # noqa: BLE001 -- surfaced to the caller as a publish failure, not a crash
            return PublishResult(success=False, remote_url=None, error=str(exc))
