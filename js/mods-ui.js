// mods-ui.js - Interfaz de usuario para el sistema de mods

const { ipcRenderer } = require('electron');
const modManager = require('./mods');

class ModsUI {
  constructor() {
    this.modal = null;
    this.statusBadge = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    this.modal = document.getElementById('mods-modal');
    this.statusBadge = document.getElementById('mods-status-badge');
    
    // Event listeners
    document.getElementById('mods-btn')?.addEventListener('click', () => this.openModal());
    this.statusBadge?.addEventListener('click', () => this.openModal());
    document.getElementById('mods-enabled-toggle')?.addEventListener('change', (e) => this.toggleMods(e.target.checked));
    document.getElementById('scan-mods-btn')?.addEventListener('click', () => this.scanMods());
    document.getElementById('browse-mods-folder-btn')?.addEventListener('click', () => this.browseModsFolder());

    // Cargar estado inicial
    this.loadInitialState();
    
    // Escanear mods automáticamente si está habilitado
    if (modManager.config.modsEnabled && modManager.config.autoDetect) {
      this.scanMods();
    }

    this.initialized = true;
  }

  loadInitialState() {
    const toggle = document.getElementById('mods-enabled-toggle');
    const folderInput = document.getElementById('mods-folder-input');
    
    if (toggle) {
      toggle.checked = modManager.config.modsEnabled;
    }
    
    if (folderInput && modManager.config.modsFolder) {
      folderInput.value = modManager.config.modsFolder;
    }

    // Actualizar badge
    this.updateStatusBadge();

    // Mostrar mods detectados si existen
    if (modManager.config.detectedMods && modManager.config.detectedMods.length > 0) {
      modManager.detectedMods = modManager.config.detectedMods;
      this.displayMods(modManager.config.detectedMods);
      this.displayWarnings();
    }

    // Actualizar última actualización
    if (modManager.config.lastScan) {
      const lastScan = new Date(modManager.config.lastScan);
      document.getElementById('mods-last-scan').textContent = lastScan.toLocaleString('es-ES');
    }
  }

  openModal() {
    if (this.modal) {
      this.modal.classList.remove('hidden');
      this.updateModsList();
    }
  }

  closeModal() {
    if (this.modal) {
      this.modal.classList.add('hidden');
    }
  }

  toggleMods(enabled) {
    modManager.setModsEnabled(enabled);
    this.updateStatusBadge();
    
    if (enabled && modManager.config.autoDetect) {
      this.scanMods();
    }
  }

  async scanMods() {
    const scanBtn = document.getElementById('scan-mods-btn');
    const originalText = scanBtn.textContent;
    
    scanBtn.textContent = '⏳ Escaneando...';
    scanBtn.disabled = true;

    try {
      const mods = await modManager.scanMods();
      
      this.displayMods(mods);
      this.updateStatusBadge();
      this.displayWarnings();
      
      // Actualizar carpeta detectada
      const folderInput = document.getElementById('mods-folder-input');
      if (folderInput && modManager.config.modsFolder) {
        folderInput.value = modManager.config.modsFolder;
      }

      // Actualizar última actualización
      const lastScan = new Date(modManager.config.lastScan);
      document.getElementById('mods-last-scan').textContent = lastScan.toLocaleString('es-ES');

      // Mostrar notificación
      if (mods.length > 0) {
        this.showToast(`✅ ${mods.length} mod(s) detectado(s)`, 'success');
      } else {
        this.showToast('ℹ️ No se encontraron mods', 'info');
      }

    } catch (err) {
      console.error('Error escaneando mods:', err);
      this.showToast('❌ Error escaneando mods', 'error');
    } finally {
      scanBtn.textContent = originalText;
      scanBtn.disabled = false;
    }
  }

  async browseModsFolder() {
    try {
      const result = await ipcRenderer.invoke('select-folder');
      
      if (result) {
        const success = modManager.setModsFolder(result);
        
        if (success) {
          document.getElementById('mods-folder-input').value = result;
          this.showToast('✅ Carpeta configurada', 'success');
          this.scanMods();
        } else {
          this.showToast('❌ Carpeta inválida', 'error');
        }
      }
    } catch (err) {
      console.error('Error seleccionando carpeta:', err);
    }
  }

