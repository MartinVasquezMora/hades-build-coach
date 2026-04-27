/**
 * HADES BUILD COACH - Cliente de Visión Artificial
 * Módulo que maneja la conexión WebSocket con ojo.py
 */

const { AppState } = require('./state');

/**
 * Cliente WebSocket con reconexión automática
 * Conecta con ojo.py para recibir detecciones OCR en tiempo real
 */
const VisionClient = {
    socket: null,
    reconnectAttempts: 0,
    maxReconnectDelay: 30000, // 30 segundos máximo
    isConnected: false,
    reconnectTimer: null,
    
    // Estado de la conexión para la UI
    status: 'offline', // 'offline' | 'connecting' | 'active'
    
    // Referencias a funciones UI (se inyectan desde ui.js)
    DOM: null,
    findAllDuosBetweenGods: null,
    
    /**
     * Inicia el cliente de visión
     */
    init(DOM) {
        this.DOM = DOM;
        console.log('👁️ Iniciando cliente de visión artificial...');
        this.connect();
    },
    
    /**
     * Establece conexión WebSocket
     */
    connect() {
        try {
            this.setStatus('connecting');
            console.log(`[Visión] Intentando conectar... (intento ${this.reconnectAttempts + 1})`);
            
            this.socket = new WebSocket('ws://localhost:8765');
            
            this.socket.onopen = () => this.handleOpen();
            this.socket.onmessage = (event) => this.handleMessage(event);
            this.socket.onclose = () => this.handleClose();
            this.socket.onerror = (error) => this.handleError(error);
            
        } catch (error) {
            console.error('[Visión] Error al crear WebSocket:', error);
            this.scheduleReconnect();
        }
    },
    
    /**
     * Conexión establecida exitosamente
     */
    handleOpen() {
        console.log('[Visión] ✅ Conectado a ojo.py');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.setStatus('active');
    },
    
    /**
     * Recibe mensaje del servidor
     */
    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('[Visión] Mensaje recibido:', data);
            
            if (data.tipo === 'dios_detectado' && data.dios) {
                this.handleGodDetection(data);
            }
        } catch (error) {
            console.error('[Visión] Error parseando mensaje:', error);
        }
    },
    
    /**
     * Procesa detección de un dios con lógica de prioridad
     */
    handleGodDetection(data) {
        const { dios, confianza, texto_raw } = data;
        
        console.log(`[Visión] 🔱 Dios detectado: ${dios} (confianza: ${confianza})`);
        
        // Feedback visual de procesamiento
        this.setProcessingState(true);
        
        // Buscar coincidencias en las armas/aspectos
        const matches = this.findMatchingAspects(dios);
        
        // Lógica de prioridad:
        // 1. Si ya hay arma/aspecto seleccionado → verificar si el dios es recomendado para esa build
        // 2. Si no hay nada seleccionado → auto-seleccionar si hay match único
        
        if (AppState.armaSeleccionada && AppState.aspectoSeleccionado) {
            // Modo: Ya hay selección activa
            const diosesActuales = AppState.aspectoSeleccionado.dioses_recomendados || [];
            
            if (diosesActuales.includes(dios)) {
                // TAREA-2: El dios detectado ES parte de la build actual - mostrar prioridades
                const prioridades = AppState.aspectoSeleccionado.prioridad_bendiciones?.[dios] || [];
                const bendicionesYa = AppState.runActiva?.bendicionesObtenidas?.[dios] || [];
                const pendientes = prioridades.filter(b => !bendicionesYa.includes(b));
                
                let mensajePrioridad;
                if (pendientes.length > 0) {
                    const pendientesCapitalizados = pendientes.map(b => b.charAt(0).toUpperCase() + b.slice(1));
                    mensajePrioridad = `Pide: ${pendientesCapitalizados.join(' → ')}`;
                } else if (prioridades.length > 0) {
                    mensajePrioridad = '✅ Todas las bendiciones obtenidas';
                } else {
                    mensajePrioridad = `✓ ${dios.charAt(0).toUpperCase() + dios.slice(1)} confirmado para tu build actual`;
                }
                
                this.showToast(dios, mensajePrioridad);
                console.log('[Visión] Dios verificado en build actual');
            } else {
                // El dios NO es parte de la build actual - mostrar alternativas
                if (matches.length > 0) {
                    this.showToast(dios, `Disponible en ${matches.length} build(s). Cambiar?`);
                    console.log('[Visión] Dios disponible en otras builds:', matches);
                } else {
                    this.showToast(dios, 'No compatible con builds conocidas');
                }
            }
        } else {
            // Modo: Sin selección - Auto-navegación
            if (matches.length === 1) {
                // Match único: auto-seleccionar
                const match = matches[0];
                this.autoSelectBuild(match.arma, match.aspecto, match.index);
                this.showToast(dios, `Auto-seleccionando: ${match.arma.nombre} - ${match.aspecto.nombre}`);
                
            } else if (matches.length > 1) {
                // Múltiples matches: mostrar opciones
                this.showToast(dios, `${matches.length} builds compatibles encontradas`);
                console.log('[Visión] Múltiples matches disponibles:', matches.map(m => `${m.arma.nombre} - ${m.aspecto.nombre}`));
                
            } else {
                // No hay match
                this.showToast(dios, 'No hay builds recomendadas con este dios');
            }
        }
        
        // Quitar estado de procesamiento después de 1s
        setTimeout(() => this.setProcessingState(false), 1000);
    },
    
    /**
     * Muestra estado de procesamiento en el badge
     */
    setProcessingState(isProcessing) {
        const badge = this.DOM.visionStatusBadge;
        if (!badge || this.status !== 'active') return;
        
        if (isProcessing) {
            badge.classList.add('vision-processing');
            badge.querySelector('.status-text').textContent = 'Procesando...';
            // Efecto de pulso rápido
            badge.style.animation = 'pulse-badge 0.5s ease-in-out infinite';
        } else {
            badge.classList.remove('vision-processing');
            badge.style.animation = '';
            this.setStatus('active'); // Restaurar texto normal
        }
    },
    
    /**
     * Busca aspectos que tengan el dios detectado en sus recomendados
     */
    findMatchingAspects(diosId) {
        const matches = [];
        
        if (!AppState.armas) return matches;
        
        AppState.armas.forEach(arma => {
            arma.aspectos.forEach((aspecto, index) => {
                const diosesRec = aspecto.dioses_recomendados || [];
                if (diosesRec.includes(diosId)) {
                    matches.push({ arma, aspecto, index });
                }
            });
        });
        
        return matches;
    },
    
    /**
     * Auto-selecciona un arma y aspecto
     */
    autoSelectBuild(arma, aspecto, aspectoIndex) {
        console.log(`[Visión] Auto-seleccionando: ${arma.nombre} - ${aspecto.nombre}`);
        
        // Seleccionar arma y esperar a que el selector de aspectos se popule
        this.DOM.weaponSelect.value = arma.id;
        this.DOM.weaponSelect.dispatchEvent(new Event('change'));
        
        // requestAnimationFrame garantiza que el render del DOM ocurrió antes de continuar
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (this.DOM.aspectSelect && !this.DOM.aspectSelect.disabled) {
                    this.DOM.aspectSelect.value = aspectoIndex;
                    this.DOM.aspectSelect.dispatchEvent(new Event('change'));
                } else {
                    // Fallback: si por alguna razón el selector aún no está listo, esperar un tick más
                    setTimeout(() => {
                        this.DOM.aspectSelect.value = aspectoIndex;
                        this.DOM.aspectSelect.dispatchEvent(new Event('change'));
                    }, 50);
                }
            });
        });
    },
    
    /**
     * Muestra toast de notificación
     */
    showToast(dios, mensaje) {
        const toast = this.DOM.visionToast;
        if (!toast) return;
        
        // Icono según el dios
        const iconos = {
            zeus: '⚡', poseidon: '🌊', atenea: '🛡️', afrodita: '💖',
            artemisa: '🏹', ares: '⚔️', dionisio: '🍷', demeter: '❄️', hermes: '👟'
        };
        
        const icono = iconos[dios] || '🔱';
        const titulo = dios.charAt(0).toUpperCase() + dios.slice(1);
        
        // Actualizar contenido
        toast.querySelector('.toast-icon').textContent = icono;
        toast.querySelector('.toast-title').textContent = `${titulo} detectado`;
        
        // TAREA-2: Aplicar clases según el tipo de mensaje
        const subtitleEl = toast.querySelector('.toast-subtitle');
        subtitleEl.textContent = mensaje;
        subtitleEl.classList.remove('priority-pending', 'priority-done');
        
        if (mensaje.includes('Pide:')) {
            subtitleEl.classList.add('priority-pending');
        } else if (mensaje.includes('✅')) {
            subtitleEl.classList.add('priority-done');
        }
        
        // Mostrar
        toast.classList.remove('toast-hidden');
        toast.classList.add('toast-visible');
        
        // Animar barra de progreso
        const progressBar = toast.querySelector('.toast-progress-bar');
        progressBar.style.transform = 'scaleX(1)';
        progressBar.style.transition = 'none';
        
        setTimeout(() => {
            progressBar.style.transition = 'transform 3s linear';
            progressBar.style.transform = 'scaleX(0)';
        }, 50);
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('toast-visible');
            toast.classList.add('toast-hidden');
        }, 3000);
    },
    
    /**
     * Conexión cerrada
     */
    handleClose() {
        console.log('[Visión] ❌ Conexión cerrada');
        this.isConnected = false;
        this.setStatus('offline');
        this.scheduleReconnect();
    },
    
    /**
     * Error en WebSocket
     */
    handleError(error) {
        console.error('[Visión] Error WebSocket:', error);
        // No hacer nada, onclose se llamará después
    },
    
    /**
     * Programa reconexión con backoff exponencial
     */
    scheduleReconnect() {
        if (this.reconnectTimer) return; // Ya hay un timer pendiente
        
        this.reconnectAttempts++;
        
        // Calcular delay: 1, 2, 4, 8, 30, 30, 30...
        let delay;
        if (this.reconnectAttempts === 1) delay = 1000;
        else if (this.reconnectAttempts === 2) delay = 2000;
        else if (this.reconnectAttempts === 3) delay = 4000;
        else if (this.reconnectAttempts === 4) delay = 8000;
        else delay = this.maxReconnectDelay;
        
        console.log(`[Visión] Reintentando en ${delay/1000}s...`);
        
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    },
    
    /**
     * Actualiza el badge de estado en la UI
     */
    setStatus(status) {
        this.status = status;
        const badge = this.DOM.visionStatusBadge;
        if (!badge) return;
        
        // Remover clases anteriores
        badge.classList.remove('vision-offline', 'vision-connecting', 'vision-active');
        
        const icon = badge.querySelector('.status-icon');
        const text = badge.querySelector('.status-text');
        
        switch (status) {
            case 'connecting':
                badge.classList.add('vision-connecting');
                icon.textContent = '🟡';
                text.textContent = `Conectando... (${this.reconnectAttempts + 1})`;
                break;
            case 'active':
                badge.classList.add('vision-active');
                icon.textContent = '🟢';
                text.textContent = 'Visión Activa';
                break;
            case 'offline':
            default:
                badge.classList.add('vision-offline');
                icon.textContent = '🔴';
                text.textContent = this.reconnectAttempts >= 5 ? 'Modo Manual' : 'Sin Visión';
                break;
        }
    }
};

/**
 * Configura botón de cerrar ventana y botón de test IA
 */
function setupElectronControls() {
    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            window.close();
        });
    }
    
    // Botón de Test IA - Simula detección de Artemisa
    const testBtn = document.getElementById('test-ia-btn');
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            console.log('[Test IA] Simulando detección de Artemisa...');
            
            // Simular mensaje WebSocket
            const testData = {
                tipo: 'dios_detectado',
                dios: 'artemisa',
                confianza: 0.95,
                texto_raw: 'Artemisa bendice tu ataque'
            };
            
            // Llamar directamente al handler
            VisionClient.handleGodDetection(testData);
        });
    }
}

module.exports = {
    VisionClient,
    setupElectronControls
};
