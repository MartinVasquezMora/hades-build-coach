// translator-bridge.js - Módulo de comunicación IPC con el traductor Python
const { ipcRenderer } = require('electron');

/**
 * Escanea la carpeta de mods y devuelve lista de mods detectados
 * @param {string} modsPath - Ruta a la carpeta de mods
 * @returns {Promise<Array>} Lista de mods detectados
 */
async function scanMods(modsPath) {
  return await ipcRenderer.invoke('translator:scan-mods', modsPath);
}

/**
 * Ejecuta el traductor.py con las opciones especificadas
 * @param {Object} opts - Opciones para el traductor
 * @param {string} opts.modsPath - Ruta a la carpeta de mods
 * @param {string} opts.translatorPath - Ruta al archivo traductor.py
 * @param {string} opts.targetLang - Idioma destino (es, en, fr, etc.)
 * @param {string} opts.pythonPath - Comando de Python (default: 'python')
 * @returns {Promise<number>} Exit code del proceso
 */
async function runTranslator(opts) {
  return await ipcRenderer.invoke('translator:run', opts);
}

/**
 * Ejecuta el modimporter.exe
 * @param {string} importerPath - Ruta al ejecutable modimporter.exe
 * @returns {Promise<Object>} Resultado con stdout/stderr
 */
async function runModImporter(importerPath) {
  return await ipcRenderer.invoke('translator:run-importer', importerPath);
}

/**
 * Abre Hades via shell
 * @returns {Promise<boolean>} true si se ejecutó correctamente
 */
async function openHades() {
  return await ipcRenderer.invoke('translator:open-hades');
}

/**
 * Verifica si Python está instalado
 * @param {string} pythonPath - Comando de Python a verificar
 * @returns {Promise<boolean>} true si Python está disponible
 */
async function checkPython(pythonPath = 'python') {
  return await ipcRenderer.invoke('translator:check-python', pythonPath);
}

/**
 * Carga la configuración del traductor
 * @returns {Promise<Object>} Configuración guardada
 */
async function loadTranslatorConfig() {
  return await ipcRenderer.invoke('translator:load-config');
}

/**
 * Guarda la configuración del traductor
 * @param {Object} config - Configuración a guardar
 * @returns {Promise<boolean>} true si se guardó correctamente
 */
async function saveTranslatorConfig(config) {
  return await ipcRenderer.invoke('translator:save-config', config);
}

/**
 * Registra un callback para recibir eventos de progreso
 * @param {Function} callback - Función a llamar con {phase, line, percent}
 */
function onProgress(callback) {
  ipcRenderer.on('translator:progress', (event, data) => {
    callback(data);
  });
}

/**
 * Registra un callback para cuando termina la traducción
 * @param {Function} callback - Función a llamar con {exitCode, success}
 */
function onDone(callback) {
  ipcRenderer.on('translator:done', (event, data) => {
    callback(data);
  });
}

/**
 * Limpia todos los listeners de progreso
 */
function removeAllListeners() {
  ipcRenderer.removeAllListeners('translator:progress');
  ipcRenderer.removeAllListeners('translator:done');
}

module.exports = {
  scanMods,
  runTranslator,
  runModImporter,
  openHades,
  checkPython,
  loadTranslatorConfig,
  saveTranslatorConfig,
  onProgress,
  onDone,
  removeAllListeners
};
