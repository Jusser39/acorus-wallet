import getpass
import os
import paramiko, json

host = "85.239.59.199"
user = "root"
password = os.environ.get("ACORUS_VPS_PASSWORD") or getpass.getpass(
    f"Enter password for {user}@{host}: ",
)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

cmds = [
    "curl -s http://127.0.0.1:8080/api/chains",
    "curl -s 'http://127.0.0.1:8080/api/market/prices?chainId=101&currency=USD&symbols=SOL' | python3 -c \"import sys,json; d=json.load(sys.stdin); print('SOL prices:', len(d.get('prices',[])))\"",
    "curl -fsS http://85.239.59.199:8080/health",
]
for cmd in cmds:
    print(f"\n>>> {cmd[:80]}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=30)
    out = stdout.read().decode()
    if out.strip():
        print(out[:500])

ssh.close()
