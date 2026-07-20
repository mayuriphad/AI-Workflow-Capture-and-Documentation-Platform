from pydantic import BaseModel


class ProjectCreate(BaseModel):
    title: str
    doc_type: str = "sop"


class RedactionBox(BaseModel):
    left: int
    top: int
    width: int
    height: int
    label: str | None = None


class ResolveStepRequest(BaseModel):
    boxes: list[RedactionBox] = []
    mode: str = "blackbox"  # "blackbox" | "blur" | "annotate"


class ImageEditRequest(BaseModel):
    boxes: list[RedactionBox] = []
    mode: str = "blackbox"  # "blackbox" | "blur" | "annotate"


class AddImageStepRequest(BaseModel):
    instruction: str
    after_step_id: str | None = None


class StepTextUpdate(BaseModel):
    instruction: str


class ManualNoteRequest(BaseModel):
    text: str
    target_step_id: str | None = None


class SnapshotRequest(BaseModel):
    label: str = "manual"
