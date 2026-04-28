const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

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

ipcMain.handle('select-file', async (event, filters) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: filters || [{ name: 'Todos los archivos', extensions: ['*'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }

  return null;
});

// IPC Handlers para el traductor de mods
const CONFIG_PATH = path.join(__dirname, 'mods-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error cargando config:', err);
  }
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('Error guardando config:', err);
    return false;
  }
}

// Verificar si Python está instalado
ipcMain.handle('translator:check-python', async (event, pythonPath) => {
  return new Promise((resolve) => {
    const proc = spawn(pythonPath, ['--version'], { shell: true });
    let found = false;

    proc.stdout.on('data', () => { found = true; });
    proc.stderr.on('data', () => { found = true; });
    proc.on('close', (code) => {
      resolve(found || code === 0);
    });
    proc.on('error', () => {
      resolve(false);
    });

    setTimeout(() => {
      proc.kill();
      resolve(found);
    }, 5000);
  });
});

// Escanear mods
ipcMain.handle('translator:scan-mods', async (event, modsPath) => {
  try {
    if (!fs.existsSync(modsPath)) {
      return [];
    }

    const files = fs.readdirSync(modsPath, { withFileTypes: true });
    const mods = [];

    for (const file of files) {
      if (file.isDirectory()) {
        // Ignorar carpetas de sistema
        const ignoredFolders = ['__folder_managed_by_vortex', '.vortex', '.cache', '.temp'];
        if (ignoredFolders.includes(file.name.toLowerCase())) continue;

        const modPath = path.join(modsPath, file.name);
        const modFiles = fs.readdirSync(modPath);
        const hasLua = modFiles.some(f => f.endsWith('.lua'));

        if (hasLua) {
          const luaFiles = modFiles.filter(f => f.endsWith('.lua'));
          const sjsonFiles = modFiles.filter(f => f.endsWith('.sjson'));

          mods.push({
            name: file.name,
            path: modPath,
            files: [...luaFiles, ...sjsonFiles],
            status: 'pending',
            translated: false
          });
        }
      }
    }

    return mods;
  } catch (err) {
    console.error('Error escaneando mods:', err);
    return [];
  }
});

// Ejecutar traductor
ipcMain.handle('translator:run', async (event, opts) => {
  const { modsPath, translatorPath, targetLang, pythonPath } = opts;

  return new Promise((resolve) => {
    // Verificar que el archivo traductor.py existe
    if (!fs.existsSync(translatorPath)) {
      event.sender.send('translator:progress', {
        phase: 'error',
        line: `Error: No se encontró ${translatorPath}`,
        percent: 0
      });
      resolve(1);
      return;
    }

    // Construir comando
    const args = [translatorPath, '--target', targetLang];
    const cwd = modsPath || process.cwd();

    console.log(`Ejecutando: ${pythonPath} ${args.join(' ')} en ${cwd}`);

    const proc = spawn(pythonPath, args, {
      cwd: cwd,
      shell: true
    });

    let currentPhase = 0;
    const phaseMap = {
      'Fase 0:': { phase: 0, name: 'sanitizing' },
      'Fase 1/3:': { phase: 1, name: 'reading' },
      'Fase 2/3:': { phase: 2, name: 'translating' },
      'Fase 3/3:': { phase: 3, name: 'applying' }
    };

    proc.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          console.log('[Translator]', line);

          // Detectar fase
          let phaseData = { phase: currentPhase, line: line.trim(), percent: 0 };

          for (const [pattern, info] of Object.entries(phaseMap)) {
            if (line.includes(pattern)) {
              currentPhase = info.phase;
              phaseData.phase = info.phase;
              phaseData.phaseName = info.name;
              // Calcular porcentaje aproximado
              phaseData.percent = Math.min(25 + (currentPhase * 25), 100);
              break;
            }
          }

          // Si no cambió de fase, mantener porcentaje basado en líneas procesadas
          if (!phaseData.percent) {
            phaseData.percent = Math.min(10 + (currentPhase * 25), 99);
          }

          event.sender.send('translator:progress', phaseData);
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) {
        console.error('[Translator Error]', line);
        event.sender.send('translator:progress', {
          phase: currentPhase,
          line: `[Error] ${line}`,
          percent: 0,
          isError: true
        });
      }
    });

    proc.on('close', (code) => {
      event.sender.send('translator:done', {
        exitCode: code,
        success: code === 0
      });
      resolve(code);
    });

    proc.on('error', (err) => {
      console.error('Error ejecutando traductor:', err);
      event.sender.send('translator:progress', {
        phase: 'error',
        line: `Error al ejecutar Python: ${err.message}`,
        percent: 0,
        isError: true
      });
      event.sender.send('translator:done', {
        exitCode: 1,
        success: false,
        error: err.message
      });
      resolve(1);
    });
  });
});

