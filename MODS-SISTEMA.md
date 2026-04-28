# 🎮 Sistema de Detección de Mods - Hades Build Coach

## 📋 Descripción

El Hades Build Coach ahora puede **detectar y reconocer mods instalados** en tu juego de Hades, ajustando las recomendaciones y mostrando advertencias relevantes.

---

## ✨ Características

### 🔍 Detección Automática
- Escanea automáticamente la carpeta de mods de Hades
- Detecta mods en formato `.lua` y `.sjson`
- Identifica mods conocidos y personalizados
- Soporta múltiples ubicaciones (Steam, Epic Games, manual)

### 📊 Mods Conocidos
El sistema reconoce automáticamente estos mods populares:

1. **God Mode Plus** - Mejora el God Mode
2. **More Boons** - Más bendiciones disponibles
3. **Custom Builds** - Builds personalizadas
4. **Faster Runs** - Acelera el ritmo
5. **All Keepsakes Unlocked** - Todos los recuerdos desbloqueados
6. **Custom Heat** - Personaliza el Pacto de Castigo
7. **Debug Mode** - Modo debug del juego
8. **Always Duo Boons** - Más probabilidad de dúos

### ⚠️ Advertencias Inteligentes
- Muestra advertencias cuando los mods afectan las recomendaciones
- Indica qué aspectos del juego están modificados
- Ajusta las expectativas de probabilidades de dúos

### 🎨 Interfaz Visual
- Badge en la barra de título mostrando estado de mods
- Modal completo de configuración
- Lista visual de mods detectados
- Categorización por tipo de efecto

---

## 🚀 Cómo Usar

### 1. Abrir Configuración de Mods

Haz clic en el badge **🎮 Sin Mods** en la barra de título, o en el botón **🔧 Mods**.

### 2. Activar Detección

Activa el toggle **"Detección de mods activada"**.

### 3. Escanear Mods

#### Opción A: Auto-detección
El sistema buscará automáticamente en:
- `C:\Program Files (x86)\Steam\steamapps\common\Hades\Content\Mods`
- `C:\Program Files\Steam\steamapps\common\Hades\Content\Mods`
- `C:\Program Files\Epic Games\Hades\Content\Mods`
- `%USERPROFILE%\Documents\Saved Games\Hades\Mods`

#### Opción B: Carpeta Manual
1. Haz clic en **📁 Buscar**
2. Selecciona la carpeta donde tienes los mods
3. Haz clic en **🔍 Escanear**

### 4. Ver Mods Detectados

La lista mostrará:
- **Nombre del mod**
- **Descripción**
- **Tipo** (Conocido o Personalizado)
- **Efectos** (qué aspectos del juego modifica)

---

## 📁 Estructura de Mods

### Mods Conocidos
Los mods conocidos se identifican por sus archivos:

```
Hades/Content/Mods/
├── GodModePlus.lua          → God Mode Plus
├── MoreBoons.lua            → More Boons
├── AlwaysDuo.lua            → Always Duo Boons
└── CustomBuilds.lua         → Custom Builds
```

### Mods Personalizados
Los mods en carpetas o con nombres no reconocidos se marcan como "Personalizados":

```
Hades/Content/Mods/
└── MiModPersonalizado/
    ├── main.lua
    └── config.sjson
```

---

## ⚙️ Configuración

### Archivo: `mods-config.json`

```json
{
  "modsEnabled": true,
  "modsFolder": "C:\\..\\Hades\\Content\\Mods",
  "autoDetect": true,
  "knownMods": [...],
  "detectedMods": [...],
  "lastScan": "2024-01-15T10:30:00.000Z"
}
```

### Opciones:
- **modsEnabled**: Activa/desactiva el sistema
- **modsFolder**: Ruta a la carpeta de mods
- **autoDetect**: Escaneo automático al iniciar
- **knownMods**: Lista de mods reconocidos
- **detectedMods**: Mods encontrados en el último escaneo

---

## 🎯 Efectos de Mods

Los mods se categorizan por qué afectan:

### 🎁 Boons (Bendiciones)
Mods que modifican bendiciones disponibles o probabilidades.

**Advertencia:** "Las probabilidades de dúos pueden variar"

### 🔥 Difficulty (Dificultad)
Mods que cambian la dificultad del juego.

**Advertencia:** "Las recomendaciones defensivas pueden no aplicar"

### ⚡ Duo (Dúos)
Mods que aumentan probabilidad de bendiciones dúo.

**Advertencia:** "¡Las sinergias serán más fáciles de conseguir!"

