const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: 'TAURUS - IT Support Management System',
    backgroundColor: '#1a237e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    show: false,
  });

  // Tentukan URL web UI: jika dev server berjalan di port 3000 gunakan itu,
  // jika tidak gunakan file build statis di ../web/dist/index.html
  const devUrl = 'http://localhost:3000';
  const prodFilePath = path.join(__dirname, '..', 'web', 'dist', 'index.html');

  if (process.env.ELECTRON_DEV === 'true' || !fs.existsSync(prodFilePath)) {
    console.log(`Memuat aplikasi web dari dev server: ${devUrl}`);
    mainWindow.loadURL(devUrl).catch(() => {
      // Jika dev server belum nyala, coba muat file dist
      if (fs.existsSync(prodFilePath)) {
        mainWindow.loadFile(prodFilePath);
      }
    });
  } else {
    console.log(`Memuat aplikasi web dari berkas produksi: ${prodFilePath}`);
    mainWindow.loadFile(prodFilePath);
  }

  // Tampilkan jendela setelah konten selesai dirender agar tidak berkedip putih
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Tangani pembukaan link eksternal di browser default pengguna
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupAppMenu();
}

// Menu Navigasi Aplikasi Desktop
function setupAppMenu() {
  const template = [
    {
      label: 'Aplikasi',
      submenu: [
        {
          label: 'Muat Ulang (Reload)',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.reload(),
        },
        {
          label: 'Paksa Muat Ulang',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow && mainWindow.webContents.reloadIgnoringCache(),
        },
        { type: 'separator' },
        {
          label: 'Keluar',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit(),
        },
      ],
    },
    {
      label: 'Tampilan',
      submenu: [
        { role: 'resetZoom', label: 'Ukuran Normal' },
        { role: 'zoomIn', label: 'Perbesar' },
        { role: 'zoomOut', label: 'Perkecil' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Layar Penuh' },
        {
          label: 'Developer Tools',
          accelerator: 'F12',
          click: () => mainWindow && mainWindow.webContents.toggleDevTools(),
        },
      ],
    },
    {
      label: 'Bantuan',
      submenu: [
        {
          label: 'Tentang TAURUS',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Tentang TAURUS',
              message: 'TAURUS IT Support Management System',
              detail: 'Versi 1.0.0 (Desktop Edition)\nSistem Manajemen Tiket & Log Pekerjaan Teknisi IT Internal.',
              buttons: ['Tutup'],
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
