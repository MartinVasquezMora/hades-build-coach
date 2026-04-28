// bug-detector.js - Sistema de detección y diagnóstico de errores

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

class BugDetector {
  constructor() {
    this.issues = [];
    this.warnings = [];
    this.checks = [];
    this.onIssueFound = null;
    this.onCheckComplete = null;
  }

  // ==================== CHECKS INDIVIDUALES ====================

  async checkPythonInstallation() {
    const pythonCommands = ['python', 'python3', 'py'];
    let found = false;
    let version = null;

    for (const cmd of pythonCommands) {
      try {
        const result = await this.execPromise(`${cmd} --version`);
        if (result.includes('Python')) {
          found = true;
          version = result.trim();
          break;
        }
      } catch (err) {
        // Command not found, continue
      }
    }

    if (!found) {
      this.addIssue({
        type: 'error',
        category: 'python',
        title: 'Python no instalado',
        description: 'No se encontró Python en el sistema. Se requiere para ejecutar el traductor.',
        solution: 'Instala Python desde https://python.org y asegúrate de agregarlo al PATH',
        autoFixable: false,
        critical: true
      });
    } else {
      this.addCheck('✅ Python instalado: ' + version);
    }

    return found;
  }

  async checkTranslatorFile(config) {
    const translatorPath = config?.translator?.translatorPath || '';
    
    if (!translatorPath) {
      this.addIssue({
        type: 'warning',
        category: 'config',
        title: 'Ruta del traductor no configurada',
        description: 'No se ha especificado la ubicación del archivo traductor.py',
        solution: 'Configura la ruta en la pestaña Mods → ⚙️ Configuración',
        autoFixable: false
      });
      return false;
    }

    if (!fs.existsSync(translatorPath)) {
      this.addIssue({
        type: 'error',
        category: 'files',
        title: 'Archivo traductor.py no encontrado',
        description: `No existe el archivo en: ${translatorPath}`,
        solution: 'Verifica que el archivo exista o reconfigura la ruta',
        autoFixable: false
      });
      return false;
    }

    this.addCheck('✅ Archivo traductor.py encontrado');
    return true;
  }

  async checkModsFolder(config) {
    const modsPath = config?.translator?.modsPath || config?.modsFolder || '';

    if (!modsPath) {
      this.addIssue({
        type: 'warning',
        category: 'config',
        title: 'Carpeta de mods no configurada',
        description: 'No se ha especificado la carpeta donde están los mods de Hades',
        solution: 'Configura la ruta en la pestaña Mods → ⚙️ Configuración',
        autoFixable: false
      });
      return false;
    }

    if (!fs.existsSync(modsPath)) {
      this.addIssue({
        type: 'error',
        category: 'files',
        title: 'Carpeta de mods no existe',
        description: `La carpeta configurada no existe: ${modsPath}`,
        solution: 'Crea la carpeta o cambia la configuración a una ruta válida',
        autoFixable: false
      });
      return false;
    }

    // Verificar permisos de escritura
    try {
      fs.accessSync(modsPath, fs.constants.W_OK);
      this.addCheck('✅ Carpeta de mods accesible y con permisos de escritura');
    } catch (err) {
      this.addIssue({
        type: 'warning',
        category: 'permissions',
        title: 'Sin permisos de escritura en carpeta de mods',
        description: 'No se pueden escribir archivos en la carpeta de mods',
        solution: 'Ejecuta la aplicación como administrador o cambia los permisos de la carpeta',
        autoFixable: false
      });
    }

    return true;
  }

  async checkModImporter(config) {
    const importerPath = config?.translator?.importerPath || '';

    if (!importerPath) {
      this.addIssue({
        type: 'info',
        category: 'config',
        title: 'Mod Importer no configurado',
        description: 'No se ha especificado la ruta del Mod Importer',
        solution: 'Opcional: Configura la ruta si quieres ejecutar el importer desde la app',
        autoFixable: false
      });
      return false;
    }

    if (!fs.existsSync(importerPath)) {
      this.addIssue({
        type: 'warning',
        category: 'files',
        title: 'Mod Importer no encontrado',
        description: `No existe: ${importerPath}`,
        solution: 'Descarga el Mod Importer de Nexus Mods o SGG Forums',
        autoFixable: false
      });
      return false;
    }

    this.addCheck('✅ Mod Importer encontrado');
    return true;
  }