### 🎮 Gameplay
Mods que modifican mecánicas generales del juego.

### 🔓 Unlocks
Mods que desbloquean contenido.

### 🏃 Speed
Mods que aceleran el ritmo del juego.

---

## 💡 Ejemplos de Uso

### Caso 1: Mod de Dúos Activo

```
Badge: ⚠️ 1 Mod(s)
Advertencia: "Mods de dúos detectados. ¡Las sinergias serán más fáciles de conseguir!"
```

El coach ajustará las recomendaciones sabiendo que los dúos son más probables.

### Caso 2: Mod de Bendiciones

```
Badge: ⚠️ 2 Mod(s)
Advertencia: "Mods que afectan bendiciones detectados. Las probabilidades pueden variar."
```

Las recomendaciones se marcarán como "modificadas por mods".

### Caso 3: Sin Mods

```
Badge: 🎮 Sin Mods
```

El coach funciona normalmente sin ajustes.

---

## 🔧 Agregar Mods Personalizados

### Método 1: Editar `mods-config.json`

```json
{
  "knownMods": [
    {
      "id": "mi-mod",
      "name": "Mi Mod Personalizado",
      "description": "Descripción del mod",
      "affects": ["boons", "gameplay"],
      "files": ["MiMod.lua"]
    }
  ]
}
```

### Método 2: Detección Automática

Los mods no reconocidos se detectan automáticamente como "Personalizados".

---

## 🛠️ API para Desarrolladores

### ModManager

```javascript
const modManager = require('./js/mods');

// Escanear mods
const mods = await modManager.scanMods();

// Verificar si un mod está activo
const isActive = modManager.isModActive('always-duo');

// Obtener mods por efecto
const boonMods = modManager.getModsByAffect('boons');

// Obtener advertencias
const warnings = modManager.getModWarnings();

// Ajustar recomendaciones
const adjusted = modManager.adjustRecommendations(recommendations);
```

---

## 📊 Estadísticas

```javascript
const stats = modManager.getModStats();

// Resultado:
{
  total: 3,
  byType: {
    boons: 1,
    difficulty: 0,
    gameplay: 1,
    duo: 1,
    custom: 0
  },
  lastScan: "2024-01-15T10:30:00.000Z"
}
```

---

## 🐛 Solución de Problemas

### No se detectan mods

1. Verifica que la carpeta de mods existe
2. Asegúrate de que los mods están en formato `.lua`
3. Haz clic en **📁 Buscar** y selecciona manualmente la carpeta
4. Haz clic en **🔍 Escanear** de nuevo

### Mods no reconocidos

Los mods personalizados se marcan como "Personalizados". Puedes agregarlos manualmente a `mods-config.json`.

### Advertencias incorrectas

Si un mod no afecta lo que indica, edita `mods-config.json` y ajusta el array `affects`.

---

## 🎯 Roadmap

- [ ] Soporte para Hades 2
- [ ] Detección de mods de Thunderstore
- [ ] Integración con Nexus Mods API
- [ ] Perfiles de mods (guardar configuraciones)
- [ ] Recomendaciones específicas por mod
- [ ] Estadísticas de winrate con mods

---

## 📝 Notas Técnicas

### Ubicaciones de Mods

El sistema busca en estas rutas por defecto:

**Steam:**
```
C:\Program Files (x86)\Steam\steamapps\common\Hades\Content\Mods
C:\Program Files\Steam\steamapps\common\Hades\Content\Mods
```

**Epic Games:**
```
C:\Program Files\Epic Games\Hades\Content\Mods
```

**Manual:**
```
%USERPROFILE%\Documents\Saved Games\Hades\Mods
```

### Formatos Soportados

- **`.lua`** - Scripts de mods (Lua)
- **`.sjson`** - Archivos de datos modificados (SJSON)

### Detección

El sistema:
1. Escanea la carpeta de mods
2. Busca archivos `.lua` y carpetas
3. Compara con la lista de mods conocidos
4. Marca los no reconocidos como "Personalizados"

---

## 🤝 Contribuir

¿Conoces un mod popular que debería estar en la lista? Abre un issue o PR con:

- Nombre del mod
- Descripción
- Archivos que incluye
- Qué aspectos del juego afecta

---

## 📧 Soporte

Si tienes problemas con el sistema de mods:

1. Revisa este documento
2. Verifica los logs en la consola (F12)
3. Abre un issue en GitHub

---

⚡ **¡Disfruta jugando Hades con mods y recomendaciones ajustadas!**
