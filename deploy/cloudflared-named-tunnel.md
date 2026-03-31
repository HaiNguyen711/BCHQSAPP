# Cloudflare named tunnel cho URL ổn định

Mục tiêu là thay `*.trycloudflare.com` bằng domain/subdomain ngắn hơn như `khaibao.tenmiencuaban.com`.

## Kết quả mong muốn

- URL cố định, dễ nhớ
- Có HTTPS
- Không phụ thuộc quick tunnel
- Có thể chạy tự động như service

## Các bước triển khai

1. Đưa domain hoặc subdomain của bạn vào Cloudflare DNS.
2. Đăng nhập `cloudflared` bằng tài khoản Cloudflare.
3. Tạo named tunnel:

```powershell
cloudflared tunnel login
cloudflared tunnel create bchqsapp
```

4. Tạo file config dựa trên `deploy/cloudflared-config.example.yml`.
5. Trỏ hostname mong muốn, ví dụ `khaibao.tenmiencuaban.com`, vào tunnel:

```powershell
cloudflared tunnel route dns bchqsapp khaibao.tenmiencuaban.com
```

6. Chạy app:

```powershell
.\scripts\start_public.ps1 -PublicBaseUrl "https://khaibao.tenmiencuaban.com" -AdminToken "doi-token-moi"
```

7. Chạy tunnel:

```powershell
cloudflared tunnel --config .\deploy\cloudflared-config.yml run
```

## Chạy lại trên máy khác

Để dùng cùng domain trên một máy khác trong tương lai:

1. Clone lại repo.
2. Cài Python và `cloudflared`.
3. Đăng nhập `cloudflared tunnel login` trên máy mới.
4. Copy hoặc tạo lại file `deploy/cloudflared-config.yml` với cùng tunnel ID và hostname.
5. Đảm bảo file credentials JSON của tunnel tồn tại trong thư mục `%USERPROFILE%\.cloudflared\`.
6. Chạy lại app và tunnel như các bước ở trên.

DNS hostname vẫn có thể trỏ vào cùng tunnel. Máy nào đang chạy `cloudflared` với credentials hợp lệ sẽ phục vụ lưu lượng.

## Gợi ý đặt URL

- `khaibao.tenmiencuaban.com`
- `form.tenmiencuaban.com`
- `bchqs.tenmiencuaban.com`

`khaibao.` là phương án rõ nghĩa và phù hợp nhất cho biểu mẫu khai báo công dân.
