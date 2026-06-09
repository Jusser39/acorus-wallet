import paramiko

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    
    cmd = """
    PID=$(ss -tulpn | grep :8080 | grep -o 'pid=[0-9]*' | cut -d'=' -f2 | head -n 1)
    if [ -n "$PID" ]; then
        ls -l /proc/$PID/cwd
    fi
    """
    stdin, stdout, stderr = client.exec_command(cmd)
    
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))

finally:
    client.close()
