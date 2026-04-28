const { ipcRenderer } = require('electron');

class DiagnosticUI {
  constructor() {
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    document.getElementById('diagnostic-btn')?.addEventListener('click', () => this.openPanel());
    this.initialized = true;
  }

  async runSilentCheck() {
    try {
      const pythonOk = await ipcRenderer.invoke('translator:check-python', 'python');
      if (!pythonOk) {
        console.warn('[Diagnostic] Python no encontrado. El traductor de mods no funcionará.');
        const badge = document.getElementById('diagnostic-badge');
        if (badge) {
          badge.textContent = '⚠️ Python';
          badge.classList.remove('hidden');
          badge.title = 'Python no encontrado. El traductor de mods no funcionará.';
        }
      }
    } catch (err) {
      console.error('[Diagnostic] Error en check silencioso:', err);
    }
  }

  openPanel() {
    document.getElementById('diagnostic-panel')?.classList.toggle('hidden');
  }

  async saveReport(content) {
    try {
      return await ipcRenderer.invoke('diagnostic:save-report', content);
    } catch (err) {
      console.error('Error guardando reporte:', err);
      return { success: false };
    }
  }
}

const diagnosticUI = new DiagnosticUI();
if (typeof module !== 'undefined' && module.exports) module.exports = diagnosticUI;
