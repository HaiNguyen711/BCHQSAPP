# Migrate sang máy mới

Mục tiêu của tài liệu này là chuyển host của app sang một máy Windows khác mà vẫn giữ nguyên domain và tunnel đang dùng.

## Những gì có trong Git

Các file sau đã có sẵn trong repo:

- `requirements.txt`
- `scripts/start_public.ps1`
- `scripts/start_tunnel.ps1`
- `deploy/runtime.env.example.ps1`
- `deploy/cloudflared-config.example.yml`

Các file này đủ để máy mới chạy lại app, nhưng chưa chứa secret hoặc credential thật.

## Những gì phải copy thủ công từ máy cũ

Từ máy đang chạy thật, copy các file sau:

1. `deploy/runtime.env.ps1`
2. `deploy/cloudflared-config.yml`
3. File credentials của tunnel trong `%USERPROFILE%\.cloudflared\`, ví dụ:
   `C:\Users\YOUR_USER\.cloudflared\ff3a75f0-2921-42ea-a6f1-2f6f367b58e6.json`

Không commit các file này vào Git.

## Chuẩn bị máy mới

1. Clone repo:

```powershell
git clone https://github.com/HaiNguyen711/BCHQSAPP.git
cd BCHQSAPP
```

2. Cài Python 3.
3. Cài dependency:

```powershell
python -m pip install -r requirements.txt
```

4. Cài `cloudflared`.
5. Tạo thư mục `%USERPROFILE%\.cloudflared\` nếu chưa có.
6. Copy file credentials tunnel vào đúng thư mục đó.
7. Copy `deploy/runtime.env.ps1` và `deploy/cloudflared-config.yml` từ máy cũ sang repo mới.

## Chạy trên máy mới

Chạy app:

```powershell
.\scripts\start_public.ps1
```

Chạy tunnel:

```powershell
.\scripts\start_tunnel.ps1
```

Kiểm tra local:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/healthz
```

Kiểm tra public:

```powershell
Invoke-WebRequest https://tranbien.danquantuve.com/healthz
```

## Chuyển quyền phục vụ từ máy cũ sang máy mới

Nếu chỉ muốn một máy phục vụ app tại một thời điểm:

1. Dừng `python` và `cloudflared` trên máy cũ.
2. Chạy app và tunnel trên máy mới.
3. Kiểm tra `https://tranbien.danquantuve.com/healthz`.

DNS không cần đổi lại nếu vẫn dùng cùng tunnel và cùng hostname.

## Gợi ý vận hành

- Giữ `deploy/runtime.env.ps1` và `deploy/cloudflared-config.yml` ngoài Git.
- Giữ một bản sao an toàn của file credentials tunnel.
- Nếu đổi user Windows, nhớ cập nhật lại đường dẫn `credentials-file` trong `deploy/cloudflared-config.yml`.
