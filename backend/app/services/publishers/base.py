from typing import Protocol, TypedDict


class PublishResult(TypedDict):
    success: bool
    remote_url: str | None
    error: str | None


class Publisher(Protocol):
    name: str

    def is_configured(self) -> bool: ...

    def publish(self, file_path: str, title: str) -> PublishResult: ...
