import paramiko
import sys

host = '85.239.59.199'
user = 'root'
password = 'yhNc+9-BE@FKAo'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, username=user, password=password, timeout=10)
    
    cmd = "curl -s 'https://api.rango.exchange/basic/quote?apiKey=c6381a79-2817-4602-83bf-6a641a409e32&from=ETH.ETH&to=ETH.USDT-0xdac17f958d2ee523a2206206994597c13d831ec7&amount=1&slippage=0.01'"
    stdin, stdout, stderr = client.exec_command(cmd)
    print("STDOUT:")
    print(stdout.read().decode('utf-8'))
    print("STDERR:")
    print(stderr.read().decode('utf-8'))
        
finally:
    client.close()
