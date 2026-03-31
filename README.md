# BCHQS Citizen Intake Web App

Web app thu thập thông tin công dân cho BCHQS, lấy cấu trúc trường từ các biểu mẫu PDF bạn cung cấp và tổ chức lại thành biểu mẫu trực tuyến nhiều bước.

## Tính năng

- Biểu mẫu công dân chạy trên web, có thể public lên Internet.
- Giao diện tông đỏ, tích hợp biểu trưng và cờ Dân quân tự vệ.
- Chia thành nhiều nhóm: thông tin cá nhân, lý lịch bản thân, gia đình, anh chị em, lý lịch cha, lý lịch mẹ.
- Lưu dữ liệu vào SQLite tại `data/bchqs.db`.
- Có trang quản trị để xem dữ liệu và xuất CSV.
- Tách schema biểu mẫu ra file `config/form_schema.json` để chỉnh field nhanh mà không phải sửa code backend.
- App tự suy ra URL public từ request/proxy nếu không cấu hình `BCHQS_PUBLIC_BASE_URL`.

## Chạy local

```powershell
python -m pip install -r requirements.txt
```

Sau đó:

```powershell
.\scripts\start_local.ps1
```

Sau đó mở:

- Form công dân: `http://localhost:8000/`
- Admin: `http://localhost:8000/admin`

## Biến môi trường

- `BCHQS_HOST`: mặc định `0.0.0.0`
- `BCHQS_PORT`: mặc định `8000`
- `BCHQS_PUBLIC_BASE_URL`: URL public cố định của website. Có thể để trống để app tự suy ra từ request.
- `BCHQS_ADMIN_TOKEN`: token để vào trang admin/API admin
- `BCHQS_ORG_NAME`
- `BCHQS_ORG_ADDRESS`
- `BCHQS_ORG_PHONE`
- `BCHQS_ORG_EMAIL`
- `BCHQS_ORG_FACEBOOK`

## Ổn định URL public

Quick tunnel như `trycloudflare.com` chỉ phù hợp để thử nhanh. Để có link ngắn, dễ nhớ và ổn định hơn, hãy dùng:

1. Domain hoặc subdomain riêng, ví dụ `khaibao.tenmiencuaban.com`
2. Cloudflare named tunnel hoặc một reverse proxy ổn định trên VPS

Tài liệu mẫu cho Cloudflare named tunnel nằm ở:

- `deploy/cloudflared-named-tunnel.md`
- `deploy/cloudflared-config.example.yml`

## Ghi chú

- Health check: `GET /healthz`
- Nếu muốn chỉnh field theo đúng mẫu giấy hơn nữa, cập nhật `config/form_schema.json` rồi reload app.
