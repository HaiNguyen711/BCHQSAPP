from __future__ import annotations

import hashlib
import hmac
import json
import mimetypes
import re
import unicodedata
from http import HTTPStatus
from http.cookies import SimpleCookie
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
from .database import (
    FORM_LABELS,
    export_csv,
    export_excel,
    export_profile_docx,
    get_submission,
    init_db,
    list_form_interest_logs,
    list_submissions_page,
    list_submissions,
    save_form_interest,
    save_submission,
    summarize_submissions,
)
from .schema import load_schema

SESSION_COOKIE_NAME = "bchqs_admin_session"
SUPPORTED_FORM_CODES = {"1", "2"}


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
        if path == "/api/admin/session":
            self._send_json({"authenticated": self._is_admin(parsed.query)})
            return
        if path == "/api/admin/submissions":
            if not self._is_admin(parsed.query):
                self._send_json({"error": "Unauthorized"}, status=HTTPStatus.UNAUTHORIZED)
                return
            query = parse_qs(parsed.query)
            page = self._parse_positive_int(query.get("page", ["1"])[0], default=1)
            page_size = self._parse_positive_int(query.get("page_size", ["10"])[0], default=10)
            search = query.get("q", [""])[0]
            self._send_json(list_submissions_page(page=page, page_size=page_size, search=search))
            return
        if path == "/api/admin/form-interest-logs":
            if not self._is_admin(parsed.query):
                self._send_json({"error": "Unauthorized"}, status=HTTPStatus.UNAUTHORIZED)
                return
            self._send_json({"items": list_form_interest_logs()})
            return
        if path == "/api/admin/summary":
            if not self._is_admin(parsed.query):
                self._send_json({"error": "Unauthorized"}, status=HTTPStatus.UNAUTHORIZED)
                return
            self._send_json(summarize_submissions())
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
        if path == "/api/admin/export.xlsx":
            if not self._is_admin(parsed.query):
                self.send_error(HTTPStatus.UNAUTHORIZED)
                return
            content = export_excel()
            self.send_response(HTTPStatus.OK)
            self.send_header(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
            self.send_header("Content-Disposition", 'attachment; filename="bchqs-submissions.xlsx"')
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        profile_match = re.fullmatch(r"/api/admin/submissions/(\d+)/profile\.docx", path)
        if profile_match:
            if not self._is_admin(parsed.query):
                self.send_error(HTTPStatus.UNAUTHORIZED)
                return
            submission_id = int(profile_match.group(1))
            content = export_profile_docx(submission_id)
            submission = get_submission(submission_id)
            if content is None or submission is None:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            safe_name = self._slugify_filename(submission.get("full_name") or f"ho-so-{submission_id}")
            filename = f"{safe_name}-ly-lich-nvqs.docx"
            self.send_response(HTTPStatus.OK)
            self.send_header(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        if path.startswith("/static/"):
            self._serve_static(path.removeprefix("/static/"))
            return
        if path.startswith("/photo/"):
            self._serve_file(PHOTO_DIR, path.removeprefix("/photo/"))
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        if self.path == "/api/submissions":
            self._handle_submission()
            return
        if self.path == "/api/form-interest":
            self._handle_form_interest()
            return
        if self.path == "/api/admin/login":
            self._handle_admin_login()
            return
        if self.path == "/api/admin/logout":
            self._handle_admin_logout()
            return
        self.send_error(HTTPStatus.NOT_FOUND)

    def _handle_submission(self) -> None:
        try:
            payload = self._read_json_body()
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        form_code = str(payload.get("form_code", "")).strip()
        form_payload = payload.get("payload")
        if form_code not in SUPPORTED_FORM_CODES:
            self._send_json({"error": "Loai phieu khong hop le."}, status=HTTPStatus.BAD_REQUEST)
            return
        if not isinstance(form_payload, dict):
            self._send_json({"error": "Du lieu phieu khong hop le."}, status=HTTPStatus.BAD_REQUEST)
            return

        errors = self._validate_submission(form_payload)
        if errors:
            self._send_json({"error": "Validation failed", "fields": errors}, status=HTTPStatus.BAD_REQUEST)
            return

        submission_id = save_submission(form_payload, form_code)
        self._send_json(
            {
                "message": "Đã tiếp nhận thông tin thành công.",
                "submission_id": submission_id,
                "form_code": form_code,
                "form_label": FORM_LABELS.get(form_code, form_code),
            },
            status=HTTPStatus.CREATED,
        )

    def _handle_form_interest(self) -> None:
        try:
            payload = self._read_json_body()
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        form_code = str(payload.get("form_code", "")).strip()
        if form_code not in FORM_LABELS or form_code in SUPPORTED_FORM_CODES:
            self._send_json({"error": "Loai phieu tracking khong hop le."}, status=HTTPStatus.BAD_REQUEST)
            return

        source = str(payload.get("source", "landing")).strip() or "landing"
        tracking_id = save_form_interest(
            form_code=form_code,
            source=source,
            client_ip=self._get_client_ip(),
            user_agent=self.headers.get("User-Agent", ""),
        )
        self._send_json(
            {
                "message": "Phiếu này đang được phát triển.",
                "tracking_id": tracking_id,
                "form_code": form_code,
                "form_label": FORM_LABELS.get(form_code, form_code),
            },
            status=HTTPStatus.CREATED,
        )

    def _handle_admin_login(self) -> None:
        try:
            payload = self._read_json_body()
        except ValueError as exc:
            self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return
        token = str(payload.get("token", "")).strip()
        if token != ADMIN_TOKEN:
            self._send_json({"error": "Sai admin token."}, status=HTTPStatus.UNAUTHORIZED)
            return

        session_value = self._build_admin_session_value(token)
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header(
            "Set-Cookie",
            f"{SESSION_COOKIE_NAME}={session_value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200",
        )
        content = json.dumps({"message": "Đăng nhập admin thành công."}, ensure_ascii=False).encode("utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _handle_admin_logout(self) -> None:
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header(
            "Set-Cookie",
            f"{SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        )
        content = json.dumps({"message": "Đã đăng xuất admin."}, ensure_ascii=False).encode("utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

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
                "FORM_OPTIONS_JSON": json.dumps(
                    [{"code": code, "label": label} for code, label in FORM_LABELS.items()],
                    ensure_ascii=False,
                ),
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
        if query_token == ADMIN_TOKEN or header_token == ADMIN_TOKEN:
            return True

        cookie_header = self.headers.get("Cookie", "")
        if not cookie_header:
            return False
        cookie = SimpleCookie()
        cookie.load(cookie_header)
        morsel = cookie.get(SESSION_COOKIE_NAME)
        if not morsel:
            return False
        expected = self._build_admin_session_value(ADMIN_TOKEN)
        return hmac.compare_digest(morsel.value, expected)

    def _build_admin_session_value(self, token: str) -> str:
        return hmac.new(token.encode("utf-8"), b"bchqs-admin-session", hashlib.sha256).hexdigest()

    def _get_public_base_url(self) -> str:
        if PUBLIC_BASE_URL:
            return PUBLIC_BASE_URL.rstrip("/")
        forwarded_proto = self.headers.get("X-Forwarded-Proto", "")
        forwarded_host = self.headers.get("X-Forwarded-Host", "")
        host = forwarded_host or self.headers.get("Host", f"localhost:{PORT}")
        proto = forwarded_proto or ("https" if self.server.server_port == 443 else "http")
        return f"{proto}://{host}".rstrip("/")

    def _get_client_ip(self) -> str:
        forwarded_for = self.headers.get("X-Forwarded-For", "")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return self.client_address[0]

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
        errors: dict[str, str] = {}
        schema = load_schema()
        for section in schema.get("sections", []):
            section_id = section.get("id", "")
            section_label = section.get("title", "Mục")
            section_payload = payload.get(section_id)

            if section.get("repeatable"):
                if not isinstance(section_payload, list):
                    section_payload = []
                min_items = int(section.get("min_items") or 0)
                if len(section_payload) < min_items:
                    errors[section_id] = f"{section_label} cần ít nhất {min_items} mục."
                    continue

                for item_index, item in enumerate(section_payload):
                    if not isinstance(item, dict):
                        errors[f"{section_id}.{item_index}"] = f"{section_label} #{item_index + 1} không hợp lệ."
                        continue
                    for field in section.get("fields", []):
                        field_id = field.get("id", "")
                        field_label = field.get("label", field_id)
                        field_value = item.get(field_id)
                        if field.get("required") and self._is_blank(field_value):
                            errors[f"{section_id}.{item_index}.{field_id}"] = f"{field_label} là bắt buộc."
                            continue
                        if field.get("type") == "date" and not self._is_blank(field_value) and not self._is_valid_date(field_value):
                            errors[f"{section_id}.{item_index}.{field_id}"] = f"{field_label} phải theo định dạng dd/mm/yyyy."
                continue

            if not isinstance(section_payload, dict):
                errors[section_id] = f"Thiếu nhóm {section_label.lower()}."
                continue

            for field in section.get("fields", []):
                field_id = field.get("id", "")
                field_label = field.get("label", field_id)
                field_value = section_payload.get(field_id)
                if field.get("required") and self._is_blank(field_value):
                    errors[f"{section_id}.{field_id}"] = f"{field_label} là bắt buộc."
                    continue
                if field.get("type") == "date" and not self._is_blank(field_value) and not self._is_valid_date(field_value):
                    errors[f"{section_id}.{field_id}"] = f"{field_label} phải theo định dạng dd/mm/yyyy."
        return errors

    def _is_blank(self, value: object) -> bool:
        if value is None:
            return True
        return not str(value).strip()

    def _is_valid_date(self, value: object) -> bool:
        match = re.fullmatch(r"(\d{2})/(\d{2})/(\d{4})", str(value).strip())
        if not match:
            return False
        day, month, year = (int(part) for part in match.groups())
        if month < 1 or month > 12 or day < 1:
            return False

        if month == 2:
            is_leap_year = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
            max_day = 29 if is_leap_year else 28
        elif month in {4, 6, 9, 11}:
            max_day = 30
        else:
            max_day = 31
        return day <= max_day

    def _parse_positive_int(self, raw_value: str, default: int = 1) -> int:
        try:
            value = int(str(raw_value).strip())
        except (TypeError, ValueError):
            return default
        return value if value > 0 else default

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

    def _slugify_filename(self, value: str) -> str:
        normalized = unicodedata.normalize("NFKD", value.strip().lower())
        ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
        slug = re.sub(r"[^a-z0-9\-]+", "-", ascii_value)
        slug = slug.strip("-")
        return slug or "ho-so"

    def log_message(self, format: str, *args) -> None:
        return


def run() -> None:
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    public_url = PUBLIC_BASE_URL or f"http://{HOST}:{PORT}"
    print(f"BCHQS app running at {public_url}")
    server.serve_forever()
