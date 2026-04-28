const { ipcRenderer } = require('electron');

class ModsTranslatorUI {
  constructor() {
    this.initialized = false;
    this.isRunning = false;
    this.config = {
      modsPath: '',
      translatorPath: '',
      importerPath: '',
      targetLang: 'es',
      pythonPath: 'python'
    };
  }

  async init() {
    if (this.initialized) return;
    await this.loadConfig();
    this.setupPanel();
    this.setupIPCListeners();
    this.initialized = true;
  }

  async loadConfig() {
    try {
      const config = await ipcRenderer.invoke('translator:load-config');
      if (config) this.config = { ...this.config, ...config };
    } catch (err) {
      console.error('Error cargando config del traductor:', err);
    }
  }

  async saveConfig() {
    try {
      await ipcRenderer.invoke('translator:save-config', this.config);
    } catch (err) {
      console.error('Error guardando config:', err);
    }
  }

  setupPanel() {
    const panel = document.getElementById('translator-panel');
    if (!panel) return;

    document.getElementById('translator-scan-btn')?.addEventListener('click', () => this.scanMods());
    document.getElementById('translator-run-btn')?.addEventListener('click', () => this.runTranslator());
    document.getElementById('translator-importer-btn')?.addEventListener('click', () => this.runImporter());
    document.getElementById('translator-open-hades-btn')?.addEventListener('click', () => this.openHades());
    document.getElementById('translator-lang-select')?.addEventListener('change', (e) => {
      this.config.targetLang = e.target.value;
      this.saveConfig();
    });
    document.getElementById('translator-config-btn')?.addEventListener('click', () => this.toggleConfig());
    document.getElementById('translator-browse-mods')?.addEventListener('click', () => this.browsePath('modsPath'));
    document.getElementById('translator-browse-script')?.addEventListener('click', () => this.browsePath('translatorPath'));
    document.getElementById('translator-browse-importer')?.addEventListener('click', () => this.browsePath('importerPath'));

    this.renderConfig();
  }

  setupIPCListeners() {
    ipcRenderer.on('translator:progress', (event, data) => this.onProgress(data));
    ipcRenderer.on('translator:done', (event, data) => this.onDone(data));
  }

  renderConfig() {
    ['modsPath', 'translatorPath', 'importerPath', 'pythonPath'].forEach(field => {
      const el = document.getElementById(`translator-input-${field}`);
      if (el) el.value = this.config[field] || '';
    });
    const langSelect = document.getElementById('translator-lang-select');
    if (langSelect) langSelect.value = this.config.targetLang || 'es';
  }

  toggleConfig() {
    document.getElementById('translator-config-section')?.classList.toggle('hidden');
  }

  async browsePath(field) {
    try {
      let result;
      if (field === 'importerPath' || field === 'translatorPath') {
        result = await ipcRenderer.invoke('select-file', [
          { name: field === 'importerPath' ? 'Ejecutable' : 'Python Script', extensions: field === 'importerPath' ? ['exe'] : ['py'] }
        ]);
      } else {
        result = await ipcRenderer.invoke('select-folder');
      }
      if (result) {
        this.config[field] = result;
        const el = document.getElementById(`translator-input-${field}`);
        if (el) el.value = result;
        await this.saveConfig();
      }
    } catch (err) {
      console.error('Error seleccionando ruta:', err);
    }
  }

