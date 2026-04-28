const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow () {
  // Configuramos la ventana tipo Overlay
  const win = new BrowserWindow({
    width: 350,        // Un ancho cómodo para un panel lateral
    height: 800,       // Alto de la ventana
    x: 0,              // Posición (0 = pegado al borde izquierdo de tu pantalla)
    y: 50,             // Un poco más abajo del borde superior
    transparent: true, // ¡CRÍTICO! Hace que el fondo de la ventana sea transparente
    frame: false,      // Quita la barra superior (minimizar, cerrar, etc.)
    alwaysOnTop: true, // ¡CRÍTICO! Mantiene la app por encima de Hades
    resizable: true,   // Permite redimensionar la ventana
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Cargamos tu archivo HTML principal
  win.loadFile('index.html');

  // Opcional: Si quieres que los clics traspasen la app hacia el juego, descomenta la siguiente línea:
  // win.setIgnoreMouseEvents(true); 
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

// IPC Handlers para el sistema de mods
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  
  return null;
});