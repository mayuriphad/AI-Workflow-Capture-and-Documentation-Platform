"""
SQLite persistence for SOP Recorder.

Word (the live .docx each project opens) is the source of truth for
document *content*. This DB is a bookkeeping/index layer on top of it:
the pending-redaction-review queue, the filmstrip/step timeline, version
pointers, and publish history. Export and version-restore always read the
live .docx from disk -- nothing here is ever used to reconstruct it.
"""
import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    doc_type TEXT NOT NULL DEFAULT 'sop',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'archived')),
    word_file_path TEXT NOT NULL,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS recording_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    started_at REAL NOT NULL,
    ended_at REAL,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'stopped'))
);

CREATE TABLE IF NOT EXISTS steps (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES recording_sessions(id) ON DELETE SET NULL,
    position INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('screenshot_step', 'voice_note', 'manual_note')),
    instruction TEXT,
    screenshot_raw_path TEXT,
    screenshot_final_path TEXT,
    audio_path TEXT,
    sensitive_flag INTEGER NOT NULL DEFAULT 0,
    redaction_boxes TEXT,
    review_status TEXT NOT NULL DEFAULT 'auto_inserted'
        CHECK (review_status IN ('pending_review', 'approved', 'rejected', 'auto_inserted')),
    word_bookmark TEXT,
    created_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT 'auto',
    created_at REAL NOT NULL,
    UNIQUE(project_id, version_number)
);

CREATE TABLE IF NOT EXISTS publish_history (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    remote_url TEXT,
    error TEXT,
    created_at REAL NOT NULL
);
"""


def init_db() -> None:
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
        _migrate(conn)


def _migrate(conn: sqlite3.Connection) -> None:
    """Additive, idempotent column migrations for DBs created before a given
    column existed -- CREATE TABLE IF NOT EXISTS above is a no-op against an
    already-existing table, so new columns need an explicit ALTER here."""
    existing = {row["name"] for row in conn.execute("PRAGMA table_info(steps)")}
    if "audio_path" not in existing:
        conn.execute("ALTER TABLE steps ADD COLUMN audio_path TEXT")


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------- projects

def create_project(title: str, word_file_path: str, doc_type: str = "sop", project_id: str | None = None) -> str:
    project_id = project_id or str(uuid.uuid4())
    now = time.time()
    with connect() as conn:
        conn.execute(
            """INSERT INTO projects (id, title, doc_type, status, word_file_path, created_at, updated_at)
               VALUES (?, ?, ?, 'active', ?, ?, ?)""",
            (project_id, title, doc_type, word_file_path, now, now),
        )
    return project_id


def list_projects() -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT p.*, COUNT(s.id) as step_count, "
            "SUM(CASE WHEN s.review_status = 'pending_review' THEN 1 ELSE 0 END) as pending_count "
            "FROM projects p LEFT JOIN steps s ON s.project_id = p.id "
            "GROUP BY p.id ORDER BY p.created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def get_project(project_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
        if row is None:
            return None
        steps = conn.execute(
            "SELECT * FROM steps WHERE project_id = ? ORDER BY position ASC",
            (project_id,),
        ).fetchall()
    project = dict(row)
    project["steps"] = [_step_dict(s) for s in steps]
    return project


def update_project_status(project_id: str, status: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
            (status, time.time(), project_id),
        )


def delete_project(project_id: str) -> None:
    with connect() as conn:
        conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))


def touch_project(project_id: str) -> None:
    with connect() as conn:
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (time.time(), project_id))


# --------------------------------------------------------- recording_sessions

def start_session(project_id: str) -> str:
    session_id = str(uuid.uuid4())
    with connect() as conn:
        conn.execute(
            "INSERT INTO recording_sessions (id, project_id, started_at, status) VALUES (?, ?, ?, 'running')",
            (session_id, project_id, time.time()),
        )
    return session_id


def stop_session(session_id: str) -> None:
    with connect() as conn:
        conn.execute(
            "UPDATE recording_sessions SET status = 'stopped', ended_at = ? WHERE id = ?",
            (time.time(), session_id),
        )


def get_active_session(project_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM recording_sessions WHERE project_id = ? AND status = 'running' "
            "ORDER BY started_at DESC LIMIT 1",
            (project_id,),
        ).fetchone()
    return dict(row) if row else None


# ------------------------------------------------------------------- steps

def _step_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["redaction_boxes"] = json.loads(d["redaction_boxes"]) if d["redaction_boxes"] else []
    return d


def add_step(
    project_id: str,
    kind: str,
    session_id: str | None = None,
    instruction: str | None = None,
    screenshot_raw_path: str | None = None,
    screenshot_final_path: str | None = None,
    audio_path: str | None = None,
    sensitive_flag: bool = False,
    redaction_boxes: list[dict] | None = None,
    review_status: str = "auto_inserted",
    word_bookmark: str | None = None,
) -> str:
    step_id = str(uuid.uuid4())
    with connect() as conn:
        (max_pos,) = conn.execute(
            "SELECT COALESCE(MAX(position), -1) FROM steps WHERE project_id = ?",
            (project_id,),
        ).fetchone()
        conn.execute(
            """INSERT INTO steps (id, project_id, session_id, position, kind, instruction,
                                   screenshot_raw_path, screenshot_final_path, audio_path, sensitive_flag,
                                   redaction_boxes, review_status, word_bookmark, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                step_id, project_id, session_id, max_pos + 1, kind, instruction,
                screenshot_raw_path, screenshot_final_path, audio_path, int(sensitive_flag),
                json.dumps(redaction_boxes) if redaction_boxes else None,
                review_status, word_bookmark, time.time(),
            ),
        )
    return step_id


