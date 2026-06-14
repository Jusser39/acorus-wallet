import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('85.239.59.199', username='root', password='yhNc+9-BE@FKAo', timeout=10)
client.exec_command("ufw allow 8081 && screen -dmS zipserver python3 -m http.server 8081")
client.close()
