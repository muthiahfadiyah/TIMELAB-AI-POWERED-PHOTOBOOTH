#!/usr/bin/env python3
"""Timelab Photobooth — Print Bridge (aplikasi desktop Windows)

Jembatan antara browser (website photobooth) dan printer thermal yang
terpasang di Windows. Menerima data cetak lewat HTTP di 127.0.0.1:9100
dan meneruskannya ke printer Windows yang dipilih lewat spooler
(win32print), datatype RAW — byte diteruskan apa adanya ke printer.

Dijalankan sebagai GUI (bukan terminal) supaya terlihat seperti aplikasi
desktop biasa: pilih printer, klik "Jalankan Bridge", lihat status &
log di jendela.

Build ke .exe: lihat build_exe.bat di folder yang sama.
"""
import http.server
import json
import os
import queue
import socketserver
import sys
import threading
import tkinter as tk
from tkinter import scrolledtext, ttk

import win32print

CONFIG_FILENAME = "print_bridge_config.json"
PORT = 9100


def get_config_path() -> str:
    # Simpan config di sebelah .exe (atau .py saat dijalankan langsung),
    # bukan di working directory, supaya konsisten dari mana pun di-double-click.
    base = os.path.dirname(
        sys.executable if getattr(sys, "frozen", False) else os.path.abspath(__file__)
    )
    return os.path.join(base, CONFIG_FILENAME)


def load_config() -> dict:
    path = get_config_path()
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_config(cfg: dict):
    try:
        with open(get_config_path(), "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
    except Exception:
        pass


def list_printers() -> list[str]:
    try:
        return [
            p[2]
            for p in win32print.EnumPrinters(
                win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
            )
        ]
    except Exception:
        return []


def send_to_printer(printer_name: str, data: bytes):
    hPrinter = win32print.OpenPrinter(printer_name)
    try:
        win32print.StartDocPrinter(hPrinter, 1, ("Web Print", None, "RAW"))
        try:
            win32print.StartPagePrinter(hPrinter)
            win32print.WritePrinter(hPrinter, data)
            win32print.EndPagePrinter(hPrinter)
        finally:
            win32print.EndDocPrinter(hPrinter)
    finally:
        win32print.ClosePrinter(hPrinter)


class BridgeState:
    def __init__(self):
        self.printer_name = ""
        self.log_queue: "queue.Queue[str]" = queue.Queue()
        self.httpd: socketserver.TCPServer | None = None

    def log(self, msg: str):
        self.log_queue.put(msg)


state = BridgeState()


def make_handler(state: BridgeState):
    class Handler(http.server.BaseHTTPRequestHandler):
        def _cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self):
            if self.path == "/status":
                ok = state.printer_name in list_printers()
                self.send_response(200 if ok else 503)
                self._cors()
                self.send_header("Content-Type", "text/plain")
                self.end_headers()
                self.wfile.write(
                    b"ok" if ok else f'printer "{state.printer_name}" tidak ditemukan'.encode()
                )
            else:
                self.send_response(404)
                self._cors()
                self.end_headers()

        def do_POST(self):
            if self.path == "/print":
                length = int(self.headers.get("Content-Length", 0))
                data = self.rfile.read(length)
                try:
                    send_to_printer(state.printer_name, data)
                    state.log(f'Cetak berhasil ({len(data)} bytes) -> "{state.printer_name}"')
                    self.send_response(200)
                    self._cors()
                    self.send_header("Content-Type", "text/plain")
                    self.end_headers()
                    self.wfile.write(b"printed")
                except Exception as e:
                    state.log(f"Gagal cetak: {e}")
                    self.send_response(500)
                    self._cors()
                    self.send_header("Content-Type", "text/plain")
                    self.end_headers()
                    self.wfile.write(str(e).encode())
            else:
                self.send_response(404)
                self._cors()
                self.end_headers()

        def log_message(self, fmt, *args):
            state.log("[http] " + (fmt % args))

    return Handler


def run_server(on_error):
    try:
        state.httpd = socketserver.TCPServer(("127.0.0.1", PORT), make_handler(state))
        state.log(f"Bridge jalan di http://127.0.0.1:{PORT}")
        state.httpd.serve_forever()
    except Exception as e:
        on_error(str(e))
        state.httpd = None


class App:
    def __init__(self, root: tk.Tk):
        self.root = root
        root.title("Timelab Photobooth — Print Bridge")
        root.geometry("520x440")
        root.resizable(False, False)

        cfg = load_config()

        frm = ttk.Frame(root, padding=16)
        frm.pack(fill="both", expand=True)

        ttk.Label(frm, text="Printer tujuan:", font=("Segoe UI", 10, "bold")).pack(anchor="w")
        self.printer_var = tk.StringVar(value=cfg.get("printer_name", ""))
        self.printer_combo = ttk.Combobox(
            frm, textvariable=self.printer_var, state="readonly", width=48
        )
        self.printer_combo.pack(fill="x", pady=(2, 8))
        self.refresh_printers()

        ttk.Button(frm, text="Refresh daftar printer", command=self.refresh_printers).pack(
            anchor="w"
        )

        self.status_var = tk.StringVar(value="Bridge belum berjalan")
        self.status_label = ttk.Label(frm, textvariable=self.status_var, foreground="#a33")
        self.status_label.pack(anchor="w", pady=(12, 4))

        btn_frame = ttk.Frame(frm)
        btn_frame.pack(fill="x", pady=(0, 8))
        self.start_btn = ttk.Button(btn_frame, text="Jalankan Bridge", command=self.start)
        self.start_btn.pack(side="left")
        self.stop_btn = ttk.Button(
            btn_frame, text="Hentikan", command=self.stop, state="disabled"
        )
        self.stop_btn.pack(side="left", padx=(8, 0))

        ttk.Label(frm, text="Log:", font=("Segoe UI", 10, "bold")).pack(anchor="w", pady=(8, 2))
        self.log_box = scrolledtext.ScrolledText(
            frm, height=13, state="disabled", font=("Consolas", 9)
        )
        self.log_box.pack(fill="both", expand=True)

        root.protocol("WM_DELETE_WINDOW", self.on_close)
        self.poll_log()

    def refresh_printers(self):
        names = list_printers()
        self.printer_combo["values"] = names
        if not self.printer_var.get() and names:
            self.printer_var.set(names[0])

    def start(self):
        printer = self.printer_var.get()
        if not printer:
            self.append_log("Pilih printer dulu sebelum menjalankan bridge.")
            return
        state.printer_name = printer
        save_config({"printer_name": printer})
        threading.Thread(target=run_server, args=(self.append_log,), daemon=True).start()
        self.status_var.set(f'Berjalan — target printer: "{printer}"')
        self.status_label.configure(foreground="#2a7")
        self.start_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self.printer_combo.configure(state="disabled")

    def stop(self):
        if state.httpd:
            state.httpd.shutdown()
            state.httpd.server_close()
            state.httpd = None
        self.status_var.set("Bridge dihentikan")
        self.status_label.configure(foreground="#a33")
        self.start_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")
        self.printer_combo.configure(state="readonly")

    def append_log(self, msg: str):
        state.log(msg)

    def poll_log(self):
        while not state.log_queue.empty():
            msg = state.log_queue.get_nowait()
            self.log_box.configure(state="normal")
            self.log_box.insert("end", msg + "\n")
            self.log_box.see("end")
            self.log_box.configure(state="disabled")
        self.root.after(200, self.poll_log)

    def on_close(self):
        self.stop()
        self.root.destroy()


def main():
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
