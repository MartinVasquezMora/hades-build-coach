# 📁 Ubicaciones de Mods de Hades

## 🎮 Vortex Mod Manager

### Ubicación Principal (Staging Folder)
```
%APPDATA%\Vortex\hades\mods
```

**Ruta completa:**
```
C:\Users\TuUsuario\AppData\Roaming\Vortex\hades\mods
```

### Ubicación Alternativa
```
%LOCALAPPDATA%\Vortex\hades\mods
```

**Ruta completa:**
```
C:\Users\TuUsuario\AppData\Local\Vortex\hades\mods
```

### Ubicaciones Personalizadas Comunes
```
C:\Vortex Mods\hades
D:\Vortex Mods\hades
E:\Vortex Mods\hades
```

### Cómo Encontrar Tu Carpeta de Vortex

1. **Abrir Vortex**
2. **Ir a Settings (⚙️)**
3. **Pestaña "Mods"**
4. **Ver "Mod Staging Folder"**

---

## 🎮 Steam

### Ubicación Estándar
```
C:\Program Files (x86)\Steam\steamapps\common\Hades\Content\Mods
```

### Ubicación Alternativa
```
C:\Program Files\Steam\steamapps\common\Hades\Content\Mods
```

### Ubicaciones en Otros Discos
```
D:\Steam\steamapps\common\Hades\Content\Mods
E:\SteamLibrary\steamapps\common\Hades\Content\Mods
```

---

## 🎮 Epic Games Store

### Ubicación Estándar
```
C:\Program Files\Epic Games\Hades\Content\Mods
```

### Ubicación Alternativa
```
C:\Program Files (x86)\Epic Games\Hades\Content\Mods
```

---

## 📂 Instalación Manual

### Carpeta de Usuario
```
%USERPROFILE%\Documents\Saved Games\Hades\Mods
```

**Ruta completa:**
```
C:\Users\TuUsuario\Documents\Saved Games\Hades\Mods
```

### AppData
```
%APPDATA%\Supergiant Games\Hades\Mods
```

**Ruta completa:**
```
C:\Users\TuUsuario\AppData\Roaming\Supergiant Games\Hades\Mods
```

### LocalAppData
```
%LOCALAPPDATA%\Hades\Mods
```

**Ruta completa:**
```
C:\Users\TuUsuario\AppData\Local\Hades\Mods
```

---

## 🔍 Cómo Encontrar Tu Carpeta de Mods

### Método 1: Buscar en Windows
1. Presiona `Win + R`
2. Escribe: `%APPDATA%\Vortex`
3. Busca la carpeta `hades\mods`

### Método 2: Desde Steam
1. Abre Steam
2. Clic derecho en Hades
3. **Administrar** → **Examinar archivos locales**
4. Busca la carpeta `Content\Mods`

### Método 3: Desde Vortex
1. Abre Vortex
2. Selecciona Hades
3. **Settings** → **Mods**
4. Copia la ruta de "Mod Staging Folder"

