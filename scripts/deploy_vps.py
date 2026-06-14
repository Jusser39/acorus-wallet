import paramiko
import sys

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, port=22, timeout=30)
    
    # Zero-downtime deployment logic
    cmd = """
    # 1. Fetch to a temporary staging directory
    rm -rf /root/acorus-wallet-staging
    git clone https://github.com/Jusser39/acorus-wallet.git /root/acorus-wallet-staging
    cd /root/acorus-wallet-staging
    
    # 2. Build in staging
    pnpm install
    pnpm build
    
    # 3. Find active target directory
    if [ -d "/root/acorus-wallet-latest" ]; then
        TARGET_DIR="/root/acorus-wallet-latest"
    elif [ -d "/var/www/acorus-wallet" ]; then
        TARGET_DIR="/var/www/acorus-wallet"
    elif [ -d "/var/www/acorus-wallet-latest" ]; then
        TARGET_DIR="/var/www/acorus-wallet-latest"
    elif [ -d "/root/acorus-wallet" ]; then
        TARGET_DIR="/root/acorus-wallet"
    else
        echo "Could not find the target directory"
        exit 1
    fi
    
    echo "Syncing staging build to $TARGET_DIR..."
    # 4. Sync files, keeping the existing .env file
    rsync -a --delete --exclude='.env' --exclude='.env.local' /root/acorus-wallet-staging/ "$TARGET_DIR/"
    
    # 5. Zero-downtime reload using PM2
    cd "$TARGET_DIR"
    pm2 reload all
    """
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Wait for the command to finish and print output
    exit_status = stdout.channel.recv_exit_status()
    print("STDOUT:")
    print(stdout.read().decode('utf-8', errors='replace').encode('cp1251', errors='replace').decode('cp1251'))
    print("STDERR:")
    print(stderr.read().decode('utf-8', errors='replace').encode('cp1251', errors='replace').decode('cp1251'))
    
    if exit_status == 0:
        print("Deployed successfully!")
    else:
        print(f"Deployment failed with exit status {exit_status}")
        
finally:
    client.close()
