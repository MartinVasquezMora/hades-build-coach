/**
 * Script de prueba para verificar que todos los módulos se cargan correctamente
 */

console.log('🧪 Iniciando prueba de módulos...\n');

try {
    // Probar carga de módulos
    console.log('📦 Cargando módulos...');
    
    const state = require('./js/state');
    console.log('✅ state.js cargado');
    
    const storage = require('./js/storage');
    console.log('✅ storage.js cargado');
    
    const vision = require('./js/vision');
    console.log('✅ vision.js cargado');
    
    const engine = require('./js/engine');
    console.log('✅ engine.js cargado');
    
    const tracker = require('./js/tracker');
    console.log('✅ tracker.js cargado');
    
    const ui = require('./js/ui');
    console.log('✅ ui.js cargado');
    
    console.log('\n✨ Todos los módulos se cargaron correctamente!');
    
    // Verificar exports
    console.log('\n🔍 Verificando exports...');
    console.log('state.AppState:', typeof state.AppState);
    console.log('storage.saveState:', typeof storage.saveState);
    console.log('vision.VisionClient:', typeof vision.VisionClient);
    console.log('engine.generateOptimalBuild:', typeof engine.generateOptimalBuild);
    console.log('tracker.iniciarNuevaRun:', typeof tracker.iniciarNuevaRun);
    console.log('ui.setupEventListeners:', typeof ui.setupEventListeners);
    
    console.log('\n🎉 ¡Prueba completada exitosamente!');
    
} catch (error) {
    console.error('\n❌ Error al cargar módulos:');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
}
