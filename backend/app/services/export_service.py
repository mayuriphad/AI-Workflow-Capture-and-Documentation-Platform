"""
Exports a project's live Word document to DOCX/PDF/HTML/Markdown. The
.docx *is* the document now (Word is the source of truth) -- DOCX export
is a straight file copy, PDF/HTML go through Word's own native exporter
(services.word_automation.save_copy_as), and Markdown walks the .docx with
python-docx since there's no clean native Word->Markdown path.
"""
import shutil
from pathlib import Path

from docx import Document as DocxDocument
from docx.oxml.ns import qn

from app.config import EXPORTS_DIR
from app.services.word_automation import word


async def export_docx(project: dict) -> Path:
    out = EXPORTS_DIR / f"{project['id']}.docx"
    if word.current_project_id == project["id"]:
        await word.save()
    shutil.copy2(project["word_file_path"], out)
    return out


async def export_pdf(project: dict) -> Path:
    out = EXPORTS_DIR / f"{project['id']}.pdf"
    await word.save_copy_as("pdf", str(out), source_file_path=project["word_file_path"])
    return out


async def export_html(project: dict) -> Path:
    out = EXPORTS_DIR / f"{project['id']}.html"
    await word.save_copy_as("html", str(out), source_file_path=project["word_file_path"])
    return out


def _iter_body_items(doc: DocxDocument):
    """Yield ('heading'|'text', str) or ('image', bytes) in document order."""
    for para in doc.paragraphs:
        for drawing in para._element.findall(".//" + qn("w:drawing")):
            blip = drawing.find(".//" + qn("a:blip"))
            if blip is None:
                continue
            r_id = blip.get(qn("r:embed"))
            if r_id and r_id in doc.part.rels:
                yield "image", doc.part.rels[r_id].target_part.blob

        text = para.text.strip()
        if text:
            style_name = (para.style.name or "").lower()
            yield ("heading" if style_name.startswith("heading") else "text"), text


async def export_markdown(project: dict) -> Path:
    if word.current_project_id == project["id"]:
        await word.save()

    doc = DocxDocument(project["word_file_path"])
    images_dir = EXPORTS_DIR / f"{project['id']}_images"
    images_dir.mkdir(parents=True, exist_ok=True)

    lines = [f"# {project['title']}", ""]
    image_count = 0
    for kind, payload in _iter_body_items(doc):
        if kind == "heading":
            lines.append(f"## {payload}")
        elif kind == "text":
            lines.append(payload)
        elif kind == "image":
            image_count += 1
            image_path = images_dir / f"{image_count}.png"
            image_path.write_bytes(payload)
            lines.append(f"![Step screenshot]({image_path.relative_to(EXPORTS_DIR).as_posix()})")
        lines.append("")

    out = EXPORTS_DIR / f"{project['id']}.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    return out


EXPORTERS = {
    "docx": export_docx,
    "pdf": export_pdf,
    "html": export_html,
    "md": export_markdown,
}
