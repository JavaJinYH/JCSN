const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');
const { PrismaClient } = require('@prisma/client');

log.initialize();
log.transports.file.level = 'info';
log.info('Application starting...');

let mainWindow;
let prisma;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 照片存储根目录 - 使用项目根目录
const getPhotosDir = () => {
  if (isDev) {
    return path.join(__dirname, '..', 'photos');
  } else {
    return path.join(path.dirname(app.getPath('exe')), 'photos');
  }
};

// 确保照片目录存在
const ensurePhotosDir = () => {
  const photosDir = getPhotosDir();
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
    log.info('Created photos directory:', photosDir);
  }
  return photosDir;
};

// 获取照片完整路径
const getPhotoPath = (relativePath) => {
  return path.join(getPhotosDir(), relativePath);
};

async function createWindow() {
  log.info('Creating main window...');

  prisma = new PrismaClient();

  try {
    await prisma.$connect();
    log.info('Database connected successfully');
  } catch (err) {
    log.error('Database connection failed:', err.message);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: isDev ? false : true,
    },
    show: false,
    backgroundColor: '#f8fafc',
  });

  mainWindow.once('ready-to-show', () => {
    log.info('Window ready to show');
    mainWindow.show();
  });

  if (isDev) {
    log.info('Loading development URL: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    log.info('Loading production file');
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    log.info('Main window closed');
    mainWindow = null;
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log.error(`Failed to load: ${errorCode} - ${errorDescription}`);
  });
}

function registerDbHandlers() {
  const models = [
    'category', 'product', 'customer', 'customerCategory', 'project',
    'sale', 'saleItem', 'payment', 'systemSetting', 'purchase',
    'rebate', 'deliveryFee', 'deliveryRecord',
    'accountReceivable', 'settlementAdjustment', 'paymentPlan', 'auditLog',
    'salePhoto', 'purchasePhoto', 'collectionRecord',
    'inventoryCheck', 'inventoryCheckItem',
    'saleSlip', 'saleSlipItem', 'customerFavoriteProduct',
    'customerPhone',
    'contact', 'contactPhone', 'entity', 'bizProject',
    'contactEntityRole', 'contactProjectRole',
    'saleOrder', 'orderItem', 'orderPayment', 'receivable',
    'saleOrderPhoto',
    'brand', 'productSpec', 'customerPrice',
    'saleReturn', 'saleReturnItem', 'badDebtWriteOff',
    'supplier',
    'purchaseReturn', 'purchaseReturnItem',
    'purchaseOrder',
  ];
  const operations = ['findMany', 'findFirst', 'findUnique', 'create', 'update', 'delete', 'upsert', 'count', 'updateMany'];

  models.forEach(model => {
    operations.forEach(operation => {
      ipcMain.handle(`db-${model}-${operation}`, async (event, args) => {
        try {
          const result = await prisma[model][operation](args);
          return { success: true, data: result };
        } catch (error) {
          log.error(`[IPC] DB Error [${model}.${operation}]:`, error.message);
          return { success: false, error: error.message };
        }
      });
    });
  });

  log.info(`Registered ${models.length * operations.length} DB IPC handlers`);
}