### Método 4: Buscar Archivos .lua
1. Abre el Explorador de Windows
2. En la barra de búsqueda escribe: `*.lua`
3. Busca en `C:\` o el disco donde instalaste Hades
4. Filtra por fecha reciente

---

## 📊 Resumen de Ubicaciones

| Gestor | Ubicación | Prioridad |
|--------|-----------|-----------|
| **Vortex** | `%APPDATA%\Vortex\hades\mods` | ⭐⭐⭐⭐⭐ |
| **Vortex Alt** | `%LOCALAPPDATA%\Vortex\hades\mods` | ⭐⭐⭐⭐ |
| **Steam** | `C:\Program Files (x86)\Steam\...\Hades\Content\Mods` | ⭐⭐⭐⭐ |
| **Epic** | `C:\Program Files\Epic Games\Hades\Content\Mods` | ⭐⭐⭐⭐ |
| **Manual** | `%USERPROFILE%\Documents\Saved Games\Hades\Mods` | ⭐⭐⭐ |
| **AppData** | `%APPDATA%\Supergiant Games\Hades\Mods` | ⭐⭐ |

---

## 🛠️ Configurar en Hades Build Coach

### Opción 1: Auto-detección
1. Abre Hades Build Coach
2. Clic en **🔧 Mods**
3. Activa el toggle
4. Clic en **🔍 Escanear**
5. El sistema buscará automáticamente en todas las ubicaciones

### Opción 2: Manual
1. Abre Hades Build Coach
2. Clic en **🔧 Mods**
3. Clic en **📁 Buscar**
4. Navega a tu carpeta de mods
5. Selecciona la carpeta
6. Clic en **🔍 Escanear**

---

## 💡 Tips

### Si usas Vortex:
- Los mods están en la carpeta de "staging"
- Vortex crea enlaces simbólicos al juego
- La carpeta puede estar en `AppData\Roaming` o `AppData\Local`

### Si usas Steam:
- Los mods van en `Content\Mods` dentro de la carpeta del juego
- Puedes tener múltiples bibliotecas de Steam en diferentes discos

### Si instalas manualmente:
- Crea la carpeta `Mods` si no existe
- Coloca los archivos `.lua` directamente ahí
- O crea subcarpetas para cada mod

---

## 🔧 Solución de Problemas

### "No se encontró carpeta de mods"

**Solución 1: Crear la carpeta manualmente**
```
1. Navega a: C:\Program Files (x86)\Steam\steamapps\common\Hades\Content
2. Crea una carpeta llamada "Mods"
3. Coloca tus mods ahí
4. Escanea de nuevo en Hades Build Coach
```

**Solución 2: Usar Vortex**
```
1. Instala Vortex Mod Manager
2. Agrega Hades como juego
3. Instala mods desde Nexus Mods
4. Vortex creará la carpeta automáticamente
```

**Solución 3: Buscar manualmente**
```
1. Abre el Explorador de Windows
2. Busca archivos .lua en tu disco
3. Encuentra dónde están tus mods
4. Usa "Buscar" en Hades Build Coach para seleccionar esa carpeta
```

---

## 📝 Ejemplo de Estructura

### Vortex
```
C:\Users\TuUsuario\AppData\Roaming\Vortex\hades\mods\
├── AlwaysDuo-1-0-0\
│   └── AlwaysDuo.lua
├── MoreBoons-2-1-0\
│   ├── MoreBoons.lua
│   └── RoomManager.sjson
└── ModUtil-2-5-4\
    └── ModUtil.lua
```

### Steam
```
C:\Program Files (x86)\Steam\steamapps\common\Hades\Content\Mods\
├── AlwaysDuo.lua
├── MoreBoons.lua
├── ModUtil.lua
└── CustomBuilds\
    ├── CustomBuilds.lua
    └── config.json
```

---

## 🎯 Ubicaciones que Detecta Hades Build Coach

El sistema busca automáticamente en **16 ubicaciones**:

1. ✅ `%APPDATA%\Vortex\hades\mods`
2. ✅ `%LOCALAPPDATA%\Vortex\hades\mods`
3. ✅ `C:\Vortex Mods\hades`
4. ✅ `D:\Vortex Mods\hades`
5. ✅ `E:\Vortex Mods\hades`
6. ✅ `C:\Program Files (x86)\Steam\...\Hades\Content\Mods`
7. ✅ `C:\Program Files\Steam\...\Hades\Content\Mods`
8. ✅ `C:\Program Files\Epic Games\Hades\Content\Mods`
9. ✅ `%USERPROFILE%\Documents\Saved Games\Hades\Mods`
10. ✅ `%APPDATA%\Supergiant Games\Hades\Mods`
11. ✅ `%LOCALAPPDATA%\Hades\Mods`
12. ✅ Ruta personalizada configurada

---

## 🚀 Inicio Rápido

### Para usuarios de Vortex:
```
Tu carpeta probablemente está en:
C:\Users\TuUsuario\AppData\Roaming\Vortex\hades\mods

1. Abre Hades Build Coach
2. Clic en 🔧 Mods
3. Clic en 🔍 Escanear
4. ¡Listo! Detectará automáticamente
```

### Para usuarios de Steam:
```
Tu carpeta probablemente está en:
C:\Program Files (x86)\Steam\steamapps\common\Hades\Content\Mods

1. Abre Hades Build Coach
2. Clic en 🔧 Mods
3. Clic en 🔍 Escanear
4. ¡Listo! Detectará automáticamente
```

---

⚡ **El sistema detecta automáticamente Vortex, Steam, Epic y ubicaciones manuales!**
