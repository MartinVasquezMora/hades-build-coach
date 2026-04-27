/**
 * HADES BUILD COACH - Tracker de Runs
 * Módulo que maneja el tracker de run activa, historial y checklist de bendiciones
 */

const { AppState } = require('./state');
const { saveState, saveHistorial } = require('./storage');

// DOM se inyecta desde ui.js al inicializar
let DOM = {};
function setDOM(domRef) { DOM = domRef; }

// ==================== TRACKER DE RUN ACTIVA ====================

function iniciarNuevaRun() {
    if (!AppState.armaSeleccionada || !AppState.aspectoSeleccionado) {
        alert('Selecciona un arma y aspecto antes de iniciar una run.');
        return;
    }

    // Inicializar bendicionesObtenidas con cada dios recomendado
    const bendicionesObtenidas = {};
    const diosesRecomendados = AppState.aspectoSeleccionado.dioses_recomendados || [];
    diosesRecomendados.forEach(diosId => {
        bendicionesObtenidas[diosId] = [];
    });

    AppState.runActiva = {
        armaId: AppState.armaSeleccionada.id,
        armaNombre: AppState.armaSeleccionada.nombre,
        aspectoNombre: AppState.aspectoSeleccionado.nombre,
        aspectoIndex: AppState.armaSeleccionada.aspectos.indexOf(AppState.aspectoSeleccionado),
        biomaActual: 'tartarus',
        inicio: Date.now(),
        resultado: null,
        bendicionesObtenidas: bendicionesObtenidas
    };

    saveState();
    actualizarTrackerUI();
    // actualizarModoCompacto se llama desde ui.js
    console.log('🏃 Nueva run iniciada:', AppState.runActiva);
}

function terminarRun(resultado) {
    if (!AppState.runActiva) return;

    AppState.runActiva.resultado = resultado;
    AppState.runActiva.fin = Date.now();
    AppState.runActiva.duracion = Math.round((AppState.runActiva.fin - AppState.runActiva.inicio) / 1000 / 60); // minutos

    // Guardar en historial
    AppState.historial.unshift({ ...AppState.runActiva });
    if (AppState.historial.length > 50) AppState.historial.pop(); // Máximo 50 runs
    saveHistorial();

    AppState.runActiva = null;
    saveState();
    actualizarTrackerUI();
    renderHistorial();
    // actualizarModoCompacto se llama desde ui.js

    const emoji = resultado === 'victoria' ? '🏆' : '💀';
    console.log(`${emoji} Run terminada: ${resultado}`);
}

function actualizarTrackerUI() {
    if (!DOM.runTrackerPanel) return;

    const run = AppState.runActiva;

    if (!run) {
        if (DOM.runStatusText) DOM.runStatusText.textContent = 'Sin run activa';
        if (DOM.btnVictoria) DOM.btnVictoria.disabled = true;
        if (DOM.btnDerrota) DOM.btnDerrota.disabled = true;
        document.querySelectorAll('.biome-btn').forEach(b => b.classList.remove('active'));
        renderChecklist(); // Limpiar checklist
        return;
    }

    if (DOM.runStatusText) {
        const mins = Math.round((Date.now() - run.inicio) / 1000 / 60);
        DOM.runStatusText.textContent = `${run.armaNombre.split('(')[0].trim()} — ${run.aspectoNombre} (${mins}m)`;
    }

    if (DOM.btnVictoria) DOM.btnVictoria.disabled = false;
    if (DOM.btnDerrota) DOM.btnDerrota.disabled = false;

    // Marcar bioma activo
    document.querySelectorAll('.biome-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.bioma === run.biomaActual);
    });

    // Renderizar checklist de bendiciones
    renderChecklist();
}

// ==================== CHECKLIST DE BENDICIONES ====================

/**
 * Toggle una bendición en el checklist de la run activa
 */
function toggleBendicion(diosId, tipoBendicion) {
    if (!AppState.runActiva) return;
    if (!AppState.runActiva.bendicionesObtenidas[diosId]) {
        AppState.runActiva.bendicionesObtenidas[diosId] = [];
    }
    const arr = AppState.runActiva.bendicionesObtenidas[diosId];
    const idx = arr.indexOf(tipoBendicion);
    if (idx === -1) arr.push(tipoBendicion);
    else arr.splice(idx, 1);
    saveState();
    renderChecklist();
    // actualizarModoCompacto se llama desde ui.js
}

/**
 * Renderiza el checklist de bendiciones prioritarias para la run activa
 */
