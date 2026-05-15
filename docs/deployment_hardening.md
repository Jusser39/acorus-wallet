# Deployment Hardening

## 1. Current VPS state
- VPS path: `/opt/acorus-wallet`
- Public URL: `http://85.239.59.199:8080`
- Port `8080` is intentional because port `80` is occupied by another application
- Docker Compose services: `postgres`, `redis`, `api`, `web`, `nginx`
- Backend store: `prisma`
- Current deployment should be treated as staging/dev-public until domain + HTTPS are in place

## 2. Rotate root password
The root password must be considered compromised and rotated manually on the VPS.

```bash
passwd root
```

After rotation:
- update any secure password vault entry
- do not place the password in repo files, docs, scripts, or terminal transcripts that will be shared

## 3. Add SSH key auth
1. Generate a key locally if you do not already have one:

```bash
ssh-keygen -t ed25519 -C "acorus-wallet-admin"
```

2. Copy the public key to the VPS:

```bash
ssh-copy-id root@85.239.59.199
```

If `ssh-copy-id` is unavailable, append the public key manually to `/root/.ssh/authorized_keys`.

3. Enforce permissions on the VPS:

```bash
chmod 700 /root/.ssh
chmod 600 /root/.ssh/authorized_keys
```

4. Open a **separate** terminal and verify login via key auth before changing SSH password settings.

**Do not close the current SSH session until the new key-based login is confirmed.**

## 4. Disable password login
After key login works in a separate session, update SSH daemon settings in `/etc/ssh/sshd_config` or `/etc/ssh/sshd_config.d/*.conf`:

```text
PasswordAuthentication no
PermitRootLogin prohibit-password
```

Validate and reload SSH:

```bash
sshd -t
systemctl reload ssh
```

Again: **do not close the current root session until the new login path is verified.**

## 5. Firewall/UFW baseline
Do not enable UFW blindly; validate open ports first.

Baseline allow-list when ready:

```bash
ufw allow OpenSSH
ufw allow 8080/tcp
```

Later, when a domain/reverse proxy is introduced:

```bash
ufw allow 80/tcp
ufw allow 443/tcp
```

Only enable the firewall after confirming SSH and application reachability.

## 6. Docker Compose operations
Run from `/opt/acorus-wallet`:

```bash
docker compose --env-file .env -f infra/docker-compose.yml ps
docker compose --env-file .env -f infra/docker-compose.yml logs --tail=100 api
docker compose --env-file .env -f infra/docker-compose.yml build api web
docker compose --env-file .env -f infra/docker-compose.yml up -d api web nginx
docker compose --env-file .env -f infra/docker-compose.yml restart api
```

Health checks:

```bash
curl -fsS http://127.0.0.1:8080/health
curl -fsS http://85.239.59.199:8080/health
```

## 7. Environment variables
- Keep `.env` local to the VPS and out of git
- `.env.example` is the committed safe template
- `DATABASE_URL` and `POSTGRES_PASSWORD` must never be printed in full
- `CORS_ORIGIN` may stay empty for current IP-based dev-public deployment; once a domain exists, set it explicitly

Safe masked inspection example:

```text
DATABASE_URL=postgresql://postgres:***@postgres:5432/acorus_wallet
POSTGRES_PASSWORD=***
ACORUS_ENABLE_PRISMA_STORE=true
```

## 8. PostgreSQL backup
The backup script runs on the VPS and writes timestamped SQL dumps under `/opt/acorus-wallet/backups/postgres`.

```bash
cd /opt/acorus-wallet
bash scripts/backup-postgres.sh
```

Behavior:
- creates `backups/postgres` if missing
- uses `pg_dump` inside the `postgres` container
- saves backup with UTC timestamp
- sets file permissions to `600`
- does not print passwords

Recommended next step:
- schedule recurring backups
- ship copies off-host
- define retention policy

## 9. PostgreSQL restore
Restore is intentionally guarded.

```bash
cd /opt/acorus-wallet
CONFIRM_RESTORE=yes bash scripts/restore-postgres.sh backups/postgres/<file>.sql
```

Supported inputs:
- `.sql`
- `.dump`

Restore behavior:
- refuses to run unless `CONFIRM_RESTORE=yes`
- creates a safety backup before restore
- uses `psql` for `.sql`
- uses `pg_restore` for `.dump`

Operational warning:
- restore should be treated as destructive maintenance
- prefer stopping application writes during restore windows
- test restores on non-production data before any real production launch

## 10. Logs and redaction
- API logger redacts mnemonic/private-key/passcode fields
- API logger also redacts `DATABASE_URL`, `POSTGRES_PASSWORD`, `authorization`, `cookie`, and `set-cookie`-style header fields
- secret-bearing payloads must never be sent to the backend in the first place
- scan logs periodically for unexpected sensitive terms

## 11. Domain + HTTPS next step
Before real users or real-value mainnet usage:
- attach a domain
- terminate HTTPS
- restrict `CORS_ORIGIN`
- keep the app on safe reverse-proxied routes
- re-run a focused deployment/security audit

## 12. Incident checklist
If something suspicious happens:
1. Keep the current SSH session open.
2. Confirm service health with local `curl` and `docker compose ps`.
3. Rotate credentials if exposure is suspected.
4. Take a PostgreSQL backup before risky remediation.
5. Inspect API/nginx logs for unexpected requests.
6. If needed, stop public app traffic before deeper recovery work.
