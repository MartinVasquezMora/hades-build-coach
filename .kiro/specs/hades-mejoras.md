# Hades Build Coach - Mejoras v3.1

## Resumen
Implementar 5 mejoras al Hades Build Coach: checklist de bendiciones, toast inteligente, modularización del código, notas por run y validación robusta de JSONs.

## Contexto
- Proyecto: Electron overlay app (HTML/CSS/JS vanilla + Python OCR)
- Archivos principales: app.js (~1900 líneas), index.html, styles.css, armas.json, dioses.json, recuerdos.json
- Usa nodeIntegration: true en Electron, sin frameworks, sin build tools, sin módulos ES6

## Tareas

### TAREA-1: Checklist de bendiciones mid-run
**Estado:** pending
**Descripción:** Dentro del modo compacto y del tracker de run activa, el jugador puede marcar qué bendiciones ya consiguió de cada dios recomendado. Persiste en AppState.runActiva.

**Cambios requeridos:**

**app.js:**
- En `iniciarNuevaRun()`, agregar campo `bendicionesObtenidas: {}` al objeto `AppState.runActiva` (estructura: `{ "ares": ["ataque"], "artemisa": [] }`)
- Crear función `toggleBendicion(diosId, tipoBendicion)` que toggle la bendición en el array y llama `saveState()`, `renderChecklist()`, `actualizarModoCompacto()`
- Crear función `renderChecklist()` que renderiza en `#checklist-container` una lista por dios recomendado con checkboxes clicables
- En `actualizarTrackerUI()`, llamar `renderChecklist()` al final
- En `actualizarModoCompacto()`, agregar resumen de progreso "Bendiciones: 2/4" en `#compact-progress`

**index.html:**
- En `#tab-tracker`, agregar después del panel de biomas:
```html
<div class="checklist-panel" id="checklist-panel">
  <h4 class="checklist-title">Bendiciones Obtenidas</h4>
  <div id="checklist-container">
    <p class="placeholder-text">Inicia una run para activar el checklist</p>
  </div>
</div>
```
- En `#compact-overlay`, agregar después de `#compact-duo`:
```html
<div class="compact-progress" id="compact-progress">Bendiciones: 0/0</div>
```

**styles.css:**
- `.checklist-panel`: margin-top: 1rem; padding: 1rem; background: var(--gradient-card); border: 1px solid var(--color-border); border-radius: 6px
- `.checklist-title`: color: var(--color-gold-primary); font-size: 0.9rem; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em
- `.checklist-god-section`: margin-bottom: 0.75rem
- `.checklist-god-name`: font-size: 0.85rem; font-weight: 600; margin-bottom: 0.4rem; display: block
- `.check-item`: display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; color: var(--color-text-secondary); transition: var(--transition-smooth)
- `.check-item:hover`: background: rgba(212,175,55,0.08)
- `.check-item.check-done`: color: var(--color-gold-primary); text-decoration: line-through; opacity: 0.7
- `.check-item::before`: content: "⬜"; font-size: 0.9rem
- `.check-item.check-done::before`: content: "✅"
- `.compact-progress`: font-size: 0.75rem; color: var(--color-text-secondary); text-align: center; padding: 0.25rem; border-top: 1px solid var(--color-border); margin-top: 0.25rem

---

### TAREA-2: Toast inteligente conectado a prioridad_bendiciones
**Estado:** pending
**Descripción:** Cuando ojo.py detecta un dios, el toast muestra qué bendición específica pedir según el aspecto activo y prioridad_bendiciones.

**Cambios requeridos:**

**app.js:**
- En `VisionClient.handleGodDetection(data)`, cuando el dios detectado está en dioses_recomendados:
  - Obtener `prioridades = AppState.aspectoSeleccionado.prioridad_bendiciones?.[dios] || []`
  - Obtener `bendicionesYa = AppState.runActiva?.bendicionesObtenidas?.[dios] || []`
  - Calcular `pendientes = prioridades.filter(b => !bendicionesYa.includes(b))`
  - Generar `mensajePrioridad = pendientes.length > 0 ? "Pide: " + pendientes.map(...).join(' → ') : '✅ Todas las bendiciones obtenidas'`
  - Pasar `mensajePrioridad` a `showToast()`
- Modificar `showToast(dios, mensaje)` para aplicar clase `.priority-pending` o `.priority-done` al `.toast-subtitle`

**styles.css:**
- `.toast-subtitle.priority-pending`: color: var(--color-gold-primary); font-weight: 600
- `.toast-subtitle.priority-done`: color: #88E83D

---

### TAREA-3: Separar app.js en módulos con require()
**Estado:** pending
**Descripción:** Dividir app.js (~1900 líneas) en 6 archivos usando require() de Node.js. Sin cambiar ninguna lógica existente.

