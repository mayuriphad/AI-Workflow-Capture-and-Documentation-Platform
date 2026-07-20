from app.services.publishers.confluence import ConfluencePublisher
from app.services.publishers.local_library import LocalLibraryPublisher
from app.services.publishers.salesforce import SalesforcePublisher
from app.services.publishers.servicenow import ServiceNowPublisher
from app.services.publishers.sharepoint import SharePointPublisher

_PUBLISHERS = {
    "local_library": LocalLibraryPublisher(),
    "sharepoint": SharePointPublisher(),
    "confluence": ConfluencePublisher(),
    "servicenow": ServiceNowPublisher(),
    "salesforce": SalesforcePublisher(),
}


def get_publisher(provider: str):
    if provider not in _PUBLISHERS:
        raise KeyError(provider)
    return _PUBLISHERS[provider]


def list_targets() -> list[dict]:
    return [{"provider": name, "configured": p.is_configured()} for name, p in _PUBLISHERS.items()]
