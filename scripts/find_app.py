import paramiko

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    
    cmd = """
    PID=$(netstat -tulpn | grep :8080 | awk '{print $7}' | cut -d'/' -f1)
    if [ -n "$PID" ]; then
        ls -l /proc/$PID/cwd
    fi
    """
    stdin, stdout, stderr = client.exec_command(cmd)
    
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))

finally:
    client.close()
