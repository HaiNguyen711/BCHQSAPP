from __future__ import annotations

import csv
import io
import json
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Font

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


def summarize_submissions(items: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    rows = items if items is not None else list_submissions()
    now_date = datetime.now(timezone.utc).date()
    today_count = 0
    province_counter: Counter[str] = Counter()
    ward_counter: Counter[str] = Counter()
    occupation_counter: Counter[str] = Counter()
    training_counter: Counter[str] = Counter()

    for item in rows:
        payload = item.get("payload", {})
        personal = payload.get("personal_basic", {})
        created_at_raw = item.get("created_at")
        try:
            created_at = datetime.fromisoformat(created_at_raw)
        except Exception:
            created_at = None
        if created_at and created_at.date() == now_date:
            today_count += 1

        _add_counter_value(province_counter, personal.get("province"))
        _add_counter_value(ward_counter, personal.get("ward"))
        _add_counter_value(occupation_counter, personal.get("occupation"))
        _add_counter_value(training_counter, personal.get("training_level"))

    return {
        "total_submissions": len(rows),
        "today_submissions": today_count,
        "unique_citizen_ids": len({row.get("citizen_id_number", "").strip() for row in rows if row.get("citizen_id_number")}),
        "top_provinces": _top_counter_items(province_counter),
        "top_wards": _top_counter_items(ward_counter),
        "top_occupations": _top_counter_items(occupation_counter),
        "top_training_levels": _top_counter_items(training_counter),
    }


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


def export_excel() -> bytes:
    rows = list_submissions()
    summary = summarize_submissions(rows)

    workbook = Workbook()
    summary_sheet = workbook.active
    summary_sheet.title = "Dashboard"
    summary_sheet.append(["Chi so", "Gia tri"])
    summary_sheet.append(["Tong so phieu", summary["total_submissions"]])
    summary_sheet.append(["So phieu hom nay", summary["today_submissions"]])
    summary_sheet.append(["So CCCD duy nhat", summary["unique_citizen_ids"]])
    summary_sheet.append([])
    summary_sheet.append(["Top tinh/thanh", "So luong"])
    for item in summary["top_provinces"]:
        summary_sheet.append([item["label"], item["count"]])
    summary_sheet.append([])
    summary_sheet.append(["Top phuong", "So luong"])
    for item in summary["top_wards"]:
        summary_sheet.append([item["label"], item["count"]])

    data_sheet = workbook.create_sheet("Du lieu")
    headers = [
        "ID",
        "Ho ten",
        "CCCD",
        "So dien thoai",
        "Que quan",
        "Noi o hien tai",
        "Tinh/Thanh",
        "Phuong",
        "Nghe nghiep",
        "Trinh do dao tao",
        "Thoi gian tao",
        "Du lieu JSON",
    ]
    data_sheet.append(headers)
    for row in rows:
        personal = row["payload"].get("personal_basic", {})
        data_sheet.append(
            [
                row["id"],
                row["full_name"],
                row["citizen_id_number"],
                row["phone"],
                row["hometown"],
                row["current_residence"],
                personal.get("province", ""),
                personal.get("ward", ""),
                personal.get("occupation", ""),
                personal.get("training_level", ""),
                row["created_at"],
                json.dumps(row["payload"], ensure_ascii=False),
            ]
        )

    for sheet in workbook.worksheets:
        for cell in sheet[1]:
            cell.font = Font(bold=True)
        for column_cells in sheet.columns:
            max_length = 0
            column_letter = column_cells[0].column_letter
            for cell in column_cells:
                value = "" if cell.value is None else str(cell.value)
                max_length = max(max_length, len(value))
            sheet.column_dimensions[column_letter].width = min(max_length + 2, 42)

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _top_counter_items(counter: Counter[str], limit: int = 5) -> list[dict[str, Any]]:
    return [{"label": label, "count": count} for label, count in counter.most_common(limit)]


def _add_counter_value(counter: Counter[str], raw_value: Any) -> None:
    value = str(raw_value or "").strip()
    if value:
        counter[value] += 1