**Estructura de archivos a crear:**
```
js/
  state.js          AppState, STORAGE_KEY, HISTORIAL_KEY
  storage.js        saveState, saveHistorial, loadHistorial, restoreState
  engine.js         generarRutaDeRecuerdos, getTartarusKeepsake, getAsphodelKeepsake,
                    getElysiumKeepsake, getStyxKeepsake, getDefaultKeepsake,
                    getDefaultRoute, generateStrategyText,
                    generateOptimalBuild, createRecommendedGodCard,
                    findSynergy, findAllDuosBetweenGods, findDuoBetweenGods,
                    displaySynergyCard, displayAllSynergyCards, renderMartillos
  tracker.js        iniciarNuevaRun, terminarRun, actualizarTrackerUI,
                    renderHistorial, toggleBendicion, renderChecklist
  ui.js             initDOM, populateWeaponSelect, setupEventListeners,
                    setupHotkeys, setupTabs, toggleModoCompacto, aplicarModoCompacto,
                    actualizarModoCompacto, displayRunPlanner, renderKeepsakeDisplay,
                    displaySelectedAspectInfo, updateBuildStatus, showRunPlannerLoading,
                    resetAspectSelector, resetSelectedInfo, resetLaboratory, resetRunPlanner,
                    toggleCoachMode, handleWeaponChange, handleAspectChange, handleCoachToggle,
                    renderAyuda, renderSeccionAyuda
  vision.js         VisionClient (objeto completo)
  app.js            solo imports + init() + DOMContentLoaded listener
```

**Reglas:**
- Cada archivo exporta con `module.exports = { fn1, fn2, ... }`
- DOM y initDOM() viven en ui.js y se exportan
- AppState vive en state.js y es importado por todos
- El nuevo app.js (raíz) solo tiene imports + init + DOMContentLoaded
- Verificar que no haya referencias circulares

---

### TAREA-4: Notas por run + filtro de historial por arma
**Estado:** pending
**Descripción:** Campo de texto libre en el tracker activo para anotar observaciones, y selector para filtrar el historial por arma.

**Cambios requeridos:**

**app.js:**
- En `iniciarNuevaRun()`, agregar `notas: ""` al objeto `AppState.runActiva`
- Crear función `guardarNotaRun(texto)` que actualiza `AppState.runActiva.notas` (máximo 300 chars) y llama `saveState()`
- En `setupEventListeners()`, agregar listener para `#run-notas` con evento `input`
- En `actualizarTrackerUI()`, setear el valor del textarea y disabled según haya run activa
- En `renderHistorial()`:
  - Agregar `<select id="filtro-arma">` con opción "Todas las armas" + una por cada arma única
  - Filtrar `AppState.historial` por `armaId` si hay filtro activo
  - Mostrar `run.notas` en cada ítem si existe
  - Agregar listener `change` al select

**index.html:**
- En `#tab-tracker`, agregar después del checklist:
```html
<div class="notas-panel">
  <label class="notas-label" for="run-notas">Notas de esta run</label>
  <textarea id="run-notas" class="run-notas-input"
    placeholder="Ej: Encontré Ruptura en Sísifo, me faltó el dúo..."
    maxlength="300" rows="3" disabled></textarea>
</div>
```
- En `#tab-historial`, agregar antes de `#historial-stats`:
```html
<div class="historial-filtros">
  <select id="filtro-arma" class="filtro-select">
    <option value="">Todas las armas</option>
  </select>
</div>
```

**styles.css:**
- `.notas-panel`: margin-top: 1rem; padding: 1rem; background: var(--gradient-card); border: 1px solid var(--color-border); border-radius: 6px
- `.notas-label`: display: block; color: var(--color-text-secondary); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem
- `.run-notas-input`: width: 100%; background: var(--color-bg-secondary); border: 1px solid var(--color-border); border-radius: 4px; color: var(--color-text-primary); font-family: inherit; font-size: 0.85rem; padding: 0.5rem; resize: vertical; transition: var(--transition-smooth)
- `.run-notas-input:focus`: outline: none; border-color: var(--color-gold-primary)
- `.run-notas-input:disabled`: opacity: 0.4; cursor: not-allowed
- `.historial-filtros`: margin-bottom: 1rem
- `.filtro-select`: mismos estilos que `.selector-section select` pero width: auto; min-width: 200px
- `.historial-nota`: display: block; font-size: 0.75rem; color: var(--color-text-muted); font-style: italic; margin-top: 0.2rem; padding-left: 1.5rem

---

### TAREA-5: Validación robusta de JSONs al arrancar
**Estado:** pending
**Descripción:** validateData() debe verificar integridad referencial para detectar errores al editar los JSONs manualmente.

**Cambios requeridos:**

**app.js, función validateData():**
Reemplazar contenido actual con validación completa que verifica:
1. Arrays base existen y no están vacíos
2. Cada aspecto de cada arma:
   - `dioses_recomendados` deben existir en dioses.json
   - `prioridad_bendiciones` debe referenciar dioses válidos
   - `martillos_dedalo` debe tener prioridad válida (S/A/B/C)
3. Recuerdos con `dios_vinculado` deben referenciar dioses existentes
4. Reportar warnings en console sin romper la app

---

## Restricciones Globales
- No cambiar main.js, ojo.py, calibrador.py, config.json, recuerdos.json
- No introducir frameworks, transpiladores ni dependencias npm nuevas
- Mantener todas las variables CSS existentes
- La Tarea 3 (modularización) no debe cambiar ninguna lógica, solo mover código
- Ejecutar las tareas en orden: 1 → 2 → 3 → 4 → 5
- Después de la Tarea 3, verificar que index.html solo tenga `<script src="app.js">`

## Referencias
- #[[file:app.js]]
- #[[file:index.html]]
- #[[file:styles.css]]
- #[[file:armas.json]]
- #[[file:dioses.json]]
