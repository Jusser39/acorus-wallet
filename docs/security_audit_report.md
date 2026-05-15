# Acorus Wallet Security Audit Report

## Date
- 2026-05-15

## Scope
- local repo
- VPS deployment
- Docker Compose
- API
- Prisma/PostgreSQL
- logging
- secret handling
- non-custodial wallet model

## Current deployment
- URL: `http://85.239.59.199:8080`
- VPS path: `/opt/acorus-wallet`
- Port `8080` is used because port `80` is occupied by another application on the VPS
- Backend store: `prisma`

## Findings

### 1. Critical
- **Root password rotation is required immediately.** The root password was exposed earlier in logs/messages outside the repository and must be treated as compromised.
- **HTTP-only deployment is not acceptable for real production use.** The current IP:8080 deployment is staging/dev-public only; real users and real funds require a domain plus HTTPS before launch.

### 2. High
- **Backend must remain strictly non-custodial.** The API was audited and no current route accepts or stores `mnemonic`, `seedPhrase`, `privateKey`, `passcode`, or encrypted vault payloads; this boundary must remain enforced in future waves.
- **Production CORS must be restricted after domain setup.** Current behavior allows permissive fallback when `CORS_ORIGIN` is unset; this is acceptable for the current IP-based dev-public deployment but must be narrowed once a domain is provisioned.
- **Database backups must be scheduled.** Manual backup tooling now exists, but recurring backup automation and retention policy still need to be configured on the VPS.

### 3. Medium
- **Local Docker regression remains environment-dependent.** Repository-level build, test, Prisma, and shell checks pass locally, but local Docker container rebuild/up is still blocked until the Docker Desktop Linux engine is running on the workstation.
- **Restore is intentionally guarded and manual.** `restore-postgres.sh` requires `CONFIRM_RESTORE=yes` and a valid backup file; this is safer now, but restore drills should be performed before any real production launch.

### 4. Low
- **Public scanners hit the VPS.** Nginx logs show unsolicited probing traffic against common endpoints; this reinforces the need for domain/HTTPS hardening and a careful future firewall rollout.
- **Transient stale-deploy web noise exists.** The web container logged a Next.js stale Server Action warning during older-client traffic; it does not expose secrets and did not break health or persistence.

### 5. Informational
- `.env` is not tracked by git.
- The exact compromised root password is absent from both the current git working tree and git history.
- Secret scan hits in tracked files are currently limited to safe placeholders in `.env.example`, security documentation, and redaction/test coverage.
- Docker logs scanned on the VPS did not contain `mnemonic`, `seedPhrase`, `privateKey`, `passcode`, `DATABASE_URL`, `POSTGRES_PASSWORD`, `authorization`, or `cookie`.

## Checks performed
- git status / git history audit
- git secret scan
- exact compromised password presence check in worktree and history
- `.gitignore` / `.gitattributes` audit
- docs scan for secrets
- Docker logs scan on VPS
- API routes audit
- logger redaction audit
- Prisma persistence regression
- VPS health checks
- PostgreSQL backup smoke run
- shell script LF and syntax checks

## Results
- Expanded logger redaction to cover `DATABASE_URL`, `POSTGRES_PASSWORD`, `authorization`, `cookie`, and `set-cookie`-style header paths in addition to mnemonic/private key/passcode fields.
- Added API regression coverage so parser/content-type failures return sanitized `400 bad_request` instead of leaking internal error text as `500`.
- Added optional `CORS_ORIGIN` handling without breaking empty `.env` values.
- Fixed the public anonymous-user bootstrap path by making web API requests avoid `Content-Type: application/json` on body-less calls.
- Added persistence state file support to `scripts/check-persistence.sh`, so post-restart verification reuses saved ids.
- Added PostgreSQL backup and guarded restore scripts.
- Verified on VPS that `/health` returns `store: "prisma"`, public `/api/chains` responds, persistence survives `docker compose restart api`, and a backup file is created in `backups/postgres`.

## Required manual actions
- Rotate the VPS root password immediately.
- Configure SSH key auth and verify it from a separate session.
- Disable SSH password login only after key-based login works.
- Configure a domain and HTTPS before real users or real-value mainnet usage.
- Schedule recurring PostgreSQL backups with retention and off-host storage.
- Run another focused security review before opening access beyond controlled testing.

## Next recommended wave
- domain + HTTPS
- EVM testnet send flow
- frontend wallet UX hardening