// Ejecutar Mod Importer
ipcMain.handle('translator:run-importer', async (event, importerPath) => {
  return new Promise((resolve) => {
    if (!fs.existsSync(importerPath)) {
      resolve({
        success: false,
        error: `No se encontró ${importerPath}`,
        stdout: '',
        stderr: 'Mod Importer no encontrado'
      });
      return;
    }

    const proc = spawn(importerPath, [], { shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        exitCode: code,
        stdout,
        stderr
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
        stdout,
        stderr: err.message
      });
    });
  });
});

// Abrir Hades
ipcMain.handle('translator:open-hades', async () => {
  const hadesPaths = [
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files (x86)', 'Steam', 'steamapps', 'common', 'Hades', 'x64', 'Hades.exe'),
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Steam', 'steamapps', 'common', 'Hades', 'x64', 'Hades.exe'),
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Epic Games', 'Hades', 'Hades.exe')
  ];

  for (const hadesPath of hadesPaths) {
    if (fs.existsSync(hadesPath)) {
      try {
        shell.openPath(hadesPath);
        return true;
      } catch (err) {
        console.error('Error abriendo Hades:', err);
      }
    }
  }

  // Si no encontramos el exe, intentar abrir Steam
  try {
    shell.openExternal('steam://run/1145360'); // App ID de Hades
    return true;
  } catch (err) {
    console.error('Error abriendo via Steam:', err);
    return false;
  }
});

// Cargar configuración del traductor
ipcMain.handle('translator:load-config', async () => {
  const config = loadConfig();
  return config.translator || {
    modsPath: '',
    translatorPath: '',
    importerPath: '',
    targetLang: 'es',
    pythonPath: 'python'
  };
});

// Guardar configuración del traductor
ipcMain.handle('translator:save-config', async (event, translatorConfig) => {
  const config = loadConfig();
  config.translator = translatorConfig;
  return saveConfig(config);
});

// Handler para guardar reportes de diagnóstico
ipcMain.handle('diagnostic:save-report', async (event, reportContent) => {
  const path = require('path');
  const fs = require('fs');
  const os = require('os');

  const reportDir = path.join(os.homedir(), 'AppData', 'Roaming', 'HadesCoach', 'diagnostic-reports');

  try {
    // Crear directorio si no existe
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `diagnostic-${timestamp}.txt`;
    const fullPath = path.join(reportDir, filename);

    // Guardar reporte
    fs.writeFileSync(fullPath, reportContent, 'utf8');

    return { success: true, path: fullPath };
  } catch (err) {
    console.error('Error guardando reporte:', err);
    return { success: false, error: err.message };
  }
});

// Handler para abrir carpeta de reportes
ipcMain.handle('diagnostic:open-reports-folder', async () => {
  const path = require('path');
  const fs = require('fs');
  const os = require('os');
  const { shell } = require('electron');

  const reportDir = path.join(os.homedir(), 'AppData', 'Roaming', 'HadesCoach', 'diagnostic-reports');

  // Crear directorio si no existe
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  shell.openPath(reportDir);
  return true;
});