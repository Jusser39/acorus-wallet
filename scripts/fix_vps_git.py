import paramiko

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to VPS...")
    client.connect(host, username=user, password=password, timeout=10)
    
    cmd = """
    cd /root/acorus-wallet || exit 1
    git init
    git remote remove origin || true
    git remote add origin https://github.com/Jusser39/acorus-wallet.git
    git fetch origin
    git branch -m main
    git reset --hard origin/main
    """
    
    print("Executing git fix commands...")
    stdin, stdout, stderr = client.exec_command(cmd)
    
    exit_status = stdout.channel.recv_exit_status()
    print("STDOUT:")
    print(stdout.read().decode('utf-8', errors='replace').encode('cp1251', errors='replace').decode('cp1251'))
    print("STDERR:")
    print(stderr.read().decode('utf-8', errors='replace').encode('cp1251', errors='replace').decode('cp1251'))
    
    if exit_status == 0:
        print("Git repo fixed successfully!")
    else:
        print(f"Failed with exit status {exit_status}")
        
finally:
    client.close()
