/**
 * HADES BUILD COACH - Módulo UI
 * Funciones de interfaz, modo compacto, tabs, coach y ayuda
 */

const { AppState } = require('./state');
const { saveState } = require('./storage');
const { iniciarNuevaRun, terminarRun, actualizarTrackerUI, renderHistorial, renderChecklist } = require('./tracker');
const { generateOptimalBuild, findSynergy, generarRutaDeRecuerdos, displayRunPlanner, renderMartillos } = require('./engine');

// Referencia al DOM (se inyecta desde app.js)
let DOM = {};
function setDOM(domRef) { DOM = domRef; }

// ==================== FUNCIONES DE RESET ====================

function resetAspectSelector() {
    DOM.aspectSelect.innerHTML = '';
    DOM.aspectSelect.disabled = true;
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Primero selecciona un arma...';
    DOM.aspectSelect.appendChild(defaultOption);
}

function resetSelectedInfo() {
    DOM.selectedInfo.innerHTML = '<p class="placeholder-text">Selecciona un aspecto para ver detalles</p>';
}

function resetLaboratory() {
    AppState.aspectoSeleccionado = null;
    DOM.statusAspect.textContent = 'Ninguno';
    
    DOM.synergyPlaceholder.classList.remove('hidden');
    DOM.synergyCard.classList.add('hidden');

    const extras = document.getElementById('extra-duos-container');
    if (extras) extras.remove();
    
    DOM.optimalPlaceholder.classList.remove('hidden');
    DOM.optimalContent.classList.add('hidden');
    DOM.recommendedGods.innerHTML = '';

    if (DOM.martillosSection) DOM.martillosSection.classList.add('hidden');
    if (DOM.martillosList) DOM.martillosList.innerHTML = '';
}

function resetRunPlanner() {
    DOM.runPlannerPlaceholder.classList.remove('hidden');
    DOM.runPlannerContent.classList.add('hidden');
    DOM.loadingSpinner.classList.add('hidden');
    
    [DOM.keepsakeTartarus, DOM.keepsakeAsphodel, DOM.keepsakeElysium, DOM.keepsakeStyx].forEach(el => {
        el.innerHTML = '';
    });
}

// ==================== DISPLAY DE INFORMACIÓN ====================

function displaySelectedAspectInfo(aspecto) {
    DOM.selectedInfo.innerHTML = `
        <div class="weapon-details">
            <h3>${AppState.armaSeleccionada.nombre}</h3>
            <p class="aspect-name">${aspecto.nombre}</p>
            <div class="detail-row">
                <span class="detail-label">Bono: </span>
                <span>${aspecto.bono}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Estilo: </span>
                <span>${aspecto.estilo_juego}</span>
            </div>
        </div>
    `;
}

function updateBuildStatus(aspecto) {
    const armaNombre = AppState.armaSeleccionada.nombre.split('(')[0].trim();
    DOM.statusAspect.textContent = `${armaNombre} - ${aspecto.nombre}`;
}

function showRunPlannerLoading() {
    DOM.runPlannerPlaceholder.classList.add('hidden');
    DOM.runPlannerContent.classList.remove('hidden');
    DOM.loadingSpinner.classList.remove('hidden');
}

function showErrorToUser(message) {
    const errorHTML = `<p class="placeholder-text" style="color: #ff4444;">${message}</p>`;
    DOM.recommendedGods.innerHTML = errorHTML;
    DOM.runPlannerPlaceholder.innerHTML = errorHTML;
}

// ==================== POBLAR SELECTORES ====================

function populateWeaponSelect() {
    while (DOM.weaponSelect.options.length > 1) {
        DOM.weaponSelect.remove(1);
    }
    
    AppState.armas.forEach(arma => {
        const option = document.createElement('option');
        option.value = arma.id;
        option.textContent = arma.nombre;
        DOM.weaponSelect.appendChild(option);
    });
    
    console.log(`✓ Cargadas ${AppState.armas.length} armas`);
}

function populateAspectSelector(arma) {
    DOM.aspectSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Selecciona un aspecto...';
    DOM.aspectSelect.appendChild(defaultOption);
    
    arma.aspectos.forEach((aspecto, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = aspecto.nombre;
        DOM.aspectSelect.appendChild(option);
    });
    
    DOM.aspectSelect.disabled = false;
}

// ==================== MANEJADORES DE EVENTOS ====================

function handleWeaponChange(event) {
    const weaponId = event.target.value;
    
    resetAspectSelector();
    resetSelectedInfo();
    resetLaboratory();
    resetRunPlanner();
    
    if (!weaponId) {
        AppState.armaSeleccionada = null;
        return;
    }
    
    const arma = AppState.armas.find(a => a.id === weaponId);
    if (!arma) {
        console.error(`Arma no encontrada: ${weaponId}`);
        return;
    }
    
    AppState.armaSeleccionada = arma;
    populateAspectSelector(arma);
    saveState();
    
    console.log(`🏹 Arma seleccionada: ${arma.nombre}`);
}

