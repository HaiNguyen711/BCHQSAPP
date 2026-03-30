# Cloudflare named tunnel cho URL ổn định

Mục tiêu là thay `*.trycloudflare.com` bằng domain/subdomain ngắn hơn như `form.tenmiencuaban.com`.

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

4. Tạo file config dựa trên [cloudflared-config.example.yml](/E:/CodeX/BCHQSAPP/deploy/cloudflared-config.example.yml).
5. Trỏ hostname mong muốn, ví dụ `form.tenmiencuaban.com`, vào tunnel:

```powershell
cloudflared tunnel route dns bchqsapp form.tenmiencuaban.com
```

6. Chạy app:

```powershell
.\scripts\start_public.ps1 -PublicBaseUrl "https://form.tenmiencuaban.com" -AdminToken "doi-token-moi"
```

7. Chạy tunnel:

```powershell
cloudflared tunnel --config .\deploy\cloudflared-config.yml run
```

## Gợi ý đặt URL

- `form.tenmiencuaban.com`
- `khaibao.tenmiencuaban.com`
- `bchqs.tenmiencuaban.com`

`form.` là phương án ngắn, dễ hiểu và trực quan nhất cho người dân.
