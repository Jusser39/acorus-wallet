# Production HTTPS Enforcement Report

## Goal

Remove the visible insecure HTTP path for `24wallet.ru` while keeping the wallet on the canonical host and avoiding changes to the CRM vhost.

## Server Changes

- Touched nginx file: `/etc/nginx/sites-available/24wallet.ru.conf`
- Backup path: `/root/backups/acorus-wallet-nginx-https-enforcement_20260519_151649/`
- Split the previous mixed HTTP/HTTPS server block into:
  - port `80` redirect block for `24wallet.ru` and `www.24wallet.ru`
  - canonical `https://24wallet.ru` wallet proxy block
  - `https://www.24wallet.ru` redirect block
- Redirects use `308` to `https://24wallet.ru$request_uri`.
- Added HSTS without preload:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Kept the wallet upstream on `http://127.0.0.1:8080`.
- Did not edit `bstcrm.ru.conf`.

## Verification

- `nginx -t`: passed.
- `systemctl reload nginx`: completed.
- `curl -I http://24wallet.ru`: `308 Permanent Redirect` to `https://24wallet.ru/`.
- `curl -I http://www.24wallet.ru`: `308 Permanent Redirect` to `https://24wallet.ru/`.
- `curl -I https://24wallet.ru`: `200 OK` with HSTS.
- `curl -I https://www.24wallet.ru`: `308 Permanent Redirect` to `https://24wallet.ru/`.
- `curl -s https://24wallet.ru/extension-smoke | head`: wallet smoke page returned HTML.
- `curl -I https://bstcrm.ru/healthz`: CRM remained reachable; endpoint returns `405` for `HEAD` with `Allow: GET`.
- `curl https://24wallet.ru/api/market/prices?...`: returned public price JSON over HTTPS.

## Mixed Content

The deployed smoke HTML was checked for `http://24wallet.ru` and `http://85.239.59.199:8080` references. No matches were found in the page response.

## Notes

Existing unrelated nginx warnings for `ultraauto39.ru` duplicate server names remain present. They were not introduced or changed by this wallet HTTPS enforcement.