  displayMods(mods) {
    const modsList = document.getElementById('mods-list');
    const modsCount = document.getElementById('mods-count');
    
    if (!modsList) return;

    modsCount.textContent = mods.length;

    if (mods.length === 0) {
      modsList.innerHTML = `
        <div class="mods-empty">
          <p>No se han detectado mods.</p>
          <p class="mods-hint">Haz clic en "Escanear" para buscar mods instalados.</p>
        </div>
      `;
      return;
    }

    // Agrupar mods por tipo
    const grouped = this.groupModsByType(mods);

    let html = '';

    // Mostrar mods agrupados
    for (const [type, typeMods] of Object.entries(grouped)) {
      if (typeMods.length > 0) {
        html += `<div class="mod-group-header">${this.getTypeIcon(type)} ${this.getTypeName(type)} (${typeMods.length})</div>`;
        html += typeMods.map(mod => this.createModCard(mod)).join('');
      }
    }

    modsList.innerHTML = html;

    // Mostrar modificadores activos
    this.displayActiveModifiers();
  }

  groupModsByType(mods) {
    const groups = {
      boons: [],
      duo: [],
      difficulty: [],
      gameplay: [],
      visual: [],
      framework: [],
      other: []
    };

    for (const mod of mods) {
      const affects = mod.affects || [];
      
      if (affects.includes('duo')) {
        groups.duo.push(mod);
      } else if (affects.includes('boons')) {
        groups.boons.push(mod);
      } else if (affects.includes('difficulty')) {
        groups.difficulty.push(mod);
      } else if (affects.includes('visual') || affects.includes('ui')) {
        groups.visual.push(mod);
      } else if (affects.includes('framework')) {
        groups.framework.push(mod);
      } else if (affects.includes('gameplay') || affects.includes('speed')) {
        groups.gameplay.push(mod);
      } else {
        groups.other.push(mod);
      }
    }

    return groups;
  }

  getTypeIcon(type) {
    const icons = {
      boons: '🎁',
      duo: '⚡',
      difficulty: '🔥',
      gameplay: '🎮',
      visual: '🎨',
      framework: '🔧',
      other: '📦'
    };
    return icons[type] || '📦';
  }

  getTypeName(type) {
    const names = {
      boons: 'Bendiciones',
      duo: 'Dúos',
      difficulty: 'Dificultad',
      gameplay: 'Gameplay',
      visual: 'Visual',
      framework: 'Framework',
      other: 'Otros'
    };
    return names[type] || 'Otros';
  }

  displayActiveModifiers() {
    const modifiers = modManager.getActiveModifiers();
    const modifiersSection = document.getElementById('active-modifiers-section');

    if (!modifiersSection) return;

    if (!modifiers.modsActive) {
      modifiersSection.classList.add('hidden');
      return;
    }

    modifiersSection.classList.remove('hidden');

    let html = '<h4>🎯 Modificadores Activos</h4><div class="modifiers-grid">';

    if (modifiers.boonChoices > 1) {
      html += `
        <div class="modifier-card">
          <div class="modifier-icon">🎁</div>
          <div class="modifier-label">Bendiciones</div>
          <div class="modifier-value">×${modifiers.boonChoices.toFixed(1)}</div>
        </div>
      `;
    }

    if (modifiers.duoProbability > 1) {
      html += `
        <div class="modifier-card">
          <div class="modifier-icon">⚡</div>
          <div class="modifier-label">Prob. Dúos</div>
          <div class="modifier-value">×${modifiers.duoProbability}</div>
        </div>
      `;
    }

    if (modifiers.difficulty !== 1) {
      html += `
        <div class="modifier-card">
          <div class="modifier-icon">🔥</div>
          <div class="modifier-label">Dificultad</div>
          <div class="modifier-value">×${modifiers.difficulty}</div>
        </div>
      `;
    }

    if (modifiers.allKeepsakes) {
      html += `
        <div class="modifier-card">
          <div class="modifier-icon">🔓</div>
          <div class="modifier-label">Recuerdos</div>
          <div class="modifier-value">Todos</div>
        </div>
      `;
    }

    html += '</div>';

    const container = document.getElementById('active-modifiers-content');
    if (container) {
      container.innerHTML = html;
    }
  }

