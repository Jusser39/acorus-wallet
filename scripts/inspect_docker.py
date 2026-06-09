import paramiko

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    
    cmd = "docker inspect acorus-web"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Write to file
    with open('docker_inspect.txt', 'wb') as f:
        f.write(stdout.read())

finally:
    client.close()
