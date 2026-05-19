# Production 24wallet HTTPS Fix

Date: 2026-05-19

## Problem

- `http://24wallet.ru` served the Acorus wallet.
- `https://24wallet.ru` and `https://www.24wallet.ru` were handled by the CRM nginx SSL catch-all and redirected to `/login?next=%2F`.
- DNS for `24wallet.ru` and `www.24wallet.ru` pointed to `85.239.59.199`.

## Server Changes

- Host: `85.239.59.199`
- Touched nginx file: `/etc/nginx/sites-available/24wallet.ru.conf`
- Backup path: `/root/backups/acorus-wallet-nginx-https-fix_20260519_130515/`
- Certbot issued a Let's Encrypt certificate for:
  - `24wallet.ru`
  - `www.24wallet.ru`
- Certificate paths:
  - `/etc/letsencrypt/live/24wallet.ru/fullchain.pem`
  - `/etc/letsencrypt/live/24wallet.ru/privkey.pem`

## Verification

- `nginx -t` passed.
- `systemctl reload nginx` completed.
- `curl -I http://24wallet.ru` returned `200 OK`.
- `curl -I https://24wallet.ru` returned `200 OK`.
- `curl -I https://www.24wallet.ru` returned `200 OK`.
- CRM was not moved or edited; `https://bstcrm.ru/healthz` still reached the CRM service.

## Notes

- Existing unrelated nginx warnings remain for other enabled backup/conflicting server names.
- Production Docker was updated to `/opt/acorus-wallet-release-current` after the local commit was pushed.
- `https://24wallet.ru/extension-smoke` now returns `200 OK`.
