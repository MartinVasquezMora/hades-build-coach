#!/usr/bin/env python3
"""
HADES BUILD COACH — EL OJO v2.2
Sistema de visión artificial con asyncio puro (sin threading)
Captura pantalla + OCR → WebSocket broadcast

Refactorizado: Usa asyncio.run_in_executor() para operaciones bloqueantes
Lee configuración desde config.json (generado por calibrador.py)
"""

import asyncio
import websockets
import mss
import cv2
import numpy as np
import pytesseract
import time
import json
import sys
import os
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# Configuración de Tesseract (ajustar ruta según instalación)
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# ============================================================================
# CONFIGURACIÓN — se carga desde config.json
# ============================================================================

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')

def load_config():
    """Carga configuración desde config.json con valores por defecto como fallback"""
    defaults = {
        "monitor": {"top": 884, "left": 51, "width": 349, "height": 100},
        "cooldown_segundos": 5,
        "capture_interval": 0.5,
        "ws_port": 8765
    }
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        # Merge: los valores de config.json sobreescriben los defaults
        for key, val in defaults.items():
            if key not in data:
                data[key] = val
        return data
    except FileNotFoundError:
        print(f"[WARN] config.json no encontrado, usando valores por defecto")
        return defaults
    except json.JSONDecodeError as e:
        print(f"[WARN] config.json malformado ({e}), usando valores por defecto")
        return defaults

config = load_config()

# Área de captura (actualizable con calibrador.py → config.json)
MONITOR = config["monitor"]

# Lista de dioses a detectar
DIOSES = ["artemisa", "atenea", "zeus", "poseidon", "afrodita", "ares", "dionisio", "demeter", "hermes"]

# Cooldown por dios (segundos)
COOLDOWN_SEGUNDOS = config["cooldown_segundos"]

# Intervalo de captura (segundos)
CAPTURE_INTERVAL = config["capture_interval"]

# Puerto WebSocket
WS_PORT = config["ws_port"]

# Executor para operaciones bloqueantes (OCR + captura)
# max_workers=1 para evitar conflictos con mss (no es thread-safe)
ocr_executor = ThreadPoolExecutor(max_workers=1)

# ============================================================================
# LOGGING ESTRUCTURADO (formato original preservado)
# ============================================================================

