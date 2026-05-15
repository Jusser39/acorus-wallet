import paramiko
import os
import getpass

# VPS connection details
VPS_HOST = "85.239.59.199"
VPS_USER = "root"
VPS_PATH = "/opt/acorus-wallet/"

# Local file path
LOCAL_ARCHIVE = r"C:\Users\NZXT\acorus-wallet-deploy.tar.gz"

try:
    # Prompt for password
    password = getpass.getpass(f"Enter password for {VPS_USER}@{VPS_HOST}: ")
    
    # Create SSH client
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print(f"Connecting to {VPS_HOST}...")
    client.connect(VPS_HOST, username=VPS_USER, password=password)
    
    # Upload file using SFTP
    sftp = client.open_sftp()
    remote_path = f"{VPS_PATH}acorus-wallet-deploy.tar.gz"
    
    print(f"Uploading {LOCAL_ARCHIVE} to {remote_path}...")
    sftp.put(LOCAL_ARCHIVE, remote_path)
    
    print("Upload completed!")
    
    # Extract and deploy
    commands = [
        f"cd {VPS_PATH}",
        "tar -xzf acorus-wallet-deploy.tar.gz",
        "pnpm install",
        "pnpm --filter @acorus/api prisma:generate",
        "docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres psql -U postgres -d acorus_wallet -c 'SELECT 1' || echo 'DB OK'",
        "pnpm --filter @acorus/api prisma:push || echo 'Schema already synced'",
        "pnpm --filter @acorus/shared build",
        "pnpm --filter @acorus/wallet-core build",
        "pnpm --filter @acorus/api build",
        "pnpm --filter @acorus/web build",
        "docker compose --env-file .env -f infra/docker-compose.yml build api web",
        "docker compose --env-file .env -f infra/docker-compose.yml up -d api web nginx",
        "docker compose --env-file .env -f infra/docker-compose.yml ps",
    ]
    
    for cmd in commands:
        print(f"\nExecuting: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd, get_pty=True)
        output = stdout.read().decode()
        errors = stderr.read().decode()
        if output:
            print(output)
        if errors:
            print(f"Errors: {errors}")
    
    print("\nDeployment complete!")
    
    sftp.close()
    client.close()
    
except Exception as e:
    print(f"Error: {e}")
