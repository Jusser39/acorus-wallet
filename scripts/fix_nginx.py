import paramiko
import re

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    
    # find the file containing 24wallet.ru
    cmd = "grep -Rl 'server_name 24wallet.ru' /etc/nginx/"
    stdin, stdout, stderr = client.exec_command(cmd)
    
    files = stdout.read().decode('utf-8').strip().split('\n')
    if not files or files[0] == '':
        print("Could not find nginx config for 24wallet.ru")
    else:
        conf_file = files[0]
        print(f"Found config: {conf_file}")
        
        # We will inject the location block right before 'location / {'
        cmd2 = f"cat {conf_file}"
        stdin, stdout, stderr = client.exec_command(cmd2)
        content = stdout.read().decode('utf-8')
        
        if "location = /extension.zip" not in content:
            # We want to add it inside the server block for 443 ssl
            # A simple way: find 'location / {' and replace with 'location = /extension.zip { alias /root/extension.zip; }\n    location / {'
            new_content = content.replace("location / {", "location = /extension.zip {\n        alias /root/extension.zip;\n    }\n\n    location / {")
            
            # upload the new content
            sftp = client.open_sftp()
            with sftp.file(conf_file, 'w') as f:
                f.write(new_content)
            sftp.close()
            
            print("Updated config. Reloading nginx...")
            stdin, stdout, stderr = client.exec_command("nginx -t && systemctl reload nginx")
            print(stdout.read().decode('utf-8'))
            print(stderr.read().decode('utf-8'))
        else:
            print("Config already has extension.zip location.")

finally:
    client.close()