def log(level, message):
    """Imprime logs con timestamp y nivel"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level:5}] {message}")

def log_info(msg): log("INFO", msg)
def log_detec(msg): log("DETEC", msg)
def log_debug(msg): log("DEBUG", msg)
def log_error(msg): log("ERROR", msg)
def log_warn(msg): log("WARN", msg)

# ============================================================================
# FUNCIONES DE PROCESAMIENTO (bloqueantes, se ejecutan en executor)
# ============================================================================

def preprocess_image(img_array):
    """Preprocesamiento óptimo para texto de videojuegos (CPU bound)"""
    # Convertir a escala de grises
    gris = cv2.cvtColor(img_array, cv2.COLOR_BGRA2GRAY)
    
    # Threshold adaptativo de Otsu
    _, thresh = cv2.threshold(gris, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    
    # Escalar 2x mejora precisión en texto pequeño
    escalada = cv2.resize(thresh, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    
    return escalada

def extract_text_from_image(processed_img):
    """Extrae texto usando Tesseract (CPU bound)"""
    custom_config = r'--oem 1 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzáéíóúüñÁÉÍÓÚÜÑ '
    
    try:
        texto = pytesseract.image_to_string(processed_img, config=custom_config).strip()
        return texto
    except Exception as e:
        return f"[OCR_ERROR: {e}]"

def capture_screen(monitor):
    """Captura la pantalla creando y cerrando mss en el mismo hilo (thread-safe)"""
    with mss.mss() as sct:
        return np.array(sct.grab(monitor))

# ============================================================================
# LOOP DE CAPTURA (asyncio nativo)
# ============================================================================

class VisionCaptureLoop:
    """Loop de captura asíncrono usando executor para operaciones bloqueantes"""
    
    def __init__(self, broadcast_callback, cooldown_seconds=5, loop=None):
        self.broadcast = broadcast_callback
        self.cooldowns = {}  # {dios: ultimo_timestamp}
        self.cooldown_seconds = cooldown_seconds
        self.last_detection = None
        self.detection_count = 0
        self.running = False
        self.loop = loop or asyncio.get_event_loop()
        # mss ya no se guarda como instancia: se crea/destruye en cada captura (thread-safe)
        
    async def initialize(self):
        """Verifica que mss funcione correctamente antes de iniciar el loop"""
        def test_capture():
            with mss.mss() as sct:
                return np.array(sct.grab(MONITOR)).shape
        
        shape = await self.loop.run_in_executor(ocr_executor, test_capture)
        log_info(f"Sistema de captura inicializado (frame: {shape[1]}x{shape[0]}px)")
        
    def check_gods(self, texto):
        """Verifica si hay dioses en el texto detectado"""
        texto_lower = texto.lower()
        dios_detectado = None
        confianza = 0.0
        
        for dios in DIOSES:
            if dios in texto_lower:
                dios_detectado = dios
                # Calcular confianza aproximada (heurística simple)
                confianza = min(1.0, len(dios) / max(1, len(texto_lower) * 0.1))
                break
        
        return dios_detectado, confianza
    
    def is_on_cooldown(self, dios):
        """Verifica si el dios está en cooldown"""
        ahora = time.time()
        if dios in self.cooldowns:
            tiempo_transcurrido = ahora - self.cooldowns[dios]
            if tiempo_transcurrido < self.cooldown_seconds:
                return True, self.cooldown_seconds - tiempo_transcurrido
        return False, 0
    
    async def process_single_capture(self):
        """Procesa una captura individual usando el executor"""
        try:
            # Capturar pantalla (mss se crea y destruye dentro del hilo — thread-safe)
            img = await self.loop.run_in_executor(
                ocr_executor,
                capture_screen,
                MONITOR
            )
            
            # Preprocesar imagen (CPU) en executor
            procesada = await self.loop.run_in_executor(
                ocr_executor,
                preprocess_image,
                img
            )
            
            # OCR (CPU intensivo) en executor
            texto = await self.loop.run_in_executor(
                ocr_executor,
                extract_text_from_image,
                procesada
            )
            
            if texto and not texto.startswith("[OCR_ERROR"):
                # Buscar dioses (sincrónico, muy rápido)
                dios, confianza = self.check_gods(texto)
                
                if dios:
                    # Verificar cooldown
                    en_cooldown, tiempo_restante = self.is_on_cooldown(dios)
                    
                    if en_cooldown:
                        log_debug(f"Cooldown activo para {dios} (faltan {tiempo_restante:.1f}s)")
                    else:
                        # Nuevo dios detectado - actualizar cooldown
                        self.cooldowns[dios] = time.time()
                        self.last_detection = dios
                        self.detection_count += 1
                        
                        # Crear mensaje JSON
                        mensaje = {
                            "tipo": "dios_detectado",
                            "dios": dios,
                            "confianza": round(confianza, 2),
                            "timestamp": int(time.time()),
                            "texto_raw": texto[:100]  # Limitar tamaño
                        }
                        
                        # Broadcast (async) - usa call_soon para thread-safety
                        asyncio.create_task(self.broadcast(mensaje))
                        log_detec(f"{dios.capitalize()} detectada (confianza: {confianza:.2f})")
                        
        except Exception as e:
            log_error(f"Error en captura: {e}")
    
    async def run(self):
        """Loop principal de captura asíncrono"""
        log_info("Iniciando loop de captura de pantalla...")
        self.running = True
        
        await self.initialize()
        
        try:
            while self.running:
                await self.process_single_capture()
                await asyncio.sleep(CAPTURE_INTERVAL)
        finally:
            # mss ya no necesita cleanup explícito (se crea/destruye en cada captura)
            log_info("Loop de captura finalizado")

# ============================================================================
# SERVIDOR WEBSOCKET
# ============================================================================

class VisionWebSocketServer:
    """Servidor WebSocket que broadcastea detecciones a todos los clientes"""
    
    def __init__(self, port=8765):
        self.port = port
        self.clients = set()
        self.running = False
        self.capture_task = None
        self.capture_loop = None
        
    async def register_client(self, websocket):
        """Registra un nuevo cliente"""
        self.clients.add(websocket)
        log_info(f"Cliente conectado: {websocket.remote_address[0]} (total: {len(self.clients)})")
    
    async def unregister_client(self, websocket):
        """Elimina un cliente desconectado"""
        if websocket in self.clients:
            self.clients.remove(websocket)
            log_info(f"Cliente desconectado (total: {len(self.clients)})")
    
    async def broadcast_to_clients(self, message):
        """Envía mensaje a todos los clientes conectados"""
        if not self.clients:
            return  # No hay clientes, no hacer nada
        
        mensaje_json = json.dumps(message)
        clientes_a_eliminar = []
        
        for client in list(self.clients):
            try:
                await client.send(mensaje_json)
            except websockets.exceptions.ConnectionClosed:
                clientes_a_eliminar.append(client)
            except Exception as e:
                log_error(f"Error enviando a cliente: {e}")
                clientes_a_eliminar.append(client)
        
        # Limpiar clientes muertos
        for client in clientes_a_eliminar:
            self.clients.discard(client)
        
        log_debug(f"Broadcast a {len(self.clients)} cliente(s)")
    
    async def broadcast_wrapper(self, message):
        """Wrapper para el callback del capture loop"""
        await self.broadcast_to_clients(message)
    
    async def handler(self, websocket, path=None):
        """Maneja conexiones WebSocket entrantes
        
        Args:
            websocket: Conexión WebSocket del cliente
            path: Ruta de conexión (opcional, para compatibilidad websockets < 10.0)
        """
        await self.register_client(websocket)
        try:
            # Mantener conexión abierta
            async for message in websocket:
                log_debug(f"Mensaje recibido del cliente: {message}")
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister_client(websocket)
    
    async def start(self):
        """Inicia el servidor y el loop de captura"""
        self.running = True
        
        # Crear el capture loop con el callback de broadcast
        loop = asyncio.get_event_loop()
        self.capture_loop = VisionCaptureLoop(
            broadcast_callback=self.broadcast_wrapper,
            cooldown_seconds=COOLDOWN_SEGUNDOS,
            loop=loop
        )
        
        log_info(f"Servidor WebSocket iniciado en ws://localhost:{self.port}")
        
        # Iniciar servidor WebSocket
        server = await websockets.serve(self.handler, "localhost", self.port)
        
        # Iniciar loop de captura como task concurrente
        self.capture_task = asyncio.create_task(self.capture_loop.run())
        
        # Esperar que el servidor termine
        try:
            await asyncio.Future()  # Corre infinitamente
        except asyncio.CancelledError:
            log_info("Señal de interrupción recibida...")
        finally:
            self.running = False
            self.capture_loop.running = False
            if self.capture_task:
                self.capture_task.cancel()
                try:
                    await self.capture_task
                except asyncio.CancelledError:
                    pass
            server.close()
            await server.wait_closed()

# ============================================================================
# MAIN
# ============================================================================

def check_tesseract():
    """Verifica que Tesseract esté instalado"""
    try:
        version = pytesseract.get_tesseract_version()
        log_info(f"Tesseract OCR v{version} detectado")
        return True
    except Exception as e:
        log_error("Tesseract OCR no encontrado")
        print("\n" + "="*60)
        print("  ERROR: Tesseract OCR es requerido")
        print("="*60)
        print("\n1. Descarga el instalador desde:")
        print("   https://github.com/UB-Mannheim/tesseract/wiki")
        print("\n2. Instala Tesseract y anota la ruta de instalación")
        print("\n3. Edita ojo.py y actualiza esta línea:")
        print(f"   pytesseract.pytesseract.tesseract_cmd = r'...'")
        print("\n" + "="*60)
        return False

def print_banner():
    """Muestra el banner de inicio"""
    print("=" * 50)
    print("  HADES BUILD COACH — EL OJO v2.1")
    print("=" * 50)
    print(f"  Área de captura: top={MONITOR['top']}, left={MONITOR['left']}, w={MONITOR['width']}, h={MONITOR['height']}")
    print(f"  Dioses monitoreados: {len(DIOSES)}")
    print(f"  Servidor: ws://localhost:{WS_PORT}")
    print()
    print("  ⚠  Si las coordenadas son incorrectas, ejecuta:")
    print("     python calibrador.py")
    print("=" * 50)
    print()

async def main():
    """Función principal"""
    print_banner()
    
    # Verificar Tesseract
    if not check_tesseract():
        return 1
    
    # Iniciar servidor WebSocket y captura (ambos en el mismo loop)
    servidor = VisionWebSocketServer(port=WS_PORT)
    
    try:
        await servidor.start()
    except Exception as e:
        log_error(f"Error en servidor: {e}")
        return 1
    finally:
        # Cleanup del executor
        ocr_executor.shutdown(wait=True)
    
    return 0

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n" + "="*50)
        print("  El Ojo se ha cerrado.")
        print("="*50)
        sys.exit(0)
