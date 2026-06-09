import paramiko
import os

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

files_to_upload = [
    ('apps/web/app/tokens/[chainId]/[tokenAddress]/page.tsx', 'apps/web/app/tokens/[chainId]/[tokenAddress]/page.tsx'),
    ('apps/web/components/token-chart.tsx', 'apps/web/components/token-chart.tsx'),
    ('apps/web/components/token-chart.test.tsx', 'apps/web/components/token-chart.test.tsx'),
    ('apps/extension/src/ui/screens/Dashboard.tsx', 'apps/extension/src/ui/screens/Dashboard.tsx'),
    ('apps/web/public/extension.zip', 'apps/web/public/extension.zip'),
]

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
    
    sftp = client.open_sftp()
    
    for local_file, remote_file in files_to_upload:
        remote_file_path = os.path.join(remote_path, remote_file).replace('\\', '/')
        local_file_path = local_file
        print(f"Uploading {local_file_path} to {remote_file_path}...")
        try:
            sftp.put(local_file_path, remote_file_path)
        except Exception as e:
            print(f"Failed to upload {local_file_path}: {e}")
            
    sftp.close()
    
    print("Running build commands...")
    cmd = f"""
    cd {remote_path}
    pnpm install
    pnpm --filter @acorus/web build
    pm2 restart all
    """
    stdin, stdout, stderr = client.exec_command(cmd)
    
    exit_status = stdout.channel.recv_exit_status()
    print("STDOUT:", stdout.read().decode('utf-8'))
    print("STDERR:", stderr.read().decode('utf-8'))
    print(f"Exit status: {exit_status}")

finally:
    client.close()
