from __future__ import annotations

import csv
import io
import json
import sqlite3
from datetime import datetime, timezone
from typing import Any

from .config import DATA_DIR, DB_PATH


def get_connection() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS submissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                citizen_id_number TEXT NOT NULL,
                phone TEXT,
                hometown TEXT,
                current_residence TEXT,
                created_at TEXT NOT NULL,
                payload_json TEXT NOT NULL
            )
            """
        )
        conn.commit()


def save_submission(payload: dict[str, Any]) -> int:
    personal = payload.get("personal_basic", {})
    created_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO submissions (
                full_name,
                citizen_id_number,
                phone,
                hometown,
                current_residence,
                created_at,
                payload_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                personal.get("full_name", "").strip(),
                personal.get("citizen_id_number", "").strip(),
                personal.get("phone", "").strip(),
                personal.get("hometown", "").strip(),
                personal.get("current_residence", "").strip(),
                created_at,
                json.dumps(payload, ensure_ascii=False),
            ),
        )
        conn.commit()
        return int(cursor.lastrowid)


def list_submissions() -> list[dict[str, Any]]:
    with get_connection() as conn:
        rows = conn.execute(
            """
            SELECT id, full_name, citizen_id_number, phone, hometown,
                   current_residence, created_at, payload_json
            FROM submissions
            ORDER BY id DESC
            """
        ).fetchall()
    items = []
    for row in rows:
        item = dict(row)
        item["payload"] = json.loads(item.pop("payload_json"))
        items.append(item)
    return items


def export_csv() -> str:
    rows = list_submissions()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "ID",
            "Ho ten",
            "CCCD",
            "So dien thoai",
            "Que quan",
            "Noi o hien tai",
            "Thoi gian tao",
            "Du lieu JSON",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row["id"],
                row["full_name"],
                row["citizen_id_number"],
                row["phone"],
                row["hometown"],
                row["current_residence"],
                row["created_at"],
                json.dumps(row["payload"], ensure_ascii=False),
            ]
        )
    return buffer.getvalue()