  createModCard(mod) {
    const customClass = mod.custom ? 'mod-custom' : '';
    const badgeClass = mod.custom ? 'mod-custom-badge' : '';
    const badgeText = mod.custom ? 'Personalizado' : 'Conocido';

    const affectTags = (mod.affects || []).map(affect => 
      `<span class="mod-tag tag-${affect}">${affect}</span>`
    ).join('');

    return `
      <div class="mod-item ${customClass}">
        <div class="mod-item-header">
          <span class="mod-name">${mod.name}</span>
          <span class="mod-badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="mod-description">${mod.description}</div>
        <div class="mod-affects">${affectTags}</div>
      </div>
    `;
  }

  displayWarnings() {
    const warnings = modManager.getModWarnings();
    const warningsSection = document.getElementById('mods-warnings-section');
    const warningsList = document.getElementById('mods-warnings-list');

    if (!warningsSection || !warningsList) return;

    if (warnings.length === 0) {
      warningsSection.classList.add('hidden');
      return;
    }

    warningsSection.classList.remove('hidden');
    warningsList.innerHTML = warnings.map(warning => this.createWarningCard(warning)).join('');
  }

  createWarningCard(warning) {
    const modsText = warning.mods ? 
      `<div class="mod-warning-mods">Mods: ${warning.mods.join(', ')}</div>` : '';

    return `
      <div class="mod-warning warning-${warning.type}">
        ${warning.message}
        ${modsText}
      </div>
    `;
  }

  updateStatusBadge() {
    if (!this.statusBadge) return;

    const activeMods = modManager.getActiveMods();
    const stats = modManager.getModStats();

    if (!modManager.config.modsEnabled || activeMods.length === 0) {
      this.statusBadge.className = 'mods-none';
      this.statusBadge.innerHTML = `
        <span class="status-icon">🎮</span>
        <span class="status-text">Sin Mods</span>
      `;
      this.statusBadge.title = 'No hay mods detectados';
      return;
    }

    // Determinar si hay advertencias
    const hasWarnings = stats.byType.boons > 0 || stats.byType.duo > 0;

    if (hasWarnings) {
      this.statusBadge.className = 'mods-warning';
      this.statusBadge.innerHTML = `
        <span class="status-icon">⚠️</span>
        <span class="status-text">${activeMods.length} Mod(s)</span>
      `;
      this.statusBadge.title = 'Mods activos pueden afectar recomendaciones';
    } else {
      this.statusBadge.className = 'mods-active';
      this.statusBadge.innerHTML = `
        <span class="status-icon">✅</span>
        <span class="status-text">${activeMods.length} Mod(s)</span>
      `;
      this.statusBadge.title = `${activeMods.length} mod(s) detectado(s)`;
    }
  }

  updateModsList() {
    const activeMods = modManager.getActiveMods();
    this.displayMods(activeMods);
    this.displayWarnings();
  }

  showToast(message, type = 'info') {
    // Reutilizar el sistema de toast existente si está disponible
    console.log(`[Mods] ${message}`);
    
    // TODO: Integrar con el sistema de toast de vision.js si existe
  }

  // Método para mostrar advertencias en la UI principal
  showModWarningsInMainUI() {
    const warnings = modManager.getModWarnings();
    
    if (warnings.length === 0) return;

    // Buscar un lugar en la UI principal para mostrar advertencias
    const mainContainer = document.querySelector('.main-container');
    if (!mainContainer) return;

    // Crear banner de advertencia si no existe
    let warningBanner = document.getElementById('mods-warning-banner');
    
    if (!warningBanner) {
      warningBanner = document.createElement('div');
      warningBanner.id = 'mods-warning-banner';
      warningBanner.className = 'mods-warning-banner';
      mainContainer.insertBefore(warningBanner, mainContainer.firstChild);
    }

    const mainWarning = warnings.find(w => w.type === 'warning') || warnings[0];
    
    warningBanner.innerHTML = `
      <div class="warning-banner-content">
        <span class="warning-icon">⚠️</span>
        <span class="warning-text">${mainWarning.message}</span>
        <button class="warning-details-btn" onclick="modsUI.openModal()">Ver detalles</button>
      </div>
    `;
  }
}

// Crear instancia global
const modsUI = new ModsUI();

// Funciones globales para el HTML
function closeModsModal() {
  modsUI.closeModal();
}

// Exportar
if (typeof module !== 'undefined' && module.exports) {
  module.exports = modsUI;
}
