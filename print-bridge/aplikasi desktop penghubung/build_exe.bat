@echo off
REM Compile photobooth_print_bridge_gui.py menjadi TimelabPrintBridge.exe
REM Hasil ada di dist\TimelabPrintBridge.exe setelah selesai.

set PYTHON="C:\Program Files\Python312\python.exe"

echo Menginstall pyinstaller ^& pywin32 (jika belum ada)...
%PYTHON% -m pip install --upgrade pyinstaller pywin32

echo.
echo Membangun .exe...
%PYTHON% -m PyInstaller --onefile --noconsole --name "TimelabPrintBridge" ^
  --hidden-import=win32timezone ^
  photobooth_print_bridge_gui.py

echo.
echo Selesai. File .exe ada di dist\TimelabPrintBridge.exe
pause
