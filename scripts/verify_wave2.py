import paramiko

host = "85.239.59.199"
user = "root"
password = "yhNc+9-BE@FKAo"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=user, password=password)

cmds = [
    "cd /opt/acorus-wallet && docker compose --env-file .env -f infra/docker-compose.yml restart web",
    "sleep 5 && curl -fsS http://127.0.0.1:8080/health",
    "curl -fsS http://127.0.0.1:8080/api/chains | python3 -c \"import sys,json; d=json.load(sys.stdin); print('chains:', len(d.get('chains',[])))\"",
    "docker compose --env-file /opt/acorus-wallet/.env -f /opt/acorus-wallet/infra/docker-compose.yml ps --format 'table {{.Name}}\\t{{.Status}}'",
]
for cmd in cmds:
    print(f"\n>>> {cmd[:70]}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=60)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip():
        print(out)
    if err.strip():
        print("STDERR:", err[-300:])

ssh.close()
print("\nDONE")
