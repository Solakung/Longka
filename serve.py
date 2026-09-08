#!/usr/bin/env python3
"""รันเซิร์ฟเวอร์ทดสอบเกมในเครื่อง แล้วเปิดเบราว์เซอร์ให้เอง
   วิธีใช้:  python python/serve.py  [พอร์ต]"""
import http.server, socketserver, webbrowser, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.webmanifest': 'application/manifest+json',
    }

with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
    print(f'🪔 เปิดเล่นที่  http://127.0.0.1:{PORT}   (Ctrl+C เพื่อหยุด)')
    webbrowser.open(f'http://127.0.0.1:{PORT}')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\nปิดเซิร์ฟเวอร์แล้ว')