  async scanMods() {
    const btn = document.getElementById('translator-scan-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Escaneando...'; }
    try {
      const mods = await ipcRenderer.invoke('translator:scan-mods', this.config.modsPath);
      this.renderModsList(mods);
    } catch (err) {
      this.appendLog(`Error escaneando: ${err.message}`, true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔍 Escanear mods'; }
    }
  }

  renderModsList(mods) {
    const list = document.getElementById('translator-mods-list');
    if (!list) return;
    if (!mods || mods.length === 0) {
      list.innerHTML = '<div class="translator-empty">No se encontraron mods en la carpeta configurada.</div>';
      return;
    }
    list.innerHTML = mods.map(mod => `
      <div class="translator-mod-item">
        <span class="translator-mod-name">${mod.name}</span>
        <span class="translator-mod-status status-${mod.status}">${mod.status}</span>
      </div>
    `).join('');
  }

  async runTranslator() {
    if (this.isRunning) return;
    if (!this.config.modsPath || !this.config.translatorPath) {
      this.appendLog('Error: Configura la carpeta de mods y la ruta del traductor.py', true);
      return;
    }
    this.isRunning = true;
    this.clearLog();
    this.setProgress(0, 'Iniciando...');
    this.setButtonsRunning(true);
    try {
      await ipcRenderer.invoke('translator:run', {
        modsPath: this.config.modsPath,
        translatorPath: this.config.translatorPath,
        targetLang: this.config.targetLang,
        pythonPath: this.config.pythonPath
      });
    } catch (err) {
      this.appendLog(`Error: ${err.message}`, true);
      this.isRunning = false;
      this.setButtonsRunning(false);
    }
  }

  onProgress(data) {
    if (data.line) this.appendLog(data.line, data.isError);
    if (data.percent) this.setProgress(data.percent, data.phaseName || '');
  }

  onDone(data) {
    this.isRunning = false;
    this.setButtonsRunning(false);
    if (data.success) {
      this.setProgress(100, 'Completado');
      this.appendLog('✅ Traducción completada exitosamente.');
      const importerBtn = document.getElementById('translator-importer-btn');
      if (importerBtn) importerBtn.disabled = false;
    } else {
      this.setProgress(0, 'Error');
      this.appendLog(`❌ Error en la traducción (código: ${data.exitCode})`, true);
    }
  }

  async runImporter() {
    if (!this.config.importerPath) {
      this.appendLog('Error: Configura la ruta del Mod Importer.', true);
      return;
    }
    this.appendLog('Ejecutando Mod Importer...');
    const btn = document.getElementById('translator-importer-btn');
    if (btn) btn.disabled = true;
    try {
      const result = await ipcRenderer.invoke('translator:run-importer', this.config.importerPath);
      if (result.success) {
        this.appendLog('✅ Mod Importer ejecutado correctamente.');
        if (result.stdout) this.appendLog(result.stdout);
        const hadesBtn = document.getElementById('translator-open-hades-btn');
        if (hadesBtn) hadesBtn.disabled = false;
      } else {
        this.appendLog(`❌ Mod Importer falló: ${result.stderr || result.error}`, true);
        if (btn) btn.disabled = false;
      }
    } catch (err) {
      this.appendLog(`Error: ${err.message}`, true);
      if (btn) btn.disabled = false;
    }
  }

  async openHades() {
    try {
      const ok = await ipcRenderer.invoke('translator:open-hades');
      if (!ok) this.appendLog('No se encontró Hades. Intentando abrir via Steam...', true);
    } catch (err) {
      this.appendLog(`Error abriendo Hades: ${err.message}`, true);
    }
  }

  appendLog(line, isError = false) {
    const log = document.getElementById('translator-log');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = `log-line${isError ? ' log-error' : ''}`;
    entry.textContent = line;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  clearLog() {
    const log = document.getElementById('translator-log');
    if (log) log.innerHTML = '';
  }

  setProgress(percent, label) {
    const bar = document.getElementById('translator-progress-bar');
    const labelEl = document.getElementById('translator-progress-label');
    if (bar) bar.style.width = `${percent}%`;
    if (labelEl) labelEl.textContent = label || '';
  }

  setButtonsRunning(running) {
    const runBtn = document.getElementById('translator-run-btn');
    const scanBtn = document.getElementById('translator-scan-btn');
    if (runBtn) { runBtn.disabled = running; runBtn.textContent = running ? '⏳ Traduciendo...' : '🌐 Traducir mods'; }
    if (scanBtn) scanBtn.disabled = running;
  }
}

const modsTranslatorUI = new ModsTranslatorUI();
if (typeof module !== 'undefined' && module.exports) module.exports = modsTranslatorUI;
