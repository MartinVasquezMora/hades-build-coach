# 🎮 Hades Build Coach v3.0

Aplicación de escritorio (Electron) para coaching de builds de Hades con sistema de visión artificial OCR.

![Hades Build Coach](https://img.shields.io/badge/version-3.0-blue)
![Electron](https://img.shields.io/badge/Electron-Latest-47848F?logo=electron)
![Node.js](https://img.shields.io/badge/Node.js-Required-339933?logo=node.js)

## ✨ Características

### 🧪 Laboratorio de Sinergias
- **Motor de recomendaciones inteligente** con prioridad de bendiciones
- Detección automática de **todos los dúos posibles** entre dioses recomendados
- Tarjetas de bendiciones con **marcadores de prioridad** (⭐)
- Soporte completo para **Caos** y **Hermes** (incluyendo pasivas)
- **Martillos de Dédalo** ordenados por tier (S/A/B/C)

### 🏃 Tracker de Run Activa
- Registro de runs en tiempo real con **hotkeys globales** (F1-F4)
- **Checklist de bendiciones** prioritarias mid-run
- Cambio de bioma con actualización automática de objetivos
- Historial de hasta 50 runs con estadísticas por arma

### 🔴 Modo Compacto (Overlay)
- Overlay minimalista activable con **F1**
- Muestra recuerdo, objetivo y dúo del bioma actual
- Progreso de bendiciones obtenidas en tiempo real
- Botones rápidos para cambiar de bioma

### 👁️ Visión Artificial (Opcional)
- Cliente WebSocket que conecta con `ojo.py` (OCR)
- **Auto-selección** de build al detectar un dios
- **Recomendaciones en vivo** de bendiciones prioritarias
- Toast inteligente con estado de checklist

### 🎭 Modo Coach
- **Farmeo**: Configuración del Espejo y recuerdos para maximizar recursos
- **High Heat**: Recordatorios defensivos para jefes y Pacto de Castigo

### 🔧 Sistema de Detección de Mods
- **Detección automática** de mods en 16 ubicaciones (Vortex, Steam, Epic Games)
- **18 mods conocidos** pre-configurados (God Mode Plus, More Boons, Always Duo, etc.)
- **Base de datos persistente** para evitar re-escaneos
- **Filtros inteligentes** que ignoran archivos de sistema y datos del juego base
- **Integración completa**: modificadores, advertencias y ajustes de recomendaciones
- **Compatible** con mods de traducción y personalizados
- **UI dedicada** con modal, badge de estado y lista de mods por categoría

## 🚀 Instalación

### Requisitos
- **Node.js** 16+ ([Descargar](https://nodejs.org/))
- **Git** ([Descargar](https://git-scm.com/))
- **Python 3.8+** (solo para visión artificial)
- **Tesseract OCR** (solo para visión artificial)

### Pasos

```bash
# Clonar el repositorio
git clone https://github.com/MartinVasquezMora/hades-build-coach.git
cd hades-build-coach

# Instalar dependencias
npm install

# Iniciar la aplicación
npm start
```

## 📖 Uso

### Inicio Rápido
1. Selecciona tu **arma** en el panel izquierdo
2. Elige el **aspecto** que estás usando
3. El coach genera automáticamente: build óptima, sinergias, martillos y ruta de recuerdos
4. Presiona **F2** para registrar el inicio de la run
5. Usa **F1** para activar el **modo compacto** mientras juegas
6. Al terminar, presiona **F3** (victoria) o **F4** (derrota)

### Atajos de Teclado
| Tecla | Acción |
|-------|--------|
| **F1** | Toggle modo compacto |
| **F2** | Nueva run |
| **F3** | Marcar victoria |
| **F4** | Marcar derrota |

### Sistema de Mods

El coach detecta automáticamente mods instalados y ajusta sus recomendaciones:

1. Haz clic en el botón **🔧 Mods** en la barra superior
2. Presiona **🔍 Escanear** para detectar mods
3. Los mods detectados se mostrarán agrupados por categoría
4. Las advertencias aparecerán si los mods afectan las recomendaciones

**Ubicaciones detectadas automáticamente:**
- Vortex Mod Manager (`AppData\Roaming\Vortex\hades\mods`)
- Steam (`Program Files\Steam\steamapps\common\Hades\Content\Mods`)
- Epic Games (`Program Files\Epic Games\Hades\Content\Mods`)
- Y 13 ubicaciones más...

Ver [MODS-SISTEMA.md](MODS-SISTEMA.md) para documentación completa.

### Visión Artificial (Opcional)

Para activar la detección automática de dioses:

```bash
# Instalar dependencias de Python
pip install pytesseract pillow websockets mss

# Calibrar área de captura (solo primera vez)
python calibrador.py

# Iniciar servidor OCR
python ojo.py
```

El badge en la barra superior cambiará a 🟢 **Visión Activa** cuando esté conectado.

## 🏗️ Arquitectura

### Estructura Modular

```
📁 hades-build-coach/
├── 📄 app.js                 # Entry point (~180 líneas)
├── 📄 index.html             # UI principal
├── 📄 styles.css             # Estilos
├── 📄 main.js                # Proceso principal Electron
├── 📁 js/                    # Módulos
│   ├── state.js              # Estado global
│   ├── storage.js            # localStorage
│   ├── vision.js             # Cliente WebSocket
│   ├── engine.js             # Motor de recomendaciones
│   ├── tracker.js            # Tracker de runs
│   ├── ui.js                 # Interfaz y controles
│   ├── mods.js               # Sistema de detección de mods
│   └── mods-ui.js            # UI del sistema de mods
├── 📁 data/
│   ├── armas.json            # Armas, aspectos, martillos
│   ├── dioses.json           # Dioses, bendiciones, dúos
│   └── recuerdos.json        # Recuerdos por categoría
├── 📁 docs/
│   ├── MODS-SISTEMA.md       # Documentación del sistema de mods
│   ├── MODS-MEJORAS.md       # Mejoras futuras
│   ├── MODS-RESUMEN.md       # Resumen ejecutivo
│   └── UBICACIONES-MODS.md   # Ubicaciones de mods
└── 📁 python/
    ├── ojo.py                # Servidor OCR WebSocket
    ├── calibrador.py         # Calibración de captura
    └── config.json           # Coordenadas de pantalla
```

### Tecnologías
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Desktop**: Electron con `nodeIntegration: true`
- **Modularización**: Node.js `require()` (CommonJS)
- **Visión**: Python + Tesseract OCR + WebSocket
- **Persistencia**: localStorage

## 🎯 Roadmap

- [ ] Soporte para múltiples idiomas
- [ ] Exportar historial a CSV
- [ ] Integración con Twitch (mostrar build en stream)
- [ ] Modo "Speedrun" con timer integrado
- [ ] Base de datos de builds de la comunidad

## 🤝 Contribuir

Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🙏 Agradecimientos

- **Supergiant Games** por crear Hades
- Comunidad de speedrunners de Hades por las estrategias
- Tesseract OCR por el motor de reconocimiento de texto

## 📧 Contacto

Martín Vásquez Mora - mart.vasquezm@duocuc.cl

Repositorio: [https://github.com/MartinVasquezMora/hades-build-coach](https://github.com/MartinVasquezMora/hades-build-coach)

---

⚡ **Hecho con ❤️ para la comunidad de Hades**
