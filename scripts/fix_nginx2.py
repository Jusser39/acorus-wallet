import paramiko

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    
    # move the file
    cmd = "cp /root/extension.zip /var/www/extension.zip && chmod 644 /var/www/extension.zip"
    client.exec_command(cmd)
    
    # modify nginx config
    cmd2 = "grep -Rl 'server_name 24wallet.ru' /etc/nginx/"
    stdin, stdout, stderr = client.exec_command(cmd2)
    files = stdout.read().decode('utf-8').strip().split('\n')
    conf_file = files[0]
    
    cmd3 = f"sed -i 's|alias /root/extension.zip|alias /var/www/extension.zip|g' {conf_file}"
    client.exec_command(cmd3)
    
    # reload nginx
    client.exec_command("nginx -t && systemctl reload nginx")
    print("Fixed!")

finally:
    client.close()
