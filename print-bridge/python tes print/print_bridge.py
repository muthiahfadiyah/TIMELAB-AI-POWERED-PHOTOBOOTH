#!/usr/bin/env python3
"""Bridge lokal: terima data ESC/POS dari browser (HTTP) dan teruskan ke printer USB (RPP02N / GEZHI micro-printer) via pyusb.

Jalankan: python3 print_bridge.py
Biarkan terminal tetap terbuka selama ingin mencetak dari website.
"""
import http.server
import socketserver
import usb.core
import usb.util

VENDOR_ID = 0x28e9
PRODUCT_ID = 0x0289
ENDPOINT_OUT = 0x01
PORT = 9100


def send_to_printer(data):
    dev = usb.core.find(idVendor=VENDOR_ID, idProduct=PRODUCT_ID)
    if dev is None:
        raise RuntimeError('Printer USB tidak ditemukan (vendor=0x28e9, product=0x0289). Pastikan kabel USB tersambung dan printer menyala.')
    try:
        if dev.is_kernel_driver_active(0):
            dev.detach_kernel_driver(0)
    except (NotImplementedError, usb.core.USBError):
        pass
    dev.set_configuration()
    usb.util.claim_interface(dev, 0)
    try:
        dev.write(ENDPOINT_OUT, data, timeout=20000)
    finally:
        usb.util.release_interface(dev, 0)


class Handler(http.server.BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path == '/status':
            dev = usb.core.find(idVendor=VENDOR_ID, idProduct=PRODUCT_ID)
            ok = dev is not None
            self.send_response(200 if ok else 503)
            self._cors()
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'ok' if ok else b'printer tidak terdeteksi')
        else:
            self.send_response(404)
            self._cors()
            self.end_headers()

    def do_POST(self):
        if self.path == '/print':
            length = int(self.headers.get('Content-Length', 0))
            data = self.rfile.read(length)
            try:
                send_to_printer(data)
                self.send_response(200)
                self._cors()
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'printed')
            except Exception as e:
                self.send_response(500)
                self._cors()
                self.send_header('Content-Type', 'text/plain')
                self.end_headers()
                self.wfile.write(str(e).encode())
        else:
            self.send_response(404)
            self._cors()
            self.end_headers()

    def log_message(self, fmt, *args):
        print('[bridge]', fmt % args)


if __name__ == '__main__':
    with socketserver.TCPServer(('127.0.0.1', PORT), Handler) as httpd:
        print(f'Print bridge jalan di http://127.0.0.1:{PORT}')
        print('Biarkan terminal ini tetap terbuka selama ingin mencetak dari browser.')
        httpd.serve_forever()
