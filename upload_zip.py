import paramiko
import sys

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'
localpath = 'acorus-extension.zip'
remotepath = '/opt/acorus-wallet/apps/web/public/acorus-extension.zip'

transport = paramiko.Transport((host, 22))
transport.connect(username=user, password=password)
sftp = paramiko.SFTPClient.from_transport(transport)

print("Uploading...")
sftp.put(localpath, remotepath)
print("Done!")

sftp.close()
transport.close()
