/**
 * HADES BUILD COACH v3.0 - Entry Point
 * Aplicación modularizada con arquitectura Node.js require()
 * 
 * Módulos:
 * - state.js: Estado global y constantes
 * - storage.js: Persistencia localStorage
 * - vision.js: Cliente WebSocket OCR
 * - engine.js: Motor de recomendaciones
 * - tracker.js: Tracker de runs y checklist
 * - ui.js: Interfaz y controles
 */

// ==================== IMPORTS ====================
const { AppState } = require('./js/state');
const { saveState, loadHistorial, restoreState } = require('./js/storage');
const { VisionClient, setupElectronControls } = require('./js/vision');
const { setDOM: setEngineDOM } = require('./js/engine');
const { setDOM: setTrackerDOM, toggleBendicion } = require('./js/tracker');
const { 
    setDOM: setUIDOM,
    populateWeaponSelect,
    setupEventListeners,
    setupHotkeys,
    setupTabs,
    renderHistorial,
    renderAyuda,
    showErrorToUser,
    toggleModoCompacto
} = require('./js/ui');

// ==================== DOM (lazy init) ====================
let DOM = {};

function initDOM() {
    DOM = {
        weaponSelect: document.getElementById('weapon-select'),
        aspectSelect: document.getElementById('aspect-select'),
        selectedInfo: document.getElementById('selected-info'),
        statusAspect: document.getElementById('status-aspect'),

        synergyPlaceholder: document.getElementById('synergy-placeholder'),
        synergyCard: document.getElementById('synergy-card'),
        duoGod1: document.getElementById('duo-god-1'),
        duoGod2: document.getElementById('duo-god-2'),
        duoName: document.getElementById('duo-name'),
        duoEffect: document.getElementById('duo-effect'),

        optimalPlaceholder: document.getElementById('optimal-placeholder'),
        optimalContent: document.getElementById('optimal-content'),
        recommendedGods: document.getElementById('recommended-gods'),

        runPlannerPlaceholder: document.getElementById('run-planner-placeholder'),
        runPlannerContent: document.getElementById('run-planner-content'),
        loadingSpinner: document.getElementById('loading-spinner'),
        strategyText: document.getElementById('strategy-text'),

        visionStatusBadge: document.getElementById('vision-status-badge'),
        visionToast: document.getElementById('vision-toast'),

        keepsakeTartarus: document.getElementById('keepsake-tartarus'),
        keepsakeAsphodel: document.getElementById('keepsake-asphodel'),
        keepsakeElysium: document.getElementById('keepsake-elysium'),
        keepsakeStyx: document.getElementById('keepsake-styx'),

        coachToggle: document.getElementById('coach-toggle'),
        farmMode: document.getElementById('farm-mode'),
        heatMode: document.getElementById('heat-mode'),
        modeLabels: document.querySelectorAll('.mode-label'),

        compactOverlay: document.getElementById('compact-overlay'),
        compactBiome: document.getElementById('compact-biome'),
        compactKeepsake: document.getElementById('compact-keepsake'),
        compactNextGoal: document.getElementById('compact-next-goal'),
        compactDuo: document.getElementById('compact-duo'),

        runTrackerPanel: document.getElementById('run-tracker-panel'),
        runBiomeButtons: document.querySelectorAll('.biome-btn'),
        runStatusText: document.getElementById('run-status-text'),
        btnNuevaRun: document.getElementById('btn-nueva-run'),
        btnVictoria: document.getElementById('btn-victoria'),
        btnDerrota: document.getElementById('btn-derrota'),

        historialPanel: document.getElementById('historial-panel'),
        historialList: document.getElementById('historial-list'),
        historialStats: document.getElementById('historial-stats'),

        martillosSection: document.getElementById('martillos-section'),
        martillosList: document.getElementById('martillos-list')
    };

    // Inyectar DOM en todos los módulos
    setEngineDOM(DOM);
    setTrackerDOM(DOM);
    setUIDOM(DOM);
}

// ==================== INICIALIZACIÓN ====================

async function init() {
    console.log('🎮 Hades Build Coach v3.0 - Iniciando carga de datos...');
    
    try {
        setLoadingState(true);
        
        const [armasData, diosesData, recuerdosData] = await Promise.all([
            fetchJSON('armas.json'),
            fetchJSON('dioses.json'),
            fetchJSON('recuerdos.json')
        ]);
        
        AppState.armas = armasData.armas;
        AppState.dioses = diosesData.dioses;
        AppState.recuerdos = recuerdosData.recuerdos;
        
        console.log('✅ Datos cargados exitosamente:', {
            armas: AppState.armas?.length || 0,
            dioses: AppState.dioses?.length || 0,
            recuerdos: AppState.recuerdos?.length || 0
        });
        
        validateData();
        loadHistorial();
        initializeUI();
        restoreState();
        
        console.log('🚀 Aplicación lista para usar');
        
    } catch (error) {
        console.error('❌ Error crítico al inicializar:', error);
        showErrorToUser('Error al cargar los datos del juego. Por favor, recarga la página.');
    } finally {
        setLoadingState(false);
    }
}

async function fetchJSON(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error cargando ${url}: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}

function validateData() {
    if (!Array.isArray(AppState.armas) || AppState.armas.length === 0) {
        throw new Error('No se encontraron armas en los datos');
    }
    if (!Array.isArray(AppState.dioses) || AppState.dioses.length === 0) {
        throw new Error('No se encontraron dioses en los datos');
    }
    if (!Array.isArray(AppState.recuerdos) || AppState.recuerdos.length === 0) {
        throw new Error('No se encontraron recuerdos en los datos');
    }
    console.log('✓ Validación de datos completada');
}

function setLoadingState(isLoading) {
    AppState.isLoading = isLoading;
}

function initializeUI() {
    populateWeaponSelect();
    setupEventListeners();
    setupHotkeys();
    setupTabs();
    renderHistorial();
    renderAyuda();
    console.log('✓ UI inicializada');
}

// ==================== ENTRY POINT ====================

document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    init();
    setupElectronControls();
    setTimeout(() => VisionClient.init(DOM), 1000);
});

// Exponer funciones globales para el HTML (onclick handlers)
window.toggleBendicion = toggleBendicion;
window.toggleModoCompacto = toggleModoCompacto;

// Exportar para testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppState };
}
