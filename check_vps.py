import paramiko, sys
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('85.239.59.199', username='root', password='yhNc+9-BE@FKAo', timeout=10)
    stdin, stdout, stderr = client.exec_command('df -h; echo "==="; free -m; echo "==="; docker compose -f /opt/acorus-wallet/infra/docker-compose.yml ps; echo "==="; docker compose -f /opt/acorus-wallet/infra/docker-compose.yml logs --tail 20', timeout=15)
    with open('vps_status.txt', 'wb') as f:
        f.write(stdout.read())
        f.write(b'\nSTDERR:\n')
        f.write(stderr.read())
except Exception as e:
    with open('vps_status.txt', 'wb') as f:
        f.write(str(e).encode())
