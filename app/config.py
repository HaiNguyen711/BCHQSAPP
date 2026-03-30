from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"
PHOTO_DIR = BASE_DIR / "photo"
TEMPLATE_DIR = BASE_DIR / "templates"
CONFIG_DIR = BASE_DIR / "config"
SCHEMA_PATH = CONFIG_DIR / "form_schema.json"
DB_PATH = DATA_DIR / "bchqs.db"

HOST = os.getenv("BCHQS_HOST", "0.0.0.0")
PORT = int(os.getenv("BCHQS_PORT", "8000"))
PUBLIC_BASE_URL = os.getenv("BCHQS_PUBLIC_BASE_URL", "").strip()
ADMIN_TOKEN = os.getenv("BCHQS_ADMIN_TOKEN", "changeme-admin-token")
ORG_NAME = os.getenv("BCHQS_ORG_NAME", "Ban Chỉ Huy Quân Sự Phường Trấn Biên")
ORG_ADDRESS = os.getenv(
    "BCHQS_ORG_ADDRESS",
    "86 Đ. Nguyễn Văn Hoa, khu phố Gò Me, Trấn Biên, Đồng Nai 76108, Việt Nam",
)
ORG_PHONE = os.getenv("BCHQS_ORG_PHONE", "0973465699")
ORG_EMAIL = os.getenv("BCHQS_ORG_EMAIL", "banchihuyquansuphuongtranbien@gmail.com")
ORG_FACEBOOK = os.getenv("BCHQS_ORG_FACEBOOK", "BAN CHỈ HUY QUÂN SỰ PHƯỜNG TRẤN BIÊN")
