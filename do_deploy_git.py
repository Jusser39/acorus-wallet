import paramiko
import sys

commands = """
set -e
cd /opt/acorus-wallet
echo "Pulling latest changes..."
git reset --hard
git clean -fd
git pull
echo "Installing dependencies..."
pnpm install
echo "Building shared packages..."
pnpm --filter @acorus/shared build
pnpm --filter @acorus/wallet-core build
pnpm --filter @acorus/api build
pnpm --filter @acorus/web build
echo "Building and restarting Docker containers..."
docker compose --env-file .env -f infra/docker-compose.yml build api web
docker compose --env-file .env -f infra/docker-compose.yml up -d api web nginx
echo "Deployment successful!"
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to VPS...")
    client.connect('85.239.59.199', username='root', password='yhNc+9-BE@FKAo', timeout=10)
    print("Executing deployment commands...")
    stdin, stdout, stderr = client.exec_command(commands, get_pty=True)
    for line in iter(stdout.readline, ""):
        print(line.encode('ascii', 'ignore').decode('ascii'), end="")
        sys.stdout.flush()
    client.close()
except Exception as e:
    print("Error:", e)
