import paramiko

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    
    cmd = "cat /etc/nginx/sites-enabled/* || cat /etc/nginx/conf.d/* || ls -la /var/www"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    # Save output to a file instead of printing directly to avoid encoding issues on Windows
    with open('nginx_config.txt', 'wb') as f:
        f.write(stdout.read())
        f.write(b"\nSTDERR:\n")
        f.write(stderr.read())

finally:
    client.close()
