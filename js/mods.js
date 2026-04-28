// mods.js - Sistema de detección y gestión de mods (MEJORADO)

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ModManager {
  constructor() {
    this.config = this.loadConfig();
    this.detectedMods = [];
    this.activeModsCache = null;
    this.modDatabase = this.loadModDatabase();
    this.scanInProgress = false;
  }

  loadConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'mods-config.json');
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.warn('No se pudo cargar mods-config.json:', err.message);
      return {
        modsEnabled: true,
        modsFolder: '',
        autoDetect: true,
        persistMods: true,
        knownMods: [],
        detectedMods: [],
        modDatabase: {}
      };
    }
  }

  /**
   * Carga la base de datos de mods persistente
   */
  loadModDatabase() {
    try {
      const dbPath = path.join(__dirname, '..', 'mods-database.json');
      if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (err) {
      console.warn('No se pudo cargar mods-database.json:', err.message);
    }
    return {};
  }

  /**
   * Guarda la base de datos de mods
   */
  saveModDatabase() {
    try {
      const dbPath = path.join(__dirname, '..', 'mods-database.json');
      fs.writeFileSync(dbPath, JSON.stringify(this.modDatabase, null, 2));
    } catch (err) {
      console.error('Error guardando mods-database.json:', err.message);
    }
  }

  saveConfig() {
    try {
      const configPath = path.join(__dirname, '..', 'mods-config.json');
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (err) {
      console.error('Error guardando mods-config.json:', err.message);
    }
  }

  /**
   * Detecta la carpeta de mods de Hades automáticamente (MEJORADO)
   */
  async detectModsFolder() {
    const possiblePaths = [
      // Vortex Mod Manager - Staging folder (NUEVO)
      path.join(process.env.APPDATA || '', 'Vortex', 'hades', 'mods'),
      path.join(process.env.LOCALAPPDATA || '', 'Vortex', 'hades', 'mods'),
      
      // Vortex - Ubicaciones personalizadas comunes
      path.join('C:\\', 'Vortex Mods', 'hades'),
      path.join('D:\\', 'Vortex Mods', 'hades'),
      path.join('E:\\', 'Vortex Mods', 'hades'),
      
      // Steam - múltiples ubicaciones
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files (x86)', 'Steam', 'steamapps', 'common', 'Hades', 'Content', 'Mods'),
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Steam', 'steamapps', 'common', 'Hades', 'Content', 'Mods'),
      path.join('C:\\Program Files (x86)', 'Steam', 'steamapps', 'common', 'Hades', 'Content', 'Mods'),
      path.join('C:\\Program Files', 'Steam', 'steamapps', 'common', 'Hades', 'Content', 'Mods'),
      
      // Epic Games
      path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Epic Games', 'Hades', 'Content', 'Mods'),
      path.join('C:\\Program Files', 'Epic Games', 'Hades', 'Content', 'Mods'),
      
      // Carpeta de usuario (mods manuales)
      path.join(process.env.USERPROFILE || '', 'Documents', 'Saved Games', 'Hades', 'Mods'),
      path.join(process.env.APPDATA || '', 'Supergiant Games', 'Hades', 'Mods'),
      
      // Ubicaciones alternativas
      path.join(process.env.LOCALAPPDATA || '', 'Hades', 'Mods'),
      
      // Ruta personalizada guardada
      this.config.modsFolder
    ];

    for (const folderPath of possiblePaths) {
      if (folderPath && fs.existsSync(folderPath)) {
        console.log(`✅ Carpeta de mods encontrada: ${folderPath}`);
        this.config.modsFolder = folderPath;
        this.saveConfig();
        return folderPath;
      }
    }

    console.log('⚠️ No se encontró carpeta de mods automáticamente');
    return null;
  }

  /**
   * Escanea la carpeta de mods y detecta TODOS los mods instalados (MEJORADO)
   */
  async scanMods() {
    if (this.scanInProgress) {
      console.log('⏳ Escaneo ya en progreso...');
      return this.detectedMods;
    }

    this.scanInProgress = true;

    if (!this.config.modsEnabled) {
      this.scanInProgress = false;
      return [];
    }

    const modsFolder = this.config.modsFolder || await this.detectModsFolder();
    
    if (!modsFolder || !fs.existsSync(modsFolder)) {
      console.log('❌ Carpeta de mods no encontrada');
      this.scanInProgress = false;
      return [];
    }

    this.detectedMods = [];
    const scannedHashes = new Set();

    try {
      console.log(`🔍 Escaneando: ${modsFolder}`);
      const files = fs.readdirSync(modsFolder, { withFileTypes: true });
      
      // Escanear archivos y carpetas
      for (const file of files) {
        try {
          if (file.isDirectory()) {
            // Escanear subcarpeta de mod
            const modPath = path.join(modsFolder, file.name);
            const modInfo = await this.analyzeModFolder(modPath, file.name);
            
            if (modInfo) {
              const hash = this.getModHash(modInfo);
              if (!scannedHashes.has(hash)) {
                scannedHashes.add(hash);
                this.detectedMods.push(modInfo);
                this.saveModToDatabase(modInfo);
                console.log(`✅ Mod detectado: ${modInfo.name}`);
              }
            }
          } else if (this.isModFile(file.name)) {
            // Archivo de mod suelto
            const filePath = path.join(modsFolder, file.name);
            const modInfo = await this.analyzeModFile(filePath, file.name);
            
            if (modInfo) {
              const hash = this.getModHash(modInfo);
              if (!scannedHashes.has(hash)) {
                scannedHashes.add(hash);
                this.detectedMods.push(modInfo);
                this.saveModToDatabase(modInfo);
                console.log(`✅ Mod detectado: ${modInfo.name}`);
              }
            }
          }
        } catch (err) {
          console.error(`Error procesando ${file.name}:`, err.message);
        }
      }

      // Guardar resultados
      this.config.detectedMods = this.detectedMods;
      this.config.lastScan = new Date().toISOString();
      this.saveConfig();
      this.activeModsCache = null;

      console.log(`✅ Escaneo completado: ${this.detectedMods.length} mods detectados`);
      this.scanInProgress = false;
      return this.detectedMods;

    } catch (err) {
      console.error('❌ Error escaneando mods:', err.message);
      this.scanInProgress = false;
      return [];
    }
  }

  /**
   * Verifica si un archivo es un archivo de mod
   */
  isModFile(fileName) {
    const modExtensions = ['.lua', '.sjson', '.json'];
    const ext = path.extname(fileName).toLowerCase();
    
    if (!modExtensions.includes(ext)) {
      return false;
    }

    // Ignorar SOLO archivos específicos del sistema (nombres exactos con punto inicial)
    const lowerFileName = fileName.toLowerCase();
    const exactIgnoredFiles = [
      // Archivos de sistema de Vortex (nombres exactos)
      '.archivos_procesados.json',
      '.traduccion_cache.json',
      'user_config.json',
      'vortex_config.json'
    ];

    // Verificar coincidencia exacta para archivos de sistema
    if (exactIgnoredFiles.includes(lowerFileName)) {
      return false;
    }

    // Ignorar archivos de datos del juego base (sin extensión en el patrón)
    const gameDataFiles = [
      'metaupgradedata.lua',
      'traitdata.lua',
      'roomdata.lua',
      'enemydata.lua',
      'weapondata.lua',
      'consumabledata.lua',
      'lootdata.lua',
      'herodata.lua',
      'obstacledata.lua',
      'projectiledata.lua',
      'screendata.lua',
      'uianimations.lua',
      'uiskins.lua',
      'uiscripts.lua'
    ];

    // Verificar si es un archivo de datos del juego base
    if (gameDataFiles.includes(lowerFileName)) {
      return false;
    }

    return true;
  }

  /**
   * Analiza un archivo de mod individual (NUEVO)
   */
  async analyzeModFile(filePath, fileName) {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(fileName).toLowerCase();
      
      // Intentar identificar el mod por nombre de archivo
      let modInfo = this.identifyModByFileName(fileName);
      
      if (!modInfo) {
        // Intentar leer el contenido para identificar
        modInfo = await this.identifyModByContent(filePath, fileName);
      }

      if (!modInfo) {
        // Mod desconocido - crear entrada genérica
        modInfo = {
          id: this.generateModId(fileName),
          name: this.formatModName(fileName),
          description: 'Mod personalizado detectado',
          affects: this.guessModAffects(fileName),
          custom: true
        };
      }

      return {
        ...modInfo,
        installed: true,
        path: filePath,
        files: [fileName],
        size: stats.size,
        modified: stats.mtime,
        hash: this.calculateFileHash(filePath)
      };

    } catch (err) {
      console.error(`Error analizando archivo ${fileName}:`, err.message);
      return null;
    }
  }

  /**
   * Analiza una carpeta de mod (MEJORADO)
   */
  async analyzeModFolder(modPath, folderName) {
    try {
      // Ignorar SOLO carpetas específicas del sistema de Vortex (nombres exactos con punto)
      const lowerFolderName = folderName.toLowerCase();
      const exactIgnoredFolders = [
        // Carpetas de sistema de Vortex (nombres exactos)
        '__folder_managed_by_vortex',
        '.vortex',
        '.cache',
        '.temp'
      ];

      // Verificar coincidencia exacta
      if (exactIgnoredFolders.includes(lowerFolderName)) {
        return null;
      }

      const files = fs.readdirSync(modPath);
      const luaFiles = files.filter(f => f.endsWith('.lua'));
      const sjsonFiles = files.filter(f => f.endsWith('.sjson'));
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const allModFiles = [...luaFiles, ...sjsonFiles, ...jsonFiles];
      
      // Solo considerar si tiene archivos .lua (los mods reales de Hades usan Lua)
      if (luaFiles.length === 0) {
        return null;
      }

      // Buscar archivo de configuración del mod
      const configFile = jsonFiles.find(f => 
        f.toLowerCase().includes('config') || 
        f.toLowerCase().includes('modinfo') ||
        f.toLowerCase() === 'mod.json'
      );

      let modInfo = null;

      // Intentar leer configuración del mod
      if (configFile) {
        modInfo = await this.readModConfig(path.join(modPath, configFile));
      }

      // Si no hay config, intentar identificar por archivos
      if (!modInfo) {
        for (const luaFile of luaFiles) {
          modInfo = this.identifyModByFileName(luaFile);
          if (modInfo) break;
        }
      }

      // Si aún no se identifica, buscar en la base de datos
      if (!modInfo) {
        const folderHash = this.calculateFolderHash(modPath);
        modInfo = this.modDatabase[folderHash];
      }

      // Último recurso: crear entrada genérica
      if (!modInfo) {
        modInfo = {
          id: this.generateModId(folderName),
          name: this.formatModName(folderName),
          description: 'Mod personalizado detectado',
          affects: this.guessModAffects(folderName, allModFiles),
          custom: true
        };
      }

      const stats = fs.statSync(modPath);

      return {
        ...modInfo,
        installed: true,
        path: modPath,
        files: allModFiles,
        fileCount: allModFiles.length,
        size: this.calculateFolderSize(modPath),
        modified: stats.mtime,
        hash: this.calculateFolderHash(modPath)
      };

    } catch (err) {
      console.error(`Error analizando carpeta ${folderName}:`, err.message);
      return null;
    }
  }

  /**
   * Lee la configuración de un mod desde su archivo JSON (NUEVO)
   */
  async readModConfig(configPath) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(data);

      // Extraer información del mod
      return {
        id: config.id || config.name?.toLowerCase().replace(/\s+/g, '-'),
        name: config.name || config.title || 'Mod Desconocido',
        description: config.description || config.desc || 'Sin descripción',
        version: config.version || '1.0.0',
        author: config.author || 'Desconocido',
        affects: config.affects || config.modifies || this.guessModAffects(config.name),
        custom: false
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Identifica un mod por nombre de archivo (MEJORADO)
   */
  identifyModByFileName(fileName) {
    const knownMods = this.config.knownMods;
    const lowerFileName = fileName.toLowerCase();
    
    // Buscar coincidencia exacta
    for (const mod of knownMods) {
      if (mod.files.some(f => f.toLowerCase() === lowerFileName)) {
        return { ...mod };
      }
    }

    // Buscar coincidencia parcial
    for (const mod of knownMods) {
      const modNameParts = mod.name.toLowerCase().split(' ');
      if (modNameParts.some(part => lowerFileName.includes(part))) {
        return { ...mod };
      }
    }

    return null;
  }

  /**
   * Identifica un mod leyendo su contenido (NUEVO)
   */
  async identifyModByContent(filePath, fileName) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').slice(0, 50); // Primeras 50 líneas

      // Buscar comentarios con información del mod
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Buscar nombre del mod
        if (trimmed.includes('ModName') || trimmed.includes('Mod Name') || trimmed.includes('mod_name')) {
          const match = trimmed.match(/["']([^"']+)["']/);
          if (match) {
            return {
              id: this.generateModId(match[1]),
              name: match[1],
              description: 'Mod detectado por análisis de contenido',
              affects: this.guessModAffects(match[1]),
              custom: true
            };
          }
        }
      }

      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Adivina qué afecta un mod basándose en su nombre y archivos (MEJORADO)
   */
  guessModAffects(name, files = []) {
    const affects = new Set();
    const lowerName = name.toLowerCase();
    const allText = [lowerName, ...files.map(f => f.toLowerCase())].join(' ');

    // Palabras clave para cada categoría
    const keywords = {
      boons: ['boon', 'blessing', 'bendicion', 'god', 'dios', 'olympus', 'olympo'],
      duo: ['duo', 'synergy', 'sinergia', 'combination', 'combo'],
      difficulty: ['god mode', 'easy', 'hard', 'difficulty', 'dificultad', 'damage', 'health'],
      gameplay: ['speed', 'fast', 'slow', 'gameplay', 'mechanic', 'mecanica'],
      keepsakes: ['keepsake', 'recuerdo', 'trinket', 'charm'],
      heat: ['heat', 'pact', 'pacto', 'punishment', 'castigo'],
      unlocks: ['unlock', 'desbloquear', 'all', 'everything', 'todo'],
      debug: ['debug', 'test', 'dev', 'cheat', 'console'],
      visual: ['visual', 'graphics', 'texture', 'skin', 'appearance'],
      audio: ['sound', 'music', 'audio', 'voice']
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => allText.includes(word))) {
        affects.add(category);
      }
    }

    return affects.size > 0 ? Array.from(affects) : ['unknown'];
  }

  /**
   * Genera un ID único para un mod (NUEVO)
   */
  generateModId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Formatea el nombre de un mod (NUEVO)
   */
  formatModName(name) {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\.(lua|sjson|json)$/i, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Calcula el hash de un archivo (NUEVO)
   */
  calculateFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (err) {
      return null;
    }
  }

  /**
   * Calcula el hash de una carpeta (NUEVO)
   */
  calculateFolderHash(folderPath) {
    try {
      const files = fs.readdirSync(folderPath);
      const hashes = files
        .filter(f => this.isModFile(f))
        .map(f => this.calculateFileHash(path.join(folderPath, f)))
        .filter(h => h !== null)
        .sort()
        .join('');
      
      return crypto.createHash('md5').update(hashes).digest('hex');
    } catch (err) {
      return null;
    }
  }

  /**
   * Calcula el tamaño de una carpeta (NUEVO)
   */
  calculateFolderSize(folderPath) {
    try {
      let totalSize = 0;
      const files = fs.readdirSync(folderPath);
      
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
        }
      }
      
      return totalSize;
    } catch (err) {
      return 0;
    }
  }

  /**
   * Obtiene el hash de un mod para evitar duplicados (NUEVO)
   */
  getModHash(modInfo) {
    const key = `${modInfo.name}-${modInfo.path}`;
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * Guarda un mod en la base de datos persistente (NUEVO)
   */
  saveModToDatabase(modInfo) {
    if (!this.config.persistMods) return;

    const hash = modInfo.hash || this.getModHash(modInfo);
    
    this.modDatabase[hash] = {
      id: modInfo.id,
      name: modInfo.name,
      description: modInfo.description,
      affects: modInfo.affects,
      custom: modInfo.custom,
      version: modInfo.version,
      author: modInfo.author,
      firstSeen: this.modDatabase[hash]?.firstSeen || new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      timesDetected: (this.modDatabase[hash]?.timesDetected || 0) + 1
    };

    this.saveModDatabase();
  }

  /**
   * Obtiene los mods activos (instalados)
   */
  getActiveMods() {
    if (this.activeModsCache) {
      return this.activeModsCache;
    }

    this.activeModsCache = this.detectedMods.filter(mod => mod.installed);
    return this.activeModsCache;
  }

  /**
   * Verifica si un mod específico está activo
   */
  isModActive(modId) {
    return this.getActiveMods().some(mod => mod.id === modId);
  }

  /**
   * Obtiene mods que afectan un aspecto específico
   */
  getModsByAffect(affect) {
    return this.getActiveMods().filter(mod => 
      mod.affects && mod.affects.includes(affect)
    );
  }

  /**
   * Integra los mods en los datos del juego (NUEVO)
   */
  integrateModsIntoGame(gameData) {
    const activeMods = this.getActiveMods();
    
    if (activeMods.length === 0) {
      return gameData;
    }

    console.log(`🎮 Integrando ${activeMods.length} mods en el juego...`);

    // Clonar datos para no modificar el original
    const modifiedData = JSON.parse(JSON.stringify(gameData));

    // Aplicar modificaciones de cada mod
    for (const mod of activeMods) {
      modifiedData._modsApplied = modifiedData._modsApplied || [];
      modifiedData._modsApplied.push(mod.name);

      // Modificar según el tipo de mod
      if (mod.affects.includes('boons')) {
        this.applyBoonModifications(modifiedData, mod);
      }

      if (mod.affects.includes('duo')) {
        this.applyDuoModifications(modifiedData, mod);
      }

      if (mod.affects.includes('difficulty')) {
        this.applyDifficultyModifications(modifiedData, mod);
      }

      if (mod.affects.includes('keepsakes')) {
        this.applyKeepsakeModifications(modifiedData, mod);
      }

      if (mod.affects.includes('heat')) {
        this.applyHeatModifications(modifiedData, mod);
      }
    }

    console.log(`✅ Mods integrados: ${modifiedData._modsApplied.join(', ')}`);
    return modifiedData;
  }

  /**
   * Aplica modificaciones de mods de bendiciones (NUEVO)
   */
  applyBoonModifications(gameData, mod) {
    // Aumentar cantidad de bendiciones disponibles
    if (mod.name.toLowerCase().includes('more') || mod.name.toLowerCase().includes('extra')) {
      gameData._boonChoicesModifier = (gameData._boonChoicesModifier || 1) + 0.5;
    }

    // Marcar que las bendiciones están modificadas
    gameData._boonsModified = true;
  }

  /**
   * Aplica modificaciones de mods de dúos (NUEVO)
   */
  applyDuoModifications(gameData, mod) {
    // Aumentar probabilidad de dúos
    if (mod.name.toLowerCase().includes('always') || mod.name.toLowerCase().includes('guaranteed')) {
      gameData._duoProbabilityMultiplier = 10;
    } else {
      gameData._duoProbabilityMultiplier = (gameData._duoProbabilityMultiplier || 1) * 2;
    }

    gameData._duosModified = true;
  }

  /**
   * Aplica modificaciones de mods de dificultad (NUEVO)
   */
  applyDifficultyModifications(gameData, mod) {
    if (mod.name.toLowerCase().includes('god mode') || mod.name.toLowerCase().includes('easy')) {
      gameData._difficultyReduced = true;
      gameData._damageMultiplier = 0.5;
    }

    if (mod.name.toLowerCase().includes('hard') || mod.name.toLowerCase().includes('extreme')) {
      gameData._difficultyIncreased = true;
      gameData._damageMultiplier = 2;
    }
  }

  /**
   * Aplica modificaciones de mods de recuerdos (NUEVO)
   */
  applyKeepsakeModifications(gameData, mod) {
    if (mod.name.toLowerCase().includes('all') || mod.name.toLowerCase().includes('unlock')) {
      gameData._allKeepsakesUnlocked = true;
    }
  }

  /**
   * Aplica modificaciones de mods de heat (NUEVO)
   */
  applyHeatModifications(gameData, mod) {
    if (mod.name.toLowerCase().includes('custom') || mod.name.toLowerCase().includes('modify')) {
      gameData._heatModified = true;
    }
  }

  /**
   * Obtiene modificadores activos para mostrar en UI (NUEVO)
   */
  getActiveModifiers() {
    const activeMods = this.getActiveMods();
    const modifiers = {
      boonChoices: 1,
      duoProbability: 1,
      difficulty: 1,
      allKeepsakes: false,
      heatModified: false,
      modsActive: activeMods.length > 0
    };

    for (const mod of activeMods) {
      if (mod.affects.includes('boons')) {
        if (mod.name.toLowerCase().includes('more') || mod.name.toLowerCase().includes('extra')) {
          modifiers.boonChoices += 0.5;
        }
      }

      if (mod.affects.includes('duo')) {
        if (mod.name.toLowerCase().includes('always')) {
          modifiers.duoProbability = 10;
        } else {
          modifiers.duoProbability *= 2;
        }
      }

      if (mod.affects.includes('difficulty')) {
        if (mod.name.toLowerCase().includes('god mode') || mod.name.toLowerCase().includes('easy')) {
          modifiers.difficulty = 0.5;
        } else if (mod.name.toLowerCase().includes('hard')) {
          modifiers.difficulty = 2;
        }
      }

      if (mod.affects.includes('keepsakes')) {
        modifiers.allKeepsakes = true;
      }

      if (mod.affects.includes('heat')) {
        modifiers.heatModified = true;
      }
    }

    return modifiers;
  }

  /**
   * Genera advertencias basadas en mods activos
   */
  getModWarnings() {
    const warnings = [];
    const activeMods = this.getActiveMods();

    if (activeMods.length === 0) {
      return warnings;
    }

    // Advertencia general
    warnings.push({
      type: 'info',
      message: `${activeMods.length} mod(s) detectado(s). Las recomendaciones pueden no ser precisas.`
    });

    // Advertencias específicas
    const boonMods = this.getModsByAffect('boons');
    if (boonMods.length > 0) {
      warnings.push({
        type: 'warning',
        message: 'Mods que afectan bendiciones detectados. Las probabilidades de dúos pueden variar.',
        mods: boonMods.map(m => m.name)
      });
    }

    const difficultyMods = this.getModsByAffect('difficulty');
    if (difficultyMods.length > 0) {
      warnings.push({
        type: 'info',
        message: 'Mods de dificultad detectados. Las recomendaciones defensivas pueden no aplicar.',
        mods: difficultyMods.map(m => m.name)
      });
    }

    const duoMods = this.getModsByAffect('duo');
    if (duoMods.length > 0) {
      warnings.push({
        type: 'success',
        message: 'Mods de dúos detectados. ¡Las sinergias serán más fáciles de conseguir!',
        mods: duoMods.map(m => m.name)
      });
    }

    return warnings;
  }

  /**
   * Ajusta las recomendaciones basándose en mods activos
   */
  adjustRecommendations(recommendations) {
    const activeMods = this.getActiveMods();
    
    if (activeMods.length === 0) {
      return recommendations;
    }

    // Si hay mods de dúos, aumentar prioridad de bendiciones dúo
    if (this.isModActive('always-duo')) {
      recommendations.duoPriority = 'high';
    }

    // Si hay mods de bendiciones, ajustar expectativas
    if (this.getModsByAffect('boons').length > 0) {
      recommendations.modifiedByMods = true;
    }

    return recommendations;
  }

  /**
   * Configura la carpeta de mods manualmente
   */
  setModsFolder(folderPath) {
    if (fs.existsSync(folderPath)) {
      this.config.modsFolder = folderPath;
      this.saveConfig();
      return true;
    }
    return false;
  }

  /**
   * Habilita o deshabilita el sistema de mods
   */
  setModsEnabled(enabled) {
    this.config.modsEnabled = enabled;
    this.saveConfig();
    this.activeModsCache = null;
  }

  /**
   * Agrega un mod personalizado a la lista de conocidos
   */
  addCustomMod(modInfo) {
    this.config.knownMods.push(modInfo);
    this.saveConfig();
  }

  /**
   * Obtiene estadísticas de mods
   */
  getModStats() {
    const activeMods = this.getActiveMods();
    
    return {
      total: activeMods.length,
      byType: {
        boons: this.getModsByAffect('boons').length,
        difficulty: this.getModsByAffect('difficulty').length,
        gameplay: this.getModsByAffect('gameplay').length,
        duo: this.getModsByAffect('duo').length,
        custom: activeMods.filter(m => m.custom).length
      },
      lastScan: this.config.lastScan
    };
  }
}

// Exportar instancia única
const modManager = new ModManager();

module.exports = modManager;
