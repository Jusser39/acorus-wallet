import paramiko
import sys

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    
    # We will try to find the acorus-wallet directory and deploy
    # The user's code might be in /root/acorus-wallet, or /var/www, etc.
    cmd = """
    cd /root/acorus-wallet-latest || cd /var/www/acorus-wallet || cd /var/www/acorus-wallet-latest || cd /root/acorus-wallet || exit 1
    git reset --hard
    git pull
    pnpm install
    pnpm build
    pm2 restart all
    """
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Wait for the command to finish and print output
    exit_status = stdout.channel.recv_exit_status()
    print("STDOUT:")
    print(stdout.read().decode('utf-8'))
    print("STDERR:")
    print(stderr.read().decode('utf-8'))
    
    if exit_status == 0:
        print("Deployed successfully!")
    else:
        print(f"Deployment failed with exit status {exit_status}")
        
finally:
    client.close()
