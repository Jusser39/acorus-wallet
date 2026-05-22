import getpass
import os
import paramiko

VPS_HOST = '85.239.59.199'
VPS_USER = 'root'
VPS_PASS = os.environ.get("ACORUS_VPS_PASSWORD") or getpass.getpass(
    f"Enter password for {VPS_USER}@{VPS_HOST}: ",
)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=30)

def run(cmd, timeout=30):
    stdin, stdout, stderr = client.exec_command(cmd, get_pty=False, timeout=timeout)
    out = stdout.read().decode()
    err = stderr.read().decode()
    exit_code = stdout.channel.recv_exit_status()
    return out.strip(), exit_code

# Verify endpoints
tests = [
    ('Health check', 'curl -s http://localhost:4000/health'),
    ('Public health via nginx', 'curl -s http://localhost:8080/health'),
    ('Market prices mock', 'curl -s "http://localhost:4000/api/market/prices?tokens=BTCUSDT"'),
    ('Discover token USDC', 'curl -s "http://localhost:4000/api/market/discover-token?chainId=1&tokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"'),
    ('Discover token invalid', 'curl -s "http://localhost:4000/api/market/discover-token?chainId=1&tokenAddress=notanaddress"'),
]

for name, cmd in tests:
    out, code = run(cmd)
    print(f'\n=== {name} ===')
    print(out[:600] if out else '(empty)')
    print(f'Exit: {code}')

# Also check from public internet
import urllib.request
import json

public_tests = [
    'http://85.239.59.199:8080/health',
    'http://85.239.59.199:8080/api/market/prices?chainId=1&symbols=ETH,BTC&currency=USD',
    'http://85.239.59.199:8080/api/market/chart?chainId=1&symbol=ETH&currency=USD&range=7D',
    'http://85.239.59.199:8080/api/market/discover-token?chainId=1&tokenAddress=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
]

print('\n=== PUBLIC ENDPOINTS ===')
for url in public_tests:
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            data = r.read().decode()
            print(f'\nGET {url}')
            print(data[:400])
    except Exception as e:
        print(f'\nGET {url} -> ERROR: {e}')

client.close()
print('\nVerification complete!')
