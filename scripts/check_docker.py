import paramiko

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    
    cmd = "docker ps"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))

finally:
    client.close()
