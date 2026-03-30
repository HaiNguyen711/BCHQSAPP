# BCHQS Citizen Intake Web App

Web app thu thập thông tin công dân cho BCHQS, lấy cấu trúc trường từ các biểu mẫu PDF bạn cung cấp và tổ chức lại thành biểu mẫu trực tuyến nhiều bước.

## Tính năng

- Biểu mẫu công dân chạy trên web, có thể public lên Internet.
- Chia thành nhiều nhóm: thông tin cá nhân, lý lịch bản thân, gia đình, anh chị em, lý lịch cha, lý lịch mẹ.
- Lưu dữ liệu vào SQLite tại `data/bchqs.db`.
- Có trang quản trị để xem dữ liệu và xuất CSV.
- Tách schema biểu mẫu ra file `config/form_schema.json` để chỉnh field nhanh mà không phải sửa code backend.
- Không phụ thuộc framework bên ngoài khi chạy app.

## Chạy local

```powershell
$env:BCHQS_ADMIN_TOKEN="doi-token-quan-tri"
& "C:\Users\CPU12709-local\AppData\Local\Programs\Python\Python310\python.exe" main.py
```

Sau đó mở:

- Form công dân: `http://localhost:8000/`
- Admin: `http://localhost:8000/admin`

## Biến môi trường

- `BCHQS_HOST`: mặc định `0.0.0.0`
- `BCHQS_PORT`: mặc định `8000`
- `BCHQS_PUBLIC_BASE_URL`: URL public của website
- `BCHQS_ADMIN_TOKEN`: token để vào trang admin/API admin
- `BCHQS_ORG_NAME`
- `BCHQS_ORG_ADDRESS`
- `BCHQS_ORG_PHONE`
- `BCHQS_ORG_EMAIL`
- `BCHQS_ORG_FACEBOOK`

## Public lên Internet

Bạn có thể deploy theo 1 trong 2 hướng:

1. VPS Windows hoặc Linux có Python 3.10+, chạy app sau reverse proxy Nginx/Caddy.
2. Máy chủ nội bộ có IP public, mở port và cấu hình domain trỏ vào dịch vụ.

Luồng khuyến nghị:

1. Tạo domain hoặc subdomain.
2. Đặt `BCHQS_PUBLIC_BASE_URL` thành URL public thật.
3. Đặt `BCHQS_ADMIN_TOKEN` đủ mạnh.
4. Chạy app như service.
5. Đặt reverse proxy để có HTTPS.
6. Backup file `data/bchqs.db` định kỳ.

## Ghi chú về biểu mẫu PDF

Mình đã trích được các nhóm field chính từ các file PDF:

- Thông tin cá nhân cơ bản
- Lý lịch bản thân theo giai đoạn
- Thông tin cha mẹ
- Danh sách anh/chị/em
- Lý lịch cha
- Lý lịch mẹ

Nếu bạn muốn bám 100% từng nhãn và thứ tự field của mẫu giấy, chỉ cần cập nhật `config/form_schema.json` rồi reload app.
