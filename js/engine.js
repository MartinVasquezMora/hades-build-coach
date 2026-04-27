/**
 * HADES BUILD COACH - Motor de Recomendación
 * Módulo que contiene toda la lógica de builds, sinergias y recuerdos
 */

const { AppState } = require('./state');

// DOM se inyecta desde ui.js al inicializar
let DOM = {};
function setDOM(domRef) { DOM = domRef; }

// ==================== GENERACIÓN DE BUILD ÓPTIMA ====================

function generateOptimalBuild(aspecto) {
    const diosesIds = aspecto.dioses_recomendados || [];

    if (diosesIds.length === 0) {
        DOM.optimalPlaceholder.innerHTML = '<p>No hay dioses recomendados para este aspecto</p>';
        DOM.optimalPlaceholder.classList.remove('hidden');
        DOM.optimalContent.classList.add('hidden');
        return;
    }

    const diosesRecomendados = diosesIds
        .map(id => AppState.dioses.find(d => d.id === id))
        .filter(Boolean);

    if (diosesRecomendados.length === 0) {
        console.error('No se encontraron datos para los dioses recomendados');
        return;
    }

    DOM.recommendedGods.innerHTML = '';
    const prioridades = aspecto.prioridad_bendiciones || {};
    diosesRecomendados.forEach(dios => {
        const card = createRecommendedGodCard(dios, prioridades[dios.id] || []);
        DOM.recommendedGods.appendChild(card);
    });

    DOM.optimalPlaceholder.classList.add('hidden');
    DOM.optimalContent.classList.remove('hidden');

    console.log('✨ Build Óptima:', diosesRecomendados.map(d => d.nombre).join(', '));
}

