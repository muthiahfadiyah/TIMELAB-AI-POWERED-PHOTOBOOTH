#!/usr/bin/env python3
"""Bridge lokal versi Windows: terima data ESC/POS dari browser (HTTP) dan
teruskan ke printer thermal yang sudah terpasang sebagai printer Windows
(mis. "POS58 Printer") lewat spooler Windows (win32print), bukan lewat
USB langsung seperti versi Mac (print_bridge.py).

Kenapa berbeda dari versi Mac:
- Di Windows, printer USB thermal biasanya sudah otomatis diklaim oleh driver
  Windows (mis. POS58ENG) begitu dicolok, sehingga akses USB mentah (pyusb/
  libusb) akan bentrok dengan driver tsb kecuali diganti pakai WinUSB (Zadig).
- Jauh lebih sederhana dan stabil untuk memakai jalur resmi Windows: kirim
  data RAW (ESC/POS mentah, tanpa diproses driver) ke print queue yang sudah
  terdaftar via win32print. Driver POS58ENG akan meneruskan byte apa adanya
  ke printer selama datatype job-nya "RAW".

Cara pakai:
  1. Pastikan printer sudah terlihat di Settings > Printers & scanners
     dengan nama PRINTER_NAME di bawah ini (sesuaikan jika beda).
  2. Jalankan: python print_bridge_windows.py (atau double-click
     jalankan_bridge_windows.bat)
  3. Biarkan terminal ini tetap terbuka selama ingin mencetak dari website.
"""
import http.server
import socketserver
import win32print

PRINTER_NAME = 'POS58 Printer(2)'
PORT = 9100


def send_to_printer(data: bytes):
    try:
        hPrinter = win32print.OpenPrinter(PRINTER_NAME)
    except Exception as e:
        raise RuntimeError(
            f'Tidak bisa membuka printer "{PRINTER_NAME}". '
            f'Pastikan namanya sama persis dengan yang ada di '
            f'Settings > Bluetooth & devices > Printers & scanners. Detail: {e}'
        )
    try:
        job = win32print.StartDocPrinter(hPrinter, 1, ('Web Print', None, 'RAW'))
        try:
            win32print.StartPagePrinter(hPrinter)
            win32print.WritePrinter(hPrinter, data)
            win32print.EndPagePrinter(hPrinter)
        finally:
            win32print.EndDocPrinter(hPrinter)
    finally:
        win32print.ClosePrinter(hPrinter)


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
            try:
                names = [p[2] for p in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)]
                ok = PRINTER_NAME in names
            except Exception:
                ok = False
            self.send_response(200 if ok else 503)
            self._cors()
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(b'ok' if ok else f'printer "{PRINTER_NAME}" tidak ditemukan'.encode())
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
        print(f'Print bridge (Windows) jalan di http://127.0.0.1:{PORT}')
        print(f'Target printer: "{PRINTER_NAME}"')
        print('Biarkan terminal ini tetap terbuka selama ingin mencetak dari browser.')
        httpd.serve_forever()
