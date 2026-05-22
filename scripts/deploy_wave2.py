import getpass
import os
import paramiko, tarfile, io, pathlib

host = "85.239.59.199"
user = "root"
password = os.environ.get("ACORUS_VPS_PASSWORD") or getpass.getpass(
    f"Enter password for {user}@{host}: ",
)

project_root = pathlib.Path(r"C:\Users\NZXT\acorus-wallet")

files = [
    "apps/web/lib/universal-assets.ts",
    "apps/web/lib/universal-assets.test.ts",
    "apps/web/lib/universal-chains.ts",
    "apps/web/lib/universal-explorer.ts",
    "apps/web/lib/receive.ts",
    "apps/web/lib/send-policy.ts",
    "apps/web/lib/send-policy.test.ts",
    "apps/web/components/universal-badges.tsx",
    "apps/web/components/asset-list.tsx",
    "apps/web/app/wallet/page.tsx",
    "apps/web/app/send/page.tsx",
    "apps/web/app/view-only/page.tsx",
    "apps/web/app/tokens/[chainId]/[tokenAddress]/page.tsx",
    "apps/web/app/history/page.tsx",
    "apps/api/src/api.test.ts",
]

buf = io.BytesIO()
with tarfile.open(fileobj=buf, mode="w:gz") as tar:
    for rel in files:
        local = project_root / rel.replace("/", "\\")
        if local.exists():
            tar.add(str(local), arcname=rel)
            print(f"  +{rel}")
        else:
            print(f"  MISSING: {rel}")
buf.seek(0)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

sftp = ssh.open_sftp()
sftp.putfo(buf, "/tmp/wave2_patch.tar.gz")
sftp.close()
print("Uploaded tarball")

cmds = [
    "cd /opt/acorus-wallet && tar -xzf /tmp/wave2_patch.tar.gz && echo 'Extracted OK'",
    "cd /opt/acorus-wallet && docker compose --env-file .env -f infra/docker-compose.yml exec -T web pnpm run build 2>&1 | tail -35",
]
for cmd in cmds:
    print(f"\n>>> {cmd[:60]}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=360)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip():
        print(out[-3000:])
    if err.strip():
        print("STDERR:", err[-500:])

ssh.close()
print("\nDONE")
