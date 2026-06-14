import paramiko
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('85.239.59.199', username='root', password='yhNc+9-BE@FKAo', timeout=10)
client.exec_command("docker restart acorus-web")
client.close()