function renderChecklist() {
    const container = document.getElementById('checklist-container');
    if (!container) return;

    if (!AppState.runActiva || !AppState.aspectoSeleccionado) {
        container.innerHTML = '<p class="placeholder-text">Inicia una run para activar el checklist</p>';
        return;
    }

    const diosesIds = AppState.aspectoSeleccionado.dioses_recomendados || [];
    const prioridades = AppState.aspectoSeleccionado.prioridad_bendiciones || {};
    const obtenidas = AppState.runActiva.bendicionesObtenidas || {};

    if (diosesIds.length === 0) {
        container.innerHTML = '<p class="placeholder-text">Este aspecto no tiene dioses recomendados</p>';
        return;
    }

    let html = '';

    diosesIds.forEach(diosId => {
        const dios = AppState.dioses.find(d => d.id === diosId);
        if (!dios) return;

        const prioridadesDios = prioridades[diosId] || [];
        if (prioridadesDios.length === 0) return;

        const obtenidasDios = obtenidas[diosId] || [];

        html += `<div class="checklist-god-section">`;
        html += `<span class="checklist-god-name" style="color: ${dios.color_tema}">${dios.nombre}</span>`;

        prioridadesDios.forEach(tipo => {
            const isChecked = obtenidasDios.includes(tipo);
            const tipoLabel = tipo.charAt(0).toUpperCase() + tipo.slice(1);
            html += `
                <div class="check-item ${isChecked ? 'check-done' : ''}" 
                     onclick="toggleBendicion('${diosId}', '${tipo}')"
                     style="border-left: 2px solid ${dios.color_tema}">
                    ${tipoLabel}
                </div>
            `;
        });

        html += `</div>`;
    });

    container.innerHTML = html || '<p class="placeholder-text">No hay bendiciones prioritarias definidas</p>';
}

// ==================== HISTORIAL DE RUNS ====================

function renderHistorial() {
    if (!DOM.historialList) return;

    if (AppState.historial.length === 0) {
        DOM.historialList.innerHTML = '<p class="placeholder-text">Aún no hay runs registradas. Usa F2 para iniciar.</p>';
        if (DOM.historialStats) DOM.historialStats.innerHTML = '';
        return;
    }

    // Estadísticas
    const total = AppState.historial.length;
    const victorias = AppState.historial.filter(r => r.resultado === 'victoria').length;
    const winrate = total > 0 ? Math.round((victorias / total) * 100) : 0;

    // Winrate por arma
    const porArma = {};
    AppState.historial.forEach(r => {
        if (!porArma[r.armaId]) porArma[r.armaId] = { total: 0, victorias: 0, nombre: r.armaNombre?.split('(')[0].trim() || r.armaId };
        porArma[r.armaId].total++;
        if (r.resultado === 'victoria') porArma[r.armaId].victorias++;
    });

    if (DOM.historialStats) {
        const armaStats = Object.values(porArma)
            .sort((a, b) => (b.victorias / b.total) - (a.victorias / a.total))
            .map(a => `<span class="stat-arma">${a.nombre}: ${Math.round((a.victorias / a.total) * 100)}%</span>`)
            .join('');

        DOM.historialStats.innerHTML = `
            <div class="stats-row">
                <span class="stat-item">Total: <strong>${total}</strong></span>
                <span class="stat-item">Victorias: <strong>${victorias}</strong></span>
                <span class="stat-item">Winrate: <strong style="color:${winrate >= 50 ? '#88E83D' : '#b22222'}">${winrate}%</strong></span>
            </div>
            <div class="stats-armas">${armaStats}</div>
        `;
    }

    // Lista de runs (últimas 20)
    DOM.historialList.innerHTML = '';
    AppState.historial.slice(0, 20).forEach(run => {
        const item = document.createElement('div');
        item.className = `historial-item resultado-${run.resultado}`;
        const emoji = run.resultado === 'victoria' ? '🏆' : '💀';
        const fecha = new Date(run.inicio).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        const duracion = run.duracion ? `${run.duracion}m` : '?m';

        item.innerHTML = `
            <span class="historial-emoji">${emoji}</span>
            <div class="historial-info">
                <span class="historial-build">${run.armaNombre?.split('(')[0].trim() || run.armaId} — ${run.aspectoNombre}</span>
                <span class="historial-meta">${fecha} · ${duracion}</span>
            </div>
        `;
        DOM.historialList.appendChild(item);
    });
}

module.exports = {
    setDOM,
    iniciarNuevaRun,
    terminarRun,
    actualizarTrackerUI,
    toggleBendicion,
    renderChecklist,
    renderHistorial
};