  async checkJSONFiles() {
    const filesToCheck = [
      'armas.json',
      'dioses.json',
      'recuerdos.json',
      'mods-config.json',
      'mods-database.json'
    ];

    const basePath = path.dirname(require.main.filename);

    for (const file of filesToCheck) {
      const filePath = path.join(basePath, file);
      
      if (!fs.existsSync(filePath)) {
        this.addIssue({
          type: 'error',
          category: 'files',
          title: `Archivo ${file} no encontrado`,
          description: `Falta el archivo de datos: ${file}`,
          solution: 'Reinstala la aplicación o restaura los archivos faltantes',
          autoFixable: false,
          critical: file !== 'mods-database.json'
        });
        continue;
      }

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        this.addCheck(`✅ ${file} válido`);
      } catch (err) {
        this.addIssue({
          type: 'error',
          category: 'data',
          title: `Archivo ${file} corrupto`,
          description: `El archivo JSON tiene errores: ${err.message}`,
          solution: 'Restaura el archivo desde el repositorio o recrea la configuración',
          autoFixable: false,
          critical: true
        });
      }
    }
  }

  async checkNodeModules() {
    const basePath = path.dirname(require.main.filename);
    const nodeModulesPath = path.join(basePath, 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
      this.addIssue({
        type: 'error',
        category: 'dependencies',
        title: 'Dependencias no instaladas',
        description: 'Falta la carpeta node_modules',
        solution: 'Ejecuta "npm install" en la carpeta de la aplicación',
        autoFixable: false,
        critical: true
      });
      return false;
    }

    // Verificar módulos críticos
    const criticalModules = ['electron'];
    for (const mod of criticalModules) {
      const modPath = path.join(nodeModulesPath, mod);
      if (!fs.existsSync(modPath)) {
        this.addIssue({
          type: 'error',
          category: 'dependencies',
          title: `Módulo ${mod} no instalado`,
          description: `Falta el módulo crítico: ${mod}`,
          solution: `Ejecuta "npm install ${mod}"`,
          autoFixable: false
        });
      }
    }

    this.addCheck('✅ Dependencias de Node.js instaladas');
    return true;
  }

  async checkDiskSpace() {
    // Esto es más complejo en Electron, por ahora solo verificamos si la carpeta de mods tiene espacio
    return true;
  }

  // ==================== UTILIDADES ====================

  execPromise(command) {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout || stderr);
        }
      });
    });
  }

  addIssue(issue) {
    this.issues.push({
      ...issue,
      timestamp: new Date().toISOString()
    });
    
    if (this.onIssueFound) {
      this.onIssueFound(issue);
    }
  }

  addCheck(message) {
    this.checks.push({
      message,
      timestamp: new Date().toISOString()
    });
  }

  // ==================== DIAGNÓSTICO COMPLETO ====================

  async runFullDiagnostic(config) {
    console.log('🔍 Iniciando diagnóstico completo...');
    this.issues = [];
    this.warnings = [];
    this.checks = [];

    await this.checkNodeModules();
    await this.checkJSONFiles();
    await this.checkPythonInstallation();
    await this.checkTranslatorFile(config);
    await this.checkModsFolder(config);
    await this.checkModImporter(config);

    const result = {
      success: this.issues.filter(i => i.type === 'error' && i.critical).length === 0,
      issues: this.issues,
      checks: this.checks,
      summary: {
        errors: this.issues.filter(i => i.type === 'error').length,
        warnings: this.issues.filter(i => i.type === 'warning').length,
        info: this.issues.filter(i => i.type === 'info').length,
        checks: this.checks.length
      }
    };

    console.log('✅ Diagnóstico completado:', result.summary);
    
    if (this.onCheckComplete) {
      this.onCheckComplete(result);
    }

    return result;
  }

  // ==================== SUGERENCIAS AUTOMÁTICAS ====================

  getSuggestedFixes() {
    const fixes = [];

    // Buscar issues que puedan tener solución automática
    const pythonIssue = this.issues.find(i => i.category === 'python');
    if (pythonIssue) {
      fixes.push({
        issue: pythonIssue,
        action: 'open_external',
        target: 'https://python.org',
        label: 'Descargar Python'
      });
    }

    const configIssues = this.issues.filter(i => i.category === 'config');
    if (configIssues.length > 0) {
      fixes.push({
        issues: configIssues,
        action: 'open_config',
        label: 'Abrir configuración'
      });
    }

    return fixes;
  }

  // ==================== EXPORTAR REPORTE ====================

  generateReport() {
    const lines = [
      '=== REPORTE DE DIAGNÓSTICO ===',
      `Fecha: ${new Date().toLocaleString()}`,
      '',
      '=== CHECKS COMPLETADOS ===',
      ...this.checks.map(c => c.message),
      '',
      '=== PROBLEMAS ENCONTRADOS ===',
      ...this.issues.map(i => `[${i.type.toUpperCase()}] ${i.title}: ${i.description}`),
      '',
      '=== RESUMEN ===',
      `Errores: ${this.issues.filter(i => i.type === 'error').length}`,
      `Advertencias: ${this.issues.filter(i => i.type === 'warning').length}`,
      `Info: ${this.issues.filter(i => i.type === 'info').length}`,
      `Checks OK: ${this.checks.length}`
    ];

    return lines.join('\n');
  }

  async saveReport() {
    const report = this.generateReport();
    const reportPath = path.join(
      require('os').homedir(),
      'AppData',
      'Roaming',
      'HadesCoach',
      'diagnostic-reports'
    );

    if (!fs.existsSync(reportPath)) {
      fs.mkdirSync(reportPath, { recursive: true });
    }

    const filename = `diagnostic-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    const fullPath = path.join(reportPath, filename);

    fs.writeFileSync(fullPath, report, 'utf8');
    return fullPath;
  }
}

// Crear instancia singleton
const bugDetector = new BugDetector();

module.exports = bugDetector;
