import paramiko
import os

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'
local_file = 'apps/web/public/downloads/acorus-wallet-extension.zip'
remote_tmp_file = '/root/acorus-wallet-extension-v2.zip'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting...")
    client.connect(host, username=user, password=password, timeout=10)
    
    sftp = client.open_sftp()
    print("Uploading zip to /root...")
    sftp.put(local_file, remote_tmp_file)
    sftp.close()
    
    print("Creating downloads directory and copying zip into running container...")
    # acorus-web is the container name based on our docker ps
    cmd = f"docker exec acorus-web mkdir -p /app/apps/web/public/downloads && docker cp {remote_tmp_file} acorus-web:/app/apps/web/public/downloads/acorus-wallet-extension-v2.zip"
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    print(stdout.read().decode())
    print(stderr.read().decode())
    print(f"Docker CP exit status: {exit_status}")

finally:
    client.close()
