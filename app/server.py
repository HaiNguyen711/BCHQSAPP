from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from .config import (
    ADMIN_TOKEN,
    HOST,
    ORG_ADDRESS,
    ORG_EMAIL,
    ORG_FACEBOOK,
    ORG_NAME,
    ORG_PHONE,
    PORT,
    PUBLIC_BASE_URL,
    PHOTO_DIR,
    STATIC_DIR,
    TEMPLATE_DIR,
)
from .database import export_csv, init_db, list_submissions, save_submission
from .schema import load_schema


def render_template(name: str, context: dict[str, str]) -> bytes:
    template = (TEMPLATE_DIR / name).read_text(encoding="utf-8")
    for key, value in context.items():
        template = template.replace(f"{{{{ {key} }}}}", value)
    return template.encode("utf-8")


class AppHandler(BaseHTTPRequestHandler):
    server_version = "BCHQSApp/1.0"

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        if path == "/":
            self._serve_index()
            return
        if path == "/admin":
            self._serve_admin()
            return
        if path == "/api/form-schema":
            self._send_json(load_schema())
            return
        if path == "/healthz":
            self._send_json({"status": "ok"})
            return
        if path == "/api/admin/submissions":
            if not self._is_admin(parsed.query):
                self._send_json({"error": "Unauthorized"}, status=HTTPStatus.UNAUTHORIZED)
                return
            self._send_json({"items": list_submissions()})
            return
        if path == "/api/admin/export.csv":
            if not self._is_admin(parsed.query):
                self.send_error(HTTPStatus.UNAUTHORIZED)
                return
            csv_text = export_csv().encode("utf-8-sig")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="bchqs-submissions.csv"')
            self.send_header("Content-Length", str(len(csv_text)))
            self.end_headers()
            self.wfile.write(csv_text)
            return
        if path.startswith("/static/"):
            self._serve_static(path.removeprefix("/static/"))
            return
        if path.startswith("/photo/"):
            self._serve_file(PHOTO_DIR, path.removeprefix("/photo/"))
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        if self.path != "/api/submissions":
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        try:
            payload = self._read_json_body()
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        errors = self._validate_submission(payload)
        if errors:
            self._send_json({"error": "Validation failed", "fields": errors}, status=HTTPStatus.BAD_REQUEST)
            return

        submission_id = save_submission(payload)
        self._send_json(
            {
                "message": "Đã tiếp nhận thông tin thành công.",
                "submission_id": submission_id,
            },
            status=HTTPStatus.CREATED,
        )

    def _serve_index(self) -> None:
        public_base_url = self._get_public_base_url()
        body = render_template(
            "index.html",
            {
                "ORG_NAME": ORG_NAME,
                "ORG_ADDRESS": ORG_ADDRESS,
                "ORG_PHONE": ORG_PHONE,
                "ORG_EMAIL": ORG_EMAIL,
                "ORG_FACEBOOK": ORG_FACEBOOK,
                "PUBLIC_BASE_URL": public_base_url,
            },
        )
        self._send_html(body)

    def _serve_admin(self) -> None:
        body = render_template("admin.html", {"ORG_NAME": ORG_NAME})
        self._send_html(body)

    def _serve_static(self, relative_path: str) -> None:
        self._serve_file(STATIC_DIR, relative_path)

    def _serve_file(self, base_dir, relative_path: str) -> None:
        file_path = (base_dir / relative_path).resolve()
        if not str(file_path).startswith(str(base_dir.resolve())) or not file_path.exists():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content = file_path.read_bytes()
        mime_type, _ = mimetypes.guess_type(str(file_path))
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", mime_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _is_admin(self, query: str) -> bool:
        params = parse_qs(query)
        query_token = params.get("token", [""])[0]
        header_token = self.headers.get("X-Admin-Token", "")
        return query_token == ADMIN_TOKEN or header_token == ADMIN_TOKEN

    def _get_public_base_url(self) -> str:
        if PUBLIC_BASE_URL:
            return PUBLIC_BASE_URL.rstrip("/")
        forwarded_proto = self.headers.get("X-Forwarded-Proto", "")
        forwarded_host = self.headers.get("X-Forwarded-Host", "")
        host = forwarded_host or self.headers.get("Host", f"localhost:{PORT}")
        proto = forwarded_proto or ("https" if self.server.server_port == 443 else "http")
        return f"{proto}://{host}".rstrip("/")

    def _read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)
        try:
            body = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise ValueError("JSON không hợp lệ.") from exc
        if not isinstance(body, dict):
            raise ValueError("Payload phải là object JSON.")
        return body

    def _validate_submission(self, payload: dict) -> dict[str, str]:
        personal = payload.get("personal_basic")
        family = payload.get("family_basic")
        if not isinstance(personal, dict):
            return {"personal_basic": "Thiếu nhóm thông tin cá nhân."}
        if not isinstance(family, dict):
            return {"family_basic": "Thiếu nhóm thông tin gia đình."}

        errors: dict[str, str] = {}
        required_personal = {
            "full_name": "Họ và tên công dân là bắt buộc.",
            "date_of_birth": "Ngày sinh là bắt buộc.",
            "citizen_id_number": "Số CCCD là bắt buộc.",
            "phone": "Số điện thoại là bắt buộc.",
            "street_address": "Địa chỉ số nhà là bắt buộc.",
            "ward": "Phường là bắt buộc.",
            "province": "Tỉnh là bắt buộc.",
            "current_residence": "Nơi ở hiện tại là bắt buộc.",
            "hometown": "Quê quán là bắt buộc.",
        }
        for key, message in required_personal.items():
            if not str(personal.get(key, "")).strip():
                errors[f"personal_basic.{key}"] = message

        required_family = {
            "father_name": "Họ tên cha là bắt buộc.",
            "father_date_of_birth": "Ngày sinh cha là bắt buộc.",
            "mother_name": "Họ tên mẹ là bắt buộc.",
            "mother_date_of_birth": "Ngày sinh mẹ là bắt buộc.",
        }
        for key, message in required_family.items():
            if not str(family.get(key, "")).strip():
                errors[f"family_basic.{key}"] = message
        return errors

    def _send_html(self, content: bytes, status: HTTPStatus = HTTPStatus.OK) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _send_json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format: str, *args) -> None:
        return


def run() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    public_url = PUBLIC_BASE_URL or f"http://{HOST}:{PORT}"
    print(f"BCHQS app running at {public_url}")
    server.serve_forever()
