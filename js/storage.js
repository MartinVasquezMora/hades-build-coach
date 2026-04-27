/**
 * HADES BUILD COACH - Persistencia
 * Módulo que maneja localStorage para guardar/cargar estado
 */

const { AppState, STORAGE_KEY, HISTORIAL_KEY } = require('./state');

function saveState() {
    if (AppState._restoringState) return;
    try {
        const toSave = {
            armaId: AppState.armaSeleccionada?.id || null,
            aspectoIndex: AppState.armaSeleccionada && AppState.aspectoSeleccionado
                ? AppState.armaSeleccionada.aspectos.indexOf(AppState.aspectoSeleccionado)
                : null,
            coachMode: AppState.coachMode,
            modoCompacto: AppState.modoCompacto,
            runActiva: AppState.runActiva
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.warn('No se pudo guardar estado:', e);
    }
}

function saveHistorial() {
    try {
        localStorage.setItem(HISTORIAL_KEY, JSON.stringify(AppState.historial));
    } catch (e) {
        console.warn('No se pudo guardar historial:', e);
    }
}

function loadHistorial() {
    try {
        const saved = localStorage.getItem(HISTORIAL_KEY);
        AppState.historial = saved ? JSON.parse(saved) : [];
    } catch (e) {
        AppState.historial = [];
    }
}

function restoreState(DOM, toggleCoachMode, aplicarModoCompacto, actualizarTrackerUI) {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        const { armaId, aspectoIndex, coachMode, modoCompacto, runActiva } = JSON.parse(saved);

        if (coachMode) {
            AppState.coachMode = coachMode;
            DOM.coachToggle.checked = coachMode === 'heat';
            toggleCoachMode();
        }

        if (modoCompacto) {
            AppState.modoCompacto = true;
            aplicarModoCompacto();
        }

        if (runActiva) {
            AppState.runActiva = runActiva;
        }

        if (armaId && DOM.weaponSelect) {
            AppState._restoringState = true;
            DOM.weaponSelect.value = armaId;
            DOM.weaponSelect.dispatchEvent(new Event('change'));

            if (aspectoIndex !== null && aspectoIndex >= 0) {
                requestAnimationFrame(() => {
                    DOM.aspectSelect.value = aspectoIndex;
                    DOM.aspectSelect.dispatchEvent(new Event('change'));
                    AppState._restoringState = false;
                    // Restaurar tracker de run si había una activa
                    if (AppState.runActiva) {
                        actualizarTrackerUI();
                    }
                });
            } else {
                AppState._restoringState = false;
            }
        }
        console.log('✓ Estado restaurado');
    } catch (e) {
        console.warn('No se pudo restaurar estado:', e);
        localStorage.removeItem(STORAGE_KEY);
    }
}

module.exports = {
    saveState,
    saveHistorial,
    loadHistorial,
    restoreState
};