async function handleAspectChange(event) {
    const aspectIndex = event.target.value;
    
    if (!aspectIndex || !AppState.armaSeleccionada) {
        resetSelectedInfo();
        resetLaboratory();
        resetRunPlanner();
        return;
    }
    
    const aspecto = AppState.armaSeleccionada.aspectos[aspectIndex];
    AppState.aspectoSeleccionado = aspecto;
    
    saveState();
    
    displaySelectedAspectInfo(aspecto);
    updateBuildStatus(aspecto);
    showRunPlannerLoading();
    
    await delay(500);
    
    generateOptimalBuild(aspecto);
    findSynergy(aspecto);
    renderMartillos(aspecto);
    
    const ruta = generarRutaDeRecuerdos(aspecto);
    displayRunPlanner(ruta);

    actualizarModoCompacto();
    
    console.log(`⚔️ Aspecto: ${aspecto.nombre}`);
    console.log(`📋 Dioses recomendados:`, aspecto.dioses_recomendados);
}

function handleCoachToggle(event) {
    AppState.coachMode = event.target.checked ? 'heat' : 'farm';
    toggleCoachMode();
    saveState();
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== MODO COACH ====================

function toggleCoachMode() {
    const isHeat = AppState.coachMode === 'heat';
    
    DOM.modeLabels.forEach(label => label.classList.remove('active'));
    const activeLabel = isHeat 
        ? document.querySelector('.mode-heat')
        : document.querySelector('.mode-farm');
    if (activeLabel) activeLabel.classList.add('active');
    
    DOM.farmMode.classList.toggle('hidden', isHeat);
    DOM.heatMode.classList.toggle('hidden', !isHeat);
    
    console.log(`🎯 Modo Coach: ${isHeat ? 'High Heat' : 'Farmeo'}`);
}

// ==================== MODO COMPACTO ====================

function toggleModoCompacto() {
    AppState.modoCompacto = !AppState.modoCompacto;
    aplicarModoCompacto();
    saveState();
}

function aplicarModoCompacto() {
    const body = document.body;
    const compact = DOM.compactOverlay;
    
    if (AppState.modoCompacto) {
        body.classList.add('compact-mode');
        compact.classList.remove('hidden');
        actualizarModoCompacto();
    } else {
        body.classList.remove('compact-mode');
        compact.classList.add('hidden');
    }
}

function actualizarModoCompacto() {
    if (!AppState.modoCompacto || !DOM.compactOverlay) return;
    if (!AppState.aspectoSeleccionado || !AppState.armaSeleccionada) {
        DOM.compactNextGoal.textContent = 'Selecciona un aspecto';
        DOM.compactKeepsake.textContent = '—';
        DOM.compactDuo.textContent = '—';
        return;
    }

    const biomaActual = AppState.runActiva?.biomaActual || 'tartarus';
    const ruta = generarRutaDeRecuerdos(AppState.aspectoSeleccionado);
    const biomaData = ruta[biomaActual];

    const biomaIcons = {
        tartarus: '🔥 Tártaro',
        asphodel: '🌾 Asfódelos',
        elysium: '⚔️ Elíseo',
        styx: '❄️ Estigia'
    };
    DOM.compactBiome.textContent = biomaIcons[biomaActual] || biomaActual;

    if (biomaData) {
        DOM.compactKeepsake.textContent = `${biomaData.recuerdo.icono || '🎁'} ${biomaData.recuerdo.nombre}`;
        DOM.compactNextGoal.textContent = biomaData.objetivo;
    }

    const diosesIds = AppState.aspectoSeleccionado.dioses_recomendados || [];
    if (diosesIds.length >= 2) {
        const dios1 = AppState.dioses.find(d => d.id === diosesIds[0]);
        const dios2 = AppState.dioses.find(d => d.id === diosesIds[1]);
        if (dios1 && dios2) {
            const duo = dios1.duos?.find(d => d.con_dios === dios2.id) ||
                        dios2.duos?.find(d => d.con_dios === dios1.id);
            if (duo) {
                DOM.compactDuo.textContent = duo.nombre_duo;
            } else {
                DOM.compactDuo.textContent = '—';
            }
        }
    } else {
        DOM.compactDuo.textContent = '—';
    }

    document.querySelectorAll('.compact-biome-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.bioma === biomaActual);
    });

    const compactProgress = document.getElementById('compact-progress');
    if (compactProgress && AppState.runActiva) {
        const prioridades = AppState.aspectoSeleccionado.prioridad_bendiciones || {};
        const obtenidas = AppState.runActiva.bendicionesObtenidas || {};
        let totalPrioridades = 0;
        let totalObtenidas = 0;
        diosesIds.forEach(diosId => {
            const prioridadesDios = prioridades[diosId] || [];
            const obtenidasDios = obtenidas[diosId] || [];
            totalPrioridades += prioridadesDios.length;
            totalObtenidas += prioridadesDios.filter(p => obtenidasDios.includes(p)).length;
        });
        compactProgress.textContent = `Bendiciones: ${totalObtenidas}/${totalPrioridades}`;
    }
}

