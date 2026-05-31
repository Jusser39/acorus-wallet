import os
import tarfile
import time
import getpass
import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')
HOST = "85.239.59.199"
USER = "root"
PASS = "yhNc+9-BE@FKAo"
REMOTE_PATH = "/opt/acorus-wallet"
LOCAL_ROOT = r"C:\Users\NZXT\acorus-wallet"
TARBALL = r"C:\Users\NZXT\acorus-wave6-deploy.tar.gz"

EXCLUDE_DIRS = {
    ".git", "node_modules", ".next", "dist", "coverage", "tmp",
    ".turbo", "backups", ".pnpm-store",
}
EXCLUDE_FILES = {".env", "*.tar.gz", "*.log"}


def should_exclude(path: str) -> bool:
    parts = path.replace("\\", "/").split("/")
    for part in parts:
        if part in EXCLUDE_DIRS:
            return True
    for part in path.split(os.sep):
        for pat in EXCLUDE_FILES:
            if pat.startswith("*") and part.endswith(pat[1:]):
                return True
            if part == pat:
                return True
    return False


def run(client: paramiko.SSHClient, cmd: str, timeout: int = 300, check: bool = True) -> str:
    print(f"\n>>> {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out.strip())
    if err.strip():
        print("[STDERR]", err.strip())
    print(f"[exit {code}]")
    if check and code != 0:
        raise SystemExit(code)
    return out


print("Building tarball...")
with tarfile.open(TARBALL, "w:gz") as tar:
    for root, dirs, files in os.walk(LOCAL_ROOT):
        dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
        for fname in files:
            fpath = os.path.join(root, fname)
            if should_exclude(fpath):
                continue
            arcname = os.path.relpath(fpath, LOCAL_ROOT)
            tar.add(fpath, arcname=arcname)
print(f"Tarball ready: {os.path.getsize(TARBALL) // 1024}KB")

print("Connecting to VPS...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
print("Connected.")

sftp = client.open_sftp()
remote_tar = f"{REMOTE_PATH}/acorus-wave6-deploy.tar.gz"
print(f"Uploading {TARBALL}...")
sftp.put(TARBALL, remote_tar)
sftp.close()
print("Upload done.")

run(client, f"cd {REMOTE_PATH} && tar xzf acorus-wave6-deploy.tar.gz --overwrite && rm acorus-wave6-deploy.tar.gz")
run(client, f"cd {REMOTE_PATH} && docker compose --env-file .env -f infra/docker-compose.yml build api web", timeout=900)
run(client, f"cd {REMOTE_PATH} && docker compose --env-file .env -f infra/docker-compose.yml up -d api web nginx", timeout=300)
time.sleep(5)
run(client, f"cd {REMOTE_PATH} && docker compose --env-file .env -f infra/docker-compose.yml exec -T api sh -lc \"cd /app/apps/api && npx prisma db push --schema prisma/schema.prisma\"", timeout=120)

run(client, f"cd {REMOTE_PATH} && docker compose --env-file .env -f infra/docker-compose.yml ps")
run(client, "curl -fsS http://127.0.0.1:8080/health")
run(client, "curl -fsS http://127.0.0.1:8080/api/chains")
run(client, "curl -I -s http://127.0.0.1:8080/swap | head -5")
run(
    client,
    """curl -fsS -X POST http://127.0.0.1:8080/api/swap/quote -H "Content-Type: application/json" -d '{"from":{"family":"evm","chainId":1,"type":"native","symbol":"ETH","name":"Ethereum","decimals":18,"tokenAddress":null,"isVerified":true},"to":{"family":"solana","chainId":101,"type":"native","symbol":"SOL","name":"Solana","decimals":9,"tokenAddress":null,"isVerified":true},"amountFormatted":"0.5","slippageBps":100}'""",
)
run(
    client,
    """code=$(curl -s -o /tmp/swap_sensitive.json -w "%{http_code}" -X POST http://127.0.0.1:8080/api/swap/quote -H "Content-Type: application/json" -d '{"mnemonic":"test test test","from":{},"to":{},"amountFormatted":"1"}'); echo $code; cat /tmp/swap_sensitive.json""",
)

run(client, f"cd {REMOTE_PATH} && BASE_URL=http://127.0.0.1:8080 bash scripts/check-persistence.sh", timeout=180)
run(client, f"cd {REMOTE_PATH} && docker compose --env-file .env -f infra/docker-compose.yml restart api")
time.sleep(30)
run(client, f"cd {REMOTE_PATH} && CHECK_MODE=verify BASE_URL=http://127.0.0.1:8080 bash scripts/check-persistence.sh", timeout=180)

run(client, "curl -fsS http://85.239.59.199:8080/health")
run(client, "curl -I -s http://85.239.59.199:8080/swap | head -5")

client.close()
print("\nDeploy complete.")
