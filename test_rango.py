import urllib.request
import json
req = urllib.request.Request("https://api.rango.exchange/basic/quote?apiKey=c6381a79-2817-4602-83bf-6a641a409e32&from=ETH.ETH&to=ETH.USDT-0xdac17f958d2ee523a2206206994597c13d831ec7&amount=1&slippage=0.01", headers={'User-Agent': 'Mozilla/5.0'})
try:
    resp = urllib.request.urlopen(req)
    print(resp.read().decode('utf-8'))
except Exception as e:
    print(e)
