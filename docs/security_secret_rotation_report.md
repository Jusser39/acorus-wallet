# Security Secret Rotation Report

## Current security note

- `ZEROX_API_KEY` is sensitive and must remain backend-only
- the key value is not stored in the repository
- if a key appeared in chat logs, shell history, screenshots, or terminal output, it must be treated as compromised and rotated in the 0x dashboard

## VPS credential risk

- the VPS root password exposure risk is noted
- root password rotation should be treated as urgent operational debt

## Recommended actions

1. Rotate the 0x API key in the 0x dashboard.
2. Disable the old 0x key after the new key is confirmed working.
3. Rotate the VPS root password.
4. Move day-to-day access to SSH key auth.
5. Disable password login after SSH key access is verified.
6. Keep secrets only in `.env` with `chmod 600`.
7. Consider Docker secrets or another secret manager in a later wave.
