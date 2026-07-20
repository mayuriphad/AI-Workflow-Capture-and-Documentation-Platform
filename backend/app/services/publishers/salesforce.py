"""
Stub -- same Publisher interface as the working providers, but Salesforce's
OAuth setup is heavier org-specific configuration than fits a v1 default.
Wire up SALESFORCE_INSTANCE_URL/SALESFORCE_ACCESS_TOKEN in .env and implement
publish() against the ContentVersion API to enable.
"""
from app.config import SALESFORCE_ACCESS_TOKEN, SALESFORCE_INSTANCE_URL
from app.services.publishers.base import PublishResult


class SalesforcePublisher:
    name = "salesforce"

    def is_configured(self) -> bool:
        return bool(SALESFORCE_INSTANCE_URL and SALESFORCE_ACCESS_TOKEN)

    def publish(self, file_path: str, title: str) -> PublishResult:
        return PublishResult(
            success=False, remote_url=None,
            error="Salesforce is not configured. Set SALESFORCE_INSTANCE_URL/SALESFORCE_ACCESS_TOKEN in .env to enable.",
        )
