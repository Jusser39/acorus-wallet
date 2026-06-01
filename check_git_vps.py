import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect('85.239.59.199', username='root', password='yhNc+9-BE@FKAo', timeout=10)
    stdin, stdout, stderr = client.exec_command('cd /opt/acorus-wallet && git status && git rev-parse HEAD', timeout=15)
    print(stdout.read().decode())
    print(stderr.read().decode())
except Exception as e:
    print("Error:", e)
