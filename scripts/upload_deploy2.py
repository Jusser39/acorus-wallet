import paramiko

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting...")
    client.connect(host, username=user, password=password, timeout=10)
    
    # find path
    print("Finding directory...")
    stdin, stdout, stderr = client.exec_command("find / -maxdepth 3 -name acorus-wallet -type d | head -n 1")
    remote_path = stdout.read().decode('utf-8').strip()
    
    if not remote_path:
        stdin, stdout, stderr = client.exec_command("find / -maxdepth 3 -name acorus-wallet-latest -type d | head -n 1")
        remote_path = stdout.read().decode('utf-8').strip()
        
    print(f"Remote path is: {remote_path}")
    
    print("Running build commands...")
    cmd = f"""
    cd {remote_path}
    git checkout main
    git reset --hard origin/main
    git pull
    pnpm install
    pnpm --filter @acorus/web build
    pm2 restart all
    """
    stdin, stdout, stderr = client.exec_command(cmd)
    
    exit_status = stdout.channel.recv_exit_status()
    # Write to file to avoid charmap decode errors in Windows console
    with open('deploy_output.txt', 'wb') as f:
        f.write(stdout.read())
        f.write(b"\nSTDERR:\n")
        f.write(stderr.read())
        
    print(f"Exit status: {exit_status}")

finally:
    client.close()
