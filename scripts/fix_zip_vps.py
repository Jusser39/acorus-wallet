import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('85.239.59.199', username='root', password='yhNc+9-BE@FKAo', timeout=10)
cmd = "docker exec acorus-web mkdir -p /app/apps/web/.next/standalone/apps/web/public/downloads && docker cp /root/acorus-wallet-extension-v3.zip acorus-web:/app/apps/web/.next/standalone/apps/web/public/downloads/acorus-wallet-extension-v3.zip"
stdin, stdout, stderr = client.exec_command(cmd)
print(stdout.read().decode())
print(stderr.read().decode())
client.close()