// ==================== SISTEMA DE TABS ====================

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    if (!tabBtns.length) return;

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const panels = ['lab', 'tracker', 'historial', 'ayuda'];
            panels.forEach(id => {
                const el = document.getElementById(`tab-${id}`);
                if (!el) return;
                el.classList.toggle('hidden', id !== target);
            });

            if (target === 'historial') renderHistorial();
            if (target === 'ayuda') renderAyuda();
        });
    });

    console.log('✓ Tabs configurados');
}

// ==================== GUÍA DE USO ====================

function renderAyuda() {
    const panel = document.getElementById('ayuda-panel');
    if (!panel) return;

    const SECCIONES_AYUDA = [
        {
            icono: '🚀',
            titulo: 'Inicio rápido',
            tipo: 'pasos',
            items: [
                { n: '1', texto: 'Selecciona tu <strong>arma</strong> en el panel izquierdo.' },
                { n: '2', texto: 'Elige el <strong>aspecto</strong> que estás usando en esa run.' },
                { n: '3', texto: 'El coach genera automáticamente: build óptima, sinergias, martillos y ruta de recuerdos.' },
                { n: '4', texto: 'Presiona <kbd>F2</kbd> para registrar que empezaste la run.' },
                { n: '5', texto: 'Usa <kbd>F1</kbd> para cambiar al <strong>modo compacto</strong> mientras juegas.' },
                { n: '6', texto: 'Al terminar, presiona <kbd>F3</kbd> (victoria) o <kbd>F4</kbd> (derrota).' }
            ]
        },
        {
            icono: '⌨️',
            titulo: 'Atajos de teclado',
            tipo: 'hotkeys',
            items: [
                { tecla: 'F1', accion: 'Modo compacto', desc: 'Oculta el panel completo y muestra solo el overlay mínimo.' },
                { tecla: 'F2', accion: 'Nueva run', desc: 'Registra el inicio de una run con el arma/aspecto seleccionado.' },
                { tecla: 'F3', accion: 'Victoria', desc: 'Marca la run activa como ganada y la guarda en el historial.' },
                { tecla: 'F4', accion: 'Derrota', desc: 'Marca la run activa como perdida y la guarda en el historial.' }
            ]
        },
        {
            icono: '⚗️',
            titulo: 'Laboratorio de Sinergias',
            tipo: 'descripcion',
            parrafos: ['El panel principal muestra tres secciones que se generan al seleccionar un aspecto:'],
            items: [
                { label: 'Sinergia Clave', texto: 'Muestra <strong>todos los dúos posibles</strong> entre los dioses recomendados.' },
                { label: 'Build Óptima', texto: 'Tarjetas con las bendiciones de cada dios. Las prioritarias se marcan con ⭐.' },
                { label: 'Ruta de la Huida', texto: 'Timeline de 4 biomas con el recuerdo recomendado para cada uno.' }
            ]
        },
        {
            icono: '✅',
            titulo: 'Checklist de Bendiciones',
            tipo: 'descripcion',
            parrafos: ['Durante una run activa, aparece un checklist con las bendiciones prioritarias de tu build.'],
            items: [
                { label: 'Activación', texto: 'El checklist aparece automáticamente al iniciar una run con <kbd>F2</kbd>.' },
                { label: 'Marcar bendición', texto: 'Haz clic en cualquier bendición para marcarla como obtenida.' },
                { label: 'Sincronización', texto: 'El checklist se actualiza en tiempo real con el modo compacto.' }
            ]
        },
        {
            icono: '📊',
            titulo: 'Historial de Runs',
            tipo: 'descripcion',
            parrafos: ['Guarda hasta 50 runs. Muestra estadísticas globales y por arma.'],
            items: [
                { label: 'Winrate global', texto: 'Porcentaje de victorias sobre el total de runs registradas.' },
                { label: 'Winrate por arma', texto: 'Porcentaje de victorias para cada arma.' },
                { label: 'Lista de runs', texto: 'Últimas 20 runs con arma, aspecto, fecha y duración.' }
            ]
        }
    ];

    panel.innerHTML = `
        <div class="ayuda-header">
            <h2>📖 Cómo usar Hades Build Coach</h2>
            <p class="ayuda-version">v3.0 · Actualizado automáticamente</p>
        </div>
        ${SECCIONES_AYUDA.map(s => renderSeccionAyuda(s)).join('')}
    `;
}