def get_step(step_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM steps WHERE id = ?", (step_id,)).fetchone()
    return _step_dict(row) if row else None


def list_pending_steps(project_id: str | None = None) -> list[dict]:
    with connect() as conn:
        if project_id:
            rows = conn.execute(
                "SELECT * FROM steps WHERE review_status = 'pending_review' AND project_id = ? "
                "ORDER BY created_at ASC",
                (project_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM steps WHERE review_status = 'pending_review' ORDER BY created_at ASC"
            ).fetchall()
    return [_step_dict(r) for r in rows]


def resolve_step(
    step_id: str,
    review_status: str,
    screenshot_final_path: str | None = None,
    instruction: str | None = None,
    word_bookmark: str | None = None,
) -> None:
    fields, values = ["review_status = ?"], [review_status]
    if screenshot_final_path is not None:
        fields.append("screenshot_final_path = ?")
        values.append(screenshot_final_path)
    if instruction is not None:
        fields.append("instruction = ?")
        values.append(instruction)
    if word_bookmark is not None:
        fields.append("word_bookmark = ?")
        values.append(word_bookmark)
    values.append(step_id)
    with connect() as conn:
        conn.execute(f"UPDATE steps SET {', '.join(fields)} WHERE id = ?", values)


def list_audio_paths(project_id: str) -> list[str]:
    """Distinct persisted voice-note audio files for a project, in capture
    order -- used to bundle a project's "export voice to audio" download.
    A single recording can back multiple key-point steps, so this dedupes."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT DISTINCT audio_path FROM steps WHERE project_id = ? AND audio_path IS NOT NULL "
            "ORDER BY position ASC",
            (project_id,),
        ).fetchall()
    return [r["audio_path"] for r in rows]


def get_last_inserted_step(project_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM steps WHERE project_id = ? AND word_bookmark IS NOT NULL "
            "ORDER BY position DESC LIMIT 1",
            (project_id,),
        ).fetchone()
    return _step_dict(row) if row else None


def update_step_bookmark(step_id: str, word_bookmark: str) -> None:
    with connect() as conn:
        conn.execute("UPDATE steps SET word_bookmark = ? WHERE id = ?", (word_bookmark, step_id))


def count_inserted_steps(project_id: str) -> int:
    """Steps actually present in the Word doc (auto-inserted or
    approved-after-review) -- used to number the next 'Step N' heading."""
    with connect() as conn:
        (n,) = conn.execute(
            "SELECT COUNT(*) FROM steps WHERE project_id = ? AND kind = 'screenshot_step' "
            "AND review_status IN ('auto_inserted', 'approved')",
            (project_id,),
        ).fetchone()
    return n


# ---------------------------------------------------------------- versions

def add_version(project_id: str, file_path: str, label: str = "auto") -> dict:
    version_id = str(uuid.uuid4())
    with connect() as conn:
        (max_n,) = conn.execute(
            "SELECT COALESCE(MAX(version_number), 0) FROM versions WHERE project_id = ?",
            (project_id,),
        ).fetchone()
        version_number = max_n + 1
        conn.execute(
            """INSERT INTO versions (id, project_id, version_number, file_path, label, created_at)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (version_id, project_id, version_number, file_path, label, time.time()),
        )
    return {
        "id": version_id, "project_id": project_id, "version_number": version_number,
        "file_path": file_path, "label": label,
    }


def list_versions(project_id: str) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM versions WHERE project_id = ? ORDER BY version_number DESC",
            (project_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def get_version(version_id: str) -> dict | None:
    with connect() as conn:
        row = conn.execute("SELECT * FROM versions WHERE id = ?", (version_id,)).fetchone()
    return dict(row) if row else None


# ---------------------------------------------------------- publish_history

def add_publish_record(project_id: str, provider: str, status: str,
                        remote_url: str | None = None, error: str | None = None) -> str:
    record_id = str(uuid.uuid4())
    with connect() as conn:
        conn.execute(
            """INSERT INTO publish_history (id, project_id, provider, status, remote_url, error, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (record_id, project_id, provider, status, remote_url, error, time.time()),
        )
    return record_id


def list_publish_history(project_id: str) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM publish_history WHERE project_id = ? ORDER BY created_at DESC",
            (project_id,),
        ).fetchall()
    return [dict(r) for r in rows]


def analytics_summary() -> dict:
    """Real, derivable-from-data metrics only -- no fabricated engagement
    numbers. Used by the Analytics page."""
    with connect() as conn:
        (total_projects,) = conn.execute("SELECT COUNT(*) FROM projects").fetchone()
        status_rows = conn.execute("SELECT status, COUNT(*) AS n FROM projects GROUP BY status").fetchall()
        (total_steps,) = conn.execute(
            "SELECT COUNT(*) FROM steps WHERE kind = 'screenshot_step' AND review_status IN ('auto_inserted', 'approved')"
        ).fetchone()
        (total_voice_notes,) = conn.execute("SELECT COUNT(*) FROM steps WHERE kind = 'voice_note'").fetchone()
        (total_manual_notes,) = conn.execute("SELECT COUNT(*) FROM steps WHERE kind = 'manual_note'").fetchone()
        (sensitive_flagged,) = conn.execute("SELECT COUNT(*) FROM steps WHERE sensitive_flag = 1").fetchone()
        (pending_review,) = conn.execute("SELECT COUNT(*) FROM steps WHERE review_status = 'pending_review'").fetchone()
        (rejected,) = conn.execute("SELECT COUNT(*) FROM steps WHERE review_status = 'rejected'").fetchone()
        (total_versions,) = conn.execute("SELECT COUNT(*) FROM versions").fetchone()
        publish_rows = conn.execute(
            "SELECT provider, COUNT(*) AS n FROM publish_history WHERE status = 'success' GROUP BY provider"
        ).fetchall()
        recent = conn.execute(
            """SELECT s.id, s.kind, s.instruction, s.created_at, s.review_status,
                      p.title AS project_title, p.id AS project_id
               FROM steps s JOIN projects p ON p.id = s.project_id
               WHERE s.review_status != 'rejected'
               ORDER BY s.created_at DESC LIMIT 20"""
        ).fetchall()

    return {
        "total_projects": total_projects,
        "projects_by_status": {r["status"]: r["n"] for r in status_rows},
        "total_steps": total_steps,
        "total_voice_notes": total_voice_notes,
        "total_manual_notes": total_manual_notes,
        "sensitive_frames_flagged": sensitive_flagged,
        "steps_pending_review": pending_review,
        "steps_rejected": rejected,
        "total_versions": total_versions,
        "publishes_by_provider": {r["provider"]: r["n"] for r in publish_rows},
        "recent_activity": [dict(r) for r in recent],
    }


def list_published_projects() -> list[dict]:
    """Projects with a successful local_library publish, most recent first."""
    with connect() as conn:
        rows = conn.execute(
            """SELECT p.*, ph.remote_url, ph.created_at AS published_at
               FROM projects p
               JOIN publish_history ph ON ph.project_id = p.id
               WHERE ph.provider = 'local_library' AND ph.status = 'success'
                 AND ph.id = (
                     SELECT id FROM publish_history ph2
                     WHERE ph2.project_id = p.id AND ph2.provider = 'local_library' AND ph2.status = 'success'
                     ORDER BY created_at DESC LIMIT 1
                 )
               ORDER BY ph.created_at DESC"""
        ).fetchall()
    return [dict(r) for r in rows]
