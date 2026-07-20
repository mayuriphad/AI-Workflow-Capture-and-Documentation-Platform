"""
Stub -- same Publisher interface as the working providers, but ServiceNow's
OAuth setup is heavier org-specific configuration than fits a v1 default.
Wire up SERVICENOW_INSTANCE/SERVICENOW_TOKEN in .env and implement publish()
against the Attachment API (POST /api/now/attachment/file) to enable.
"""
from app.config import SERVICENOW_INSTANCE, SERVICENOW_TOKEN
from app.services.publishers.base import PublishResult


class ServiceNowPublisher:
    name = "servicenow"

    def is_configured(self) -> bool:
        return bool(SERVICENOW_INSTANCE and SERVICENOW_TOKEN)

    def publish(self, file_path: str, title: str) -> PublishResult:
        return PublishResult(
            success=False, remote_url=None,
            error="ServiceNow is not configured. Set SERVICENOW_INSTANCE/SERVICENOW_TOKEN in .env to enable.",
        )
