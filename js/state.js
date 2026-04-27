/**
 * HADES BUILD COACH - Estado Global
 * Módulo que contiene el estado de la aplicación
 */

// ==================== ESTADO GLOBAL ====================
const AppState = {
    armas: null,
    dioses: null,
    recuerdos: null,

    aspectoSeleccionado: null,
    armaSeleccionada: null,

    coachMode: 'farm',
    isLoading: false,
    _restoringState: false,

    // Modo compacto de overlay
    modoCompacto: false,

    // Tracker de run activa
    runActiva: null, // { armaId, aspectoIndex, biomaActual, inicio, bendicionesAceptadas, bendicionesObtenidas }

    // Historial
    historial: [] // Array de runs completadas
};

// ==================== CONSTANTES ====================
const STORAGE_KEY = 'hades_coach_state';
const HISTORIAL_KEY = 'hades_coach_historial';

module.exports = {
    AppState,
    STORAGE_KEY,
    HISTORIAL_KEY
};
