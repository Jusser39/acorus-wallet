import sys
import paramiko
sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to VPS...")
    client.connect('85.239.59.199', username='root', password='yhNc+9-BE@FKAo', timeout=10)
    print("Connected.")
    
    commands = [
        "cd /opt/acorus-wallet && git stash && git pull origin main",
        "cd /opt/acorus-wallet && pnpm install",
        "cd /opt/acorus-wallet && pnpm --filter @acorus/web build",
        "cd /opt/acorus-wallet && docker compose --env-file .env -f infra/docker-compose.yml restart web"
    ]
    
    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out: print(out.strip())
        if err: print("STDERR:", err.strip())
        
except Exception as e:
    print(f"Error: {e}")
finally:
    client.close()