function createRecommendedGodCard(dios, prioridadesAspecto = []) {
    const card = document.createElement('div');
    card.className = 'recommended-god-card';
    card.style.borderLeftColor = dios.color_tema;

    const esHermes = dios.id === 'hermes';
    const bendiciones = dios.bendiciones || {};
    const efectos = dios.efectos || dios.efecto || {};

    const blessingTypes = esHermes
        ? [
            { key: 'aceleron', label: 'Acelerón (Dash)' },
            { key: 'especial', label: 'Especial' },
            { key: 'lanzamiento', label: 'Lanzamiento' },
            { key: 'llamada', label: 'Llamada' }
          ]
        : [
            { key: 'ataque', label: 'Ataque' },
            { key: 'especial', label: 'Especial' },
            { key: 'lanzamiento', label: 'Lanzamiento' },
            { key: 'llamada', label: 'Llamada' }
          ];

    // FIX 1: Ordenar según prioridad del aspecto
    const sortedTypes = prioridadesAspecto.length > 0
        ? [...blessingTypes].sort((a, b) => {
            const ia = prioridadesAspecto.indexOf(a.key);
            const ib = prioridadesAspecto.indexOf(b.key);
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
          })
        : blessingTypes;

    const blessingsHTML = sortedTypes.map(type => {
        const nombre = bendiciones[type.key] || 'N/A';
        const efecto = efectos[type.key] || '';
        if (nombre === 'N/A' && !efecto) return '';

        const esPrioritaria = prioridadesAspecto.includes(type.key);
        const priorityClass = esPrioritaria ? ' blessing-priority' : '';
        const priorityBadge = esPrioritaria
            ? `<span class="priority-badge" style="color: var(--color-gold-primary)">⭐</span>`
            : '';

        return `
            <div class="blessing-recommendation${priorityClass}" style="border-left-color: ${dios.color_tema}; ${esPrioritaria ? `background: rgba(${hexToRgb(dios.color_tema)}, 0.08);` : ''}">
                <span class="blessing-type">${type.label}${priorityBadge}</span>
                <span class="blessing-name" style="color: ${dios.color_tema}">${nombre}</span>
                ${efecto ? `<span class="blessing-effect">${efecto}</span>` : ''}
            </div>
        `;
    }).join('');

    // FIX 2: Pasivas de Hermes
    let passivasHTML = '';
    if (esHermes && dios.pasivas?.length) {
        passivasHTML = dios.pasivas.map(pasiva => `
            <div class="blessing-recommendation" style="border-left-color: ${dios.color_tema}">
                <span class="blessing-type">Pasiva</span>
                <span class="blessing-name" style="color: ${dios.color_tema}">${pasiva.nombre}</span>
                <span class="blessing-effect">${pasiva.efecto}</span>
            </div>
        `).join('');
    }

    const notaHTML = esHermes
        ? `<p class="hermes-note" style="color: ${dios.color_tema}; font-size: 0.8rem; margin-top: 0.5rem; font-style: italic;">⚡ Hermes no forma dúos. Sus bendiciones son de utilidad pura.</p>`
        : '';

    card.innerHTML = `
        <h4 style="color: ${dios.color_tema}">${dios.nombre}</h4>
        <div class="blessings-list">
            ${blessingsHTML}
            ${passivasHTML}
        </div>
        ${notaHTML}
    `;

    return card;
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return '212, 175, 55';
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

// ==================== SINERGIAS (DÚOS) ====================

function findSynergy(aspecto) {
    const diosesIds = aspecto.dioses_recomendados || [];

    if (diosesIds.length < 2) {
        DOM.synergyPlaceholder.innerHTML = '<p>Se necesitan 2+ dioses recomendados para detectar sinergias</p>';
        DOM.synergyPlaceholder.classList.remove('hidden');
        DOM.synergyCard.classList.add('hidden');
        return;
    }

    const duosEncontrados = findAllDuosBetweenGods(diosesIds);

    if (duosEncontrados.length > 0) {
        displayAllSynergyCards(duosEncontrados);
    } else {
        DOM.synergyPlaceholder.innerHTML = '<p>No se detectaron dúos entre los dioses recomendados para este aspecto</p>';
        DOM.synergyPlaceholder.classList.remove('hidden');
        DOM.synergyCard.classList.add('hidden');
    }
}

function findAllDuosBetweenGods(diosesIds) {
    const duos = [];
    for (let i = 0; i < diosesIds.length; i++) {
        for (let j = i + 1; j < diosesIds.length; j++) {
            const dios1 = AppState.dioses.find(d => d.id === diosesIds[i]);
            const dios2 = AppState.dioses.find(d => d.id === diosesIds[j]);
            if (!dios1 || !dios2) continue;
            const duo = dios1.duos?.find(d => d.con_dios === dios2.id) ||
                        dios2.duos?.find(d => d.con_dios === dios1.id);
            if (duo) duos.push({ dios1, dios2, ...duo });
        }
    }
    return duos;
}

function findDuoBetweenGods(diosesIds) {
    const duos = findAllDuosBetweenGods(diosesIds);
    return duos.length > 0 ? duos[0] : null;
}

function displayAllSynergyCards(duos) {
    DOM.synergyPlaceholder.classList.add('hidden');
    displaySynergyCard(duos[0]);

    const existingExtras = document.getElementById('extra-duos-container');
    if (existingExtras) existingExtras.remove();

    if (duos.length > 1) {
        const container = document.createElement('div');
        container.id = 'extra-duos-container';
        container.style.marginTop = '0.75rem';

        const label = document.createElement('p');
        label.style.cssText = 'font-size:0.8rem; color: var(--color-text-muted); margin-bottom:0.5rem; text-transform:uppercase; letter-spacing:0.05em;';
        label.textContent = `+ ${duos.length - 1} dúo(s) adicional(es)`;
        container.appendChild(label);

        duos.slice(1).forEach(duo => {
            const mini = document.createElement('div');
            mini.className = 'synergy-card';
            mini.style.cssText = 'margin-bottom:0.5rem; padding:0.75rem 1rem;';
            mini.innerHTML = `
                <div class="synergy-gods" style="margin-bottom:0.5rem;">
                    <span class="god-badge" style="border-color:${duo.dios1.color_tema}; color:${duo.dios1.color_tema}">${duo.dios1.nombre}</span>
                    <span class="synergy-connector">+</span>
                    <span class="god-badge" style="border-color:${duo.dios2.color_tema}; color:${duo.dios2.color_tema}">${duo.dios2.nombre}</span>
                </div>
                <h4 class="duo-name" style="font-size:1rem;">${duo.nombre_duo}</h4>
                <p class="duo-effect" style="font-size:0.85rem;">${duo.efecto}</p>
            `;
            container.appendChild(mini);
        });

        DOM.synergyCard.after(container);
        console.log(`🔗 ${duos.length} sinergias encontradas`);
    }
}

function displaySynergyCard(duo) {
    DOM.duoGod1.textContent = duo.dios1.nombre;
    DOM.duoGod1.className = `god-badge ${duo.dios1.id}`;
    DOM.duoGod1.style.borderColor = duo.dios1.color_tema;
    DOM.duoGod1.style.color = duo.dios1.color_tema;

    DOM.duoGod2.textContent = duo.dios2.nombre;
    DOM.duoGod2.className = `god-badge ${duo.dios2.id}`;
    DOM.duoGod2.style.borderColor = duo.dios2.color_tema;
    DOM.duoGod2.style.color = duo.dios2.color_tema;

    DOM.duoName.textContent = duo.nombre_duo;
    DOM.duoEffect.textContent = duo.efecto;

    DOM.synergyPlaceholder.classList.add('hidden');
    DOM.synergyCard.classList.remove('hidden');

    console.log(`🔗 Sinergia: ${duo.nombre_duo}`);
}

// ==================== MOTOR DE RECUERDOS POR BIOMAS ====================

function generarRutaDeRecuerdos(aspecto) {
    const diosesIds = aspecto.dioses_recomendados || [];

    if (diosesIds.length === 0) {
        console.warn('No hay dioses recomendados, usando recuerdos por defecto');
        return getDefaultRoute();
    }

    const ruta = {
        tartarus: getTartarusKeepsake(diosesIds),
        asphodel: getAsphodelKeepsake(diosesIds),
        elysium: getElysiumKeepsake(AppState.coachMode),
        styx: getStyxKeepsake(AppState.coachMode)
    };

    ruta.estrategia = generateStrategyText(aspecto, ruta);
    console.log('📍 Ruta de Recuerdos generada:', ruta);
    return ruta;
}

function getTartarusKeepsake(diosesIds) {
    const primerDios = AppState.dioses.find(d => d.id === diosesIds[0]);
    if (!primerDios) return getDefaultKeepsake();
    const recuerdo = AppState.recuerdos.find(r => r.dios_vinculado === primerDios.id);
    if (!recuerdo) return getDefaultKeepsake();
    return {
        bioma: 'Tártaro',
        recuerdo,
        objetivo: `Obtener bendición de ${primerDios.nombre}`,
        prioridad: 'Alta - Establecer sinergia base'
    };
}

function getAsphodelKeepsake(diosesIds) {
    if (diosesIds.length >= 2) {
        const segundoDios = AppState.dioses.find(d => d.id === diosesIds[1]);
        if (segundoDios) {
            const recuerdo = AppState.recuerdos.find(r => r.dios_vinculado === segundoDios.id);
            if (recuerdo) {
                return {
                    bioma: 'Prados Asfódelos',
                    recuerdo,
                    objetivo: `Buscar dúo con ${segundoDios.nombre}`,
                    prioridad: 'Alta - Completar sinergia'
                };
            }
        }
    }
    const pitaTanatos = AppState.recuerdos.find(r => r.id === 'pita_tánatos');
    if (pitaTanatos) {
        return {
            bioma: 'Prados Asfódelos',
            recuerdo: pitaTanatos,
            objetivo: 'Buscar Puertas del Caos para bonus',
            prioridad: 'Media - Farmeo de caos'
        };
    }
    return getDefaultKeepsake();
}

function getElysiumKeepsake(coachMode) {
    const dienteSkelly = AppState.recuerdos.find(r => r.id === 'diente_skelly');
    const monederoCaronte = AppState.recuerdos.find(r => r.id === 'monedero_caronte');

    if (coachMode === 'heat' && dienteSkelly) {
        return {
            bioma: 'Elíseo',
            recuerdo: dienteSkelly,
            objetivo: 'Seguridad contra Teseo y Minotauro',
            prioridad: 'CRÍTICA — Heat activo: supervivencia primero'
        };
    }
    if (dienteSkelly) {
        return { bioma: 'Elíseo', recuerdo: dienteSkelly, objetivo: 'Seguridad contra Teseo y Minotauro', prioridad: 'Crítica - Supervivencia' };
    } else if (monederoCaronte) {
        return { bioma: 'Elíseo', recuerdo: monederoCaronte, objetivo: 'Comprar mejoras antes del jefe', prioridad: 'Media - Preparación' };
    }
    return getDefaultKeepsake();
}

function getStyxKeepsake(coachMode) {
    const bellota = AppState.recuerdos.find(r => r.id === 'bellota_perenne');
    const puntaLanza = AppState.recuerdos.find(r => r.id === 'punta_lanza');

    if (coachMode === 'heat' && bellota) {
        return {
            bioma: 'Templo del Estigia',
            recuerdo: bellota,
            objetivo: 'HP máxima para Hades',
            prioridad: 'CRÍTICA — Heat activo: supervivencia primero'
        };
    }
    if (bellota) {
        return { bioma: 'Templo del Estigia', recuerdo: bellota, objetivo: 'HP máxima para Hades', prioridad: 'Alta - Supervivencia final' };
    } else if (puntaLanza) {
        return { bioma: 'Templo del Estigia', recuerdo: puntaLanza, objetivo: 'Burst de daño contra Hades', prioridad: 'Alta - DPS final' };
    }
    return getDefaultKeepsake();
}

function getDefaultKeepsake() {
    const defaultRecuerdo = AppState.recuerdos.find(r => r.id === 'velo_nix') || AppState.recuerdos[0];
    return { bioma: 'Desconocido', recuerdo: defaultRecuerdo, objetivo: 'Mejorar calidad de bendiciones', prioridad: 'Media - Utilidad general' };
}

function getDefaultRoute() {
    return {
        tartarus: getDefaultKeepsake(),
        asphodel: getDefaultKeepsake(),
        elysium: getDefaultKeepsake(),
        styx: getDefaultKeepsake(),
        estrategia: 'Selecciona un aspecto con dioses recomendados para una ruta personalizada.'
    };
}

function generateStrategyText(aspecto, ruta) {
    const diosesIds = aspecto.dioses_recomendados || [];
    const nombresDioses = diosesIds
        .map(id => AppState.dioses.find(d => d.id === id)?.nombre)
        .filter(Boolean);

    const estrategiaBase = nombresDioses.length > 0
        ? `Build centrada en ${nombresDioses.join(' + ')}. `
        : '';

    const pasos = [
        `1. Tártaro: Equipa ${ruta.tartarus.recuerdo.nombre} para forzar a ${nombresDioses[0] || 'tu dios principal'}.`,
        nombresDioses.length > 1
            ? `2. Asfódelos: Cambia a ${ruta.asphodel.recuerdo.nombre} para buscar el dúo con ${nombresDioses[1]}.`
            : `2. Asfódelos: Explora Puertas del Caos con ${ruta.asphodel.recuerdo.nombre}.`,
        `3. Elíseo: ${ruta.elysium.recuerdo.nombre} para seguridad contra Teseo/Asterión.`,
        `4. Estigia: ${ruta.styx.recuerdo.nombre} para el combate final con Hades.`
    ];

    let texto = estrategiaBase + pasos.join(' ');
    if (AppState.coachMode === 'heat') {
        texto = `⚠️ Modo Heat: ${texto} Prioriza supervivencia sobre daño.`;
    }
    return texto;
}

// ==================== DISPLAY RUN PLANNER ====================

function displayRunPlanner(ruta) {
    DOM.loadingSpinner.classList.add('hidden');
    renderKeepsakeDisplay(DOM.keepsakeTartarus, ruta.tartarus);
    renderKeepsakeDisplay(DOM.keepsakeAsphodel, ruta.asphodel);
    renderKeepsakeDisplay(DOM.keepsakeElysium, ruta.elysium);
    renderKeepsakeDisplay(DOM.keepsakeStyx, ruta.styx);
    DOM.strategyText.textContent = ruta.estrategia;

    const strategySummary = document.getElementById('strategy-summary');
    if (strategySummary) {
        strategySummary.classList.toggle('heat-mode-active', AppState.coachMode === 'heat');
    }
    console.log('✅ Run Planner renderizado');
}

function renderKeepsakeDisplay(element, biomaData) {
    const recuerdo = biomaData.recuerdo;
    element.innerHTML = `
        <span class="keepsake-icon">${recuerdo.icono || '🎁'}</span>
        <span class="keepsake-name">${recuerdo.nombre}</span>
        <span class="keepsake-desc">${recuerdo.efecto}</span>
    `;
}

// ==================== MARTILLOS DE DÉDALO ====================

function renderMartillos(aspecto) {
    if (!DOM.martillosSection || !DOM.martillosList) return;

    const martillos = aspecto.martillos_dedalo;
    if (!martillos || martillos.length === 0) {
        DOM.martillosSection.classList.add('hidden');
        return;
    }

    DOM.martillosList.innerHTML = '';
    const orden = { S: 0, A: 1, B: 2, C: 3 };
    const sorted = [...martillos].sort((a, b) => (orden[a.prioridad] ?? 9) - (orden[b.prioridad] ?? 9));

    sorted.forEach(martillo => {
        const item = document.createElement('div');
        item.className = `martillo-item prioridad-${martillo.prioridad.toLowerCase()}`;
        item.innerHTML = `
            <div class="martillo-header">
                <span class="martillo-nombre">${martillo.nombre}</span>
                <span class="martillo-prioridad tier-${martillo.prioridad.toLowerCase()}">${martillo.prioridad}</span>
            </div>
            <p class="martillo-efecto">${martillo.efecto}</p>
        `;
        DOM.martillosList.appendChild(item);
    });

    if (aspecto.tip_run) {
        const tip = document.createElement('div');
        tip.className = 'run-tip';
        tip.innerHTML = `<span class="tip-icon">💡</span><p>${aspecto.tip_run}</p>`;
        DOM.martillosList.appendChild(tip);
    }

    DOM.martillosSection.classList.remove('hidden');
}

module.exports = {
    setDOM,
    generateOptimalBuild,
    createRecommendedGodCard,
    hexToRgb,
    findSynergy,
    findAllDuosBetweenGods,
    findDuoBetweenGods,
    displayAllSynergyCards,
    displaySynergyCard,
    generarRutaDeRecuerdos,
    getTartarusKeepsake,
    getAsphodelKeepsake,
    getElysiumKeepsake,
    getStyxKeepsake,
    getDefaultKeepsake,
    getDefaultRoute,
    generateStrategyText,
    displayRunPlanner,
    renderKeepsakeDisplay,
    renderMartillos
};