// 照片存储 IPC 处理器
function registerPhotoHandlers() {
  // 保存照片文件
  ipcMain.handle('photo-save', async (event, { fileName, dataUrl, subDir }) => {
    try {
      ensurePhotosDir();
      const targetDir = subDir ? path.join(getPhotosDir(), subDir) : getPhotosDir();
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const filePath = path.join(targetDir, fileName);
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      const relativePath = subDir ? `${subDir}/${fileName}` : fileName;
      log.info('Photo saved:', relativePath);
      return { success: true, data: { path: relativePath } };
    } catch (error) {
      log.error('[IPC] Photo save error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // 读取照片文件
  ipcMain.handle('photo-read', async (event, relativePath) => {
    try {
      const fullPath = getPhotoPath(relativePath);
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: '照片文件不存在' };
      }
      const buffer = fs.readFileSync(fullPath);
      const ext = path.extname(relativePath).toLowerCase();
      const mimeTypes = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp' };
      const mimeType = mimeTypes[ext] || 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      return { success: true, data: { dataUrl } };
    } catch (error) {
      log.error('[IPC] Photo read error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // 删除照片文件
  ipcMain.handle('photo-delete', async (event, relativePath) => {
    try {
      const fullPath = getPhotoPath(relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        log.info('Photo deleted:', relativePath);
      }
      return { success: true };
    } catch (error) {
      log.error('[IPC] Photo delete error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // 照片批量导出
  ipcMain.handle('photo-export', async (event, { photos, defaultFileName }) => {
    try {
      const { filePath } = await dialog.showSaveDialog(mainWindow, {
        title: '导出照片',
        defaultPath: defaultFileName || 'photos_export.zip',
        filters: [{ name: 'ZIP文件', extensions: ['zip'] }]
      });
      if (!filePath) {
        return { success: false, error: '用户取消导出' };
      }
      const archiver = require('archiver');
      const output = fs.createWriteStream(filePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      const result = await new Promise((resolve, reject) => {
        archive.pipe(output);

        for (const photo of photos) {
          const fullPath = getPhotoPath(photo.photoPath);
          if (fs.existsSync(fullPath)) {
            archive.file(fullPath, { name: photo.photoPath });
          }
        }

        output.on('close', () => {
          log.info('Photos exported:', filePath, 'Size:', archive.pointer(), 'bytes');
          resolve({ success: true, data: { path: filePath, count: photos.length, size: archive.pointer() } });
        });

        archive.on('error', (err) => {
          log.error('[IPC] Archive error:', err.message);
          reject(err);
        });

        archive.finalize();
      });

      return result;
    } catch (error) {
      log.error('[IPC] Photo export error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // 获取照片目录大小
  ipcMain.handle('photo-stats', async () => {
    try {
      ensurePhotosDir();
      const photosDir = getPhotosDir();
      let totalSize = 0;
      let fileCount = 0;
      const countFiles = (dir) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            countFiles(filePath);
          } else {
            totalSize += stat.size;
            fileCount++;
          }
        });
      };
      countFiles(photosDir);
      return { success: true, data: { totalSize, fileCount, path: photosDir } };
    } catch (error) {
      log.error('[IPC] Photo stats error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // 扫描照片目录，返回所有文件列表
  ipcMain.handle('photo-scan', async () => {
    try {
      ensurePhotosDir();
      const photosDir = getPhotosDir();
      const allFiles = [];

      const scanDir = (dir, relativeDir = '') => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath, relativeDir ? `${relativeDir}/${file}` : file);
          } else {
            const ext = path.extname(file).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
              allFiles.push({
                relativePath: relativeDir ? `${relativeDir}/${file}` : file,
                fullPath: fullPath,
                size: stat.size,
                modifiedAt: stat.mtime.toISOString()
              });
            }
          }
        });
      };

      scanDir(photosDir);
      log.info('Photo scan complete:', allFiles.length, 'files found');
      return { success: true, data: allFiles };
    } catch (error) {
      log.error('[IPC] Photo scan error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // 获取所有照片表中的路径记录
  ipcMain.handle('photo-getDbPaths', async () => {
    try {
      const tables = ['saleOrderPhoto', 'purchasePhoto'];
      const allPaths = {};

      for (const table of tables) {
        try {
          const records = await prisma[table].findMany({ select: { id: true, photoPath: true } });
          allPaths[table] = records;
        } catch (e) {
          log.warn(`[IPC] Table ${table} not found or error:`, e.message);
        }
      }

      return { success: true, data: allPaths };
    } catch (error) {
      log.error('[IPC] Photo getDbPaths error:', error.message);
      return { success: false, error: error.message };
    }
  });

  log.info('Registered photo IPC handlers');
}

// 应用重启功能
function registerAppHandlers() {
  ipcMain.handle('app-restart', async () => {
    log.info('App restart requested via IPC');
    if (prisma) {
      await prisma.$disconnect();
    }
    app.relaunch();
    app.exit(0);
  });

  ipcMain.handle('app-reload', async () => {
    log.info('App reload requested via IPC');
    if (mainWindow) {
      mainWindow.reload();
    }
  });

  log.info('Registered app IPC handlers');
}

app.whenReady().then(() => {
  log.info('App is ready');
  registerDbHandlers();
  registerPhotoHandlers();
  registerAppHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.info('All windows closed');
  if (prisma) {
    prisma.$disconnect().catch(() => {});
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled rejection:', reason);
});
