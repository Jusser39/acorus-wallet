import getpass
import os, tarfile, paramiko, io, time

HOST = "85.239.59.199"
USER = "root"
PASS = os.environ.get("ACORUS_VPS_PASSWORD") or getpass.getpass(
    f"Enter password for {USER}@{HOST}: ",
)
REMOTE_PATH = "/opt/acorus-wallet"
LOCAL_ROOT = r"C:\Users\NZXT\acorus-wallet"
TARBALL = r"C:\Users\NZXT\acorus-wave4-deploy.tar.gz"

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
            elif part == pat:
                return True
    return False

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
print(f"Tarball ready: {os.path.getsize(TARBALL)//1024}KB")

print("Connecting to VPS...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=30)
print("Connected.")

sftp = client.open_sftp()
remote_tar = f"{REMOTE_PATH}/acorus-wave4-deploy.tar.gz"
print(f"Uploading {TARBALL}...")
sftp.put(TARBALL, remote_tar)
sftp.close()
print("Upload done.")

def run(cmd, timeout=300):
    print(f"\n>>> {cmd}")
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    if out.strip():
        print(out[-2000:] if len(out) > 2000 else out)
    if err.strip() and code != 0:
        print("STDERR:", err[-500:])
    print(f"[exit {code}]")
    return code

run(f"cd {REMOTE_PATH} && tar -xzf acorus-wave4-deploy.tar.gz")
run(f"cd {REMOTE_PATH} && pnpm install --frozen-lockfile 2>&1 | tail -5", 120)
run(f"cd {REMOTE_PATH} && docker compose --env-file .env -f infra/docker-compose.yml build api web 2>&1 | tail -20", 300)
run(f"cd {REMOTE_PATH} && docker compose --env-file .env -f infra/docker-compose.yml up -d api web nginx")
time.sleep(5)
run(f"cd {REMOTE_PATH} && docker compose --env-file .env -f infra/docker-compose.yml exec -T api npx prisma db push --schema=prisma/schema.prisma 2>&1 | tail -5", 60)
run(f"cd {REMOTE_PATH} && docker compose --env-file .env -f infra/docker-compose.yml ps")
run("curl -fsS http://127.0.0.1:8080/health")
run("curl -fsS http://127.0.0.1:8080/api/chains | head -c 200")
run("curl -I -s http://127.0.0.1:8080/send | head -3")

client.close()
print("\nDeploy complete!")