function renderSeccionAyuda(seccion) {
    const header = `
        <div class="ayuda-seccion">
            <h3 class="ayuda-seccion-titulo">
                <span class="ayuda-icono">${seccion.icono}</span>
                ${seccion.titulo}
            </h3>
    `;
    const footer = `</div>`;

    let cuerpo = '';

    if (seccion.parrafos) {
        cuerpo += seccion.parrafos.map(p => `<p class="ayuda-parrafo">${p}</p>`).join('');
    }

    if (seccion.tipo === 'pasos') {
        cuerpo += `<ol class="ayuda-pasos">
            ${seccion.items.map(i => `
                <li class="ayuda-paso">
                    <span class="paso-num">${i.n}</span>
                    <span>${i.texto}</span>
                </li>
            `).join('')}
        </ol>`;
    } else if (seccion.tipo === 'hotkeys') {
        cuerpo += `<div class="ayuda-hotkeys">
            ${seccion.items.map(i => `
                <div class="hotkey-row">
                    <kbd class="hotkey-key">${i.tecla}</kbd>
                    <div class="hotkey-info">
                        <span class="hotkey-accion">${i.accion}</span>
                        <span class="hotkey-desc">${i.desc}</span>
                    </div>
                </div>
            `).join('')}
        </div>`;
    } else if (seccion.tipo === 'descripcion') {
        cuerpo += `<ul class="ayuda-lista">
            ${seccion.items.map(i => `
                <li class="ayuda-item">
                    <span class="ayuda-label">${i.label}</span>
                    <span class="ayuda-item-desc">${i.texto}</span>
                </li>
            `).join('')}
        </ul>`;
    }

    return header + cuerpo + footer;
}

// ==================== HOTKEYS ====================

function setupHotkeys() {
    document.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

        switch (e.key) {
            case 'F1':
                e.preventDefault();
                toggleModoCompacto();
                break;
            case 'F2':
                e.preventDefault();
                if (AppState.aspectoSeleccionado) iniciarNuevaRun();
                break;
            case 'F3':
                e.preventDefault();
                if (AppState.runActiva) terminarRun('victoria');
                break;
            case 'F4':
                e.preventDefault();
                if (AppState.runActiva) terminarRun('derrota');
                break;
        }
    });
    console.log('✓ Hotkeys configurados (F1=Compacto, F2=Nueva Run, F3=Victoria, F4=Derrota)');
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    DOM.weaponSelect.addEventListener('change', handleWeaponChange);
    DOM.aspectSelect.addEventListener('change', handleAspectChange);
    DOM.coachToggle.addEventListener('change', handleCoachToggle);

    if (DOM.btnNuevaRun) DOM.btnNuevaRun.addEventListener('click', iniciarNuevaRun);
    if (DOM.btnVictoria) DOM.btnVictoria.addEventListener('click', () => terminarRun('victoria'));
    if (DOM.btnDerrota) DOM.btnDerrota.addEventListener('click', () => terminarRun('derrota'));

    document.querySelectorAll('.biome-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bioma = btn.dataset.bioma;
            if (AppState.runActiva) {
                AppState.runActiva.biomaActual = bioma;
                saveState();
                actualizarTrackerUI();
                actualizarModoCompacto();
            }
        });
    });

    document.querySelectorAll('.compact-biome-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const bioma = btn.dataset.bioma;
            if (!AppState.runActiva) {
                AppState.runActiva = {
                    armaId: AppState.armaSeleccionada?.id || null,
                    armaNombre: AppState.armaSeleccionada?.nombre || '',
                    aspectoNombre: AppState.aspectoSeleccionado?.nombre || '',
                    aspectoIndex: AppState.armaSeleccionada && AppState.aspectoSeleccionado
                        ? AppState.armaSeleccionada.aspectos.indexOf(AppState.aspectoSeleccionado)
                        : 0,
                    biomaActual: bioma,
                    inicio: Date.now(),
                    resultado: null
                };
            } else {
                AppState.runActiva.biomaActual = bioma;
            }
            saveState();
            actualizarTrackerUI();
            actualizarModoCompacto();
        });
    });

    console.log('✓ Event listeners configurados');
}

module.exports = {
    setDOM,
    resetAspectSelector,
    resetSelectedInfo,
    resetLaboratory,
    resetRunPlanner,
    displaySelectedAspectInfo,
    updateBuildStatus,
    showRunPlannerLoading,
    showErrorToUser,
    populateWeaponSelect,
    populateAspectSelector,
    handleWeaponChange,
    handleAspectChange,
    handleCoachToggle,
    toggleCoachMode,
    toggleModoCompacto,
    aplicarModoCompacto,
    actualizarModoCompacto,
    setupTabs,
    renderAyuda,
    setupHotkeys,
    setupEventListeners
};
