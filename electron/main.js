const { app, BrowserWindow, ipcMain, dialog, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const log = require('electron-log');
const { PrismaClient } = require('@prisma/client');
const express = require('express');
const cors = require('cors');

log.initialize();
log.transports.file.level = 'info';
log.info('Application starting...');

let mainWindow;
let prisma;
let expressServer;
let localApiUrl;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const API_PORT = 3456;

// 获取本机局域网 IP 地址
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface || []) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '127.0.0.1';
};

// 启动局域网 API 服务
const startApiServer = () => {
  const apiApp = express();
  apiApp.use(cors());
  apiApp.use(express.json({ limit: '50mb' }));
  apiApp.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // 健康检查
  apiApp.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'API server is running', timestamp: new Date().toISOString() });
  });

  // 获取待拍照单据列表
  apiApp.get('/api/pending-documents', async (req, res) => {
    try {
      // 获取没有照片的销售单和进货单
      const [saleOrders, purchases] = await Promise.all([
        prisma.saleOrder.findMany({
          include: { buyer: true },
          orderBy: { saleDate: 'desc' },
        }),
        prisma.purchase.findMany({
          include: { supplier: true },
          orderBy: { purchaseDate: 'desc' },
        }),
      ]);

      // 获取已有关联照片的单据 ID
      const [salePhotoOrders, purchasePhotoOrders] = await Promise.all([
        prisma.saleOrderPhoto.findMany({ select: { saleOrderId: true } }),
        prisma.purchasePhoto.findMany({ select: { purchaseId: true } }),
      ]);

      const saleWithPhotos = new Set(salePhotoOrders.map(p => p.saleOrderId));
      const purchaseWithPhotos = new Set(purchasePhotoOrders.map(p => p.purchaseId));

      const documents = [
        ...saleOrders.map(order => ({
          id: order.id,
          type: 'sale',
          invoiceNo: order.invoiceNo,
          date: order.saleDate,
          partyName: order.buyer?.name || '散客',
          amount: order.totalAmount,
          hasPhotos: saleWithPhotos.has(order.id),
          photoCount: saleWithPhotos.has(order.id) ? 1 : 0,
        })),
        ...purchases.map(p => ({
          id: p.id,
          type: 'purchase',
          invoiceNo: p.invoiceNo,
          date: p.purchaseDate,
          partyName: p.supplier?.name || '供应商',
          amount: p.totalAmount,
          hasPhotos: purchaseWithPhotos.has(p.id),
          photoCount: purchaseWithPhotos.has(p.id) ? 1 : 0,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json({ success: true, data: documents });
    } catch (error) {
      log.error('[API] pending-documents error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 获取单据详情
  apiApp.get('/api/document/:id', async (req, res) => {
    try {
      const id = req.params.id;

      // 先尝试找销售单
      let document = await prisma.saleOrder.findUnique({
        where: { id },
        include: { buyer: true, orderItems: { include: { product: true } } },
      });

      if (document) {
        res.json({
          success: true,
          data: {
            id: document.id,
            type: 'sale',
            invoiceNo: document.invoiceNo,
            date: document.saleDate,
            partyName: document.buyer?.name || '散客',
            amount: document.totalAmount,
            items: document.orderItems.map(item => ({
              productName: item.product?.name || '商品',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        });
        return;
      }

      // 再尝试找进货单
      document = await prisma.purchase.findUnique({
        where: { id },
        include: { supplier: true, items: { include: { product: true } } },
      });

      if (document) {
        res.json({
          success: true,
          data: {
            id: document.id,
            type: 'purchase',
            invoiceNo: document.invoiceNo,
            date: document.purchaseDate,
            partyName: document.supplier?.name || '供应商',
            amount: document.totalAmount,
            items: document.items.map(item => ({
              productName: item.product?.name || '商品',
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        });
        return;
      }

      res.status(404).json({ success: false, error: '单据不存在' });
    } catch (error) {
      log.error('[API] document detail error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 上传照片并关联单据
  apiApp.post('/api/document/:id/upload-photo', async (req, res) => {
    try {
      const id = req.params.id;
      const { dataUrl, photoType, remark } = req.body;

      // 尝试找销售单
      const saleOrder = await prisma.saleOrder.findUnique({ where: { id } });
      if (saleOrder) {
        // 保存照片文件
        const fileName = `sale_${id}_${Date.now()}.jpg`;
        const subDir = 'sales';
        const targetDir = subDir ? path.join(getPhotosDir(), subDir) : getPhotosDir();
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = path.join(targetDir, fileName);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        const relativePath = subDir ? `${subDir}/${fileName}` : fileName;

        // 保存数据库记录
        await prisma.saleOrderPhoto.create({
          data: {
            saleOrderId: id,
            photoPath: relativePath,
            photoType: photoType || 'receipt',
            photoRemark: remark,
          },
        });

        log.info('[API] Photo uploaded for sale order:', id);
        res.json({ success: true, data: { photoPath: relativePath } });
        return;
      }

      // 尝试找进货单
      const purchase = await prisma.purchase.findUnique({ where: { id } });
      if (purchase) {
        // 保存照片文件
        const fileName = `purchase_${id}_${Date.now()}.jpg`;
        const subDir = 'purchases';
        const targetDir = subDir ? path.join(getPhotosDir(), subDir) : getPhotosDir();
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const filePath = path.join(targetDir, fileName);
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        const relativePath = subDir ? `${subDir}/${fileName}` : fileName;

        // 保存数据库记录
        await prisma.purchasePhoto.create({
          data: {
            purchaseId: id,
            photoPath: relativePath,
            photoType: photoType || 'receipt',
            photoRemark: remark,
          },
        });

        log.info('[API] Photo uploaded for purchase:', id);
        res.json({ success: true, data: { photoPath: relativePath } });
        return;
      }

      res.status(404).json({ success: false, error: '单据不存在' });
    } catch (error) {
      log.error('[API] upload photo error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 获取库存列表（只读）
  apiApp.get('/api/inventory', async (req, res) => {
    try {
      const products = await prisma.product.findMany({
        include: { category: true, brand: true },
        orderBy: { name: 'asc' },
      });

      res.json({ success: true, data: products });
    } catch (error) {
      log.error('[API] inventory error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 获取销售单列表（只读）
  apiApp.get('/api/sales', async (req, res) => {
    try {
      const sales = await prisma.saleOrder.findMany({
        include: { buyer: true },
        orderBy: { saleDate: 'desc' },
        take: 100,
      });

      res.json({ success: true, data: sales });
    } catch (error) {
      log.error('[API] sales error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  expressServer = apiApp.listen(API_PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    localApiUrl = `http://${ip}:${API_PORT}`;
    log.info('API server started:', localApiUrl);
  });
};

// 停止 API 服务
const stopApiServer = () => {
  if (expressServer) {
    expressServer.close(() => {
      log.info('API server stopped');
    });
  }
};

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

  // 启动局域网 API 服务
  try {
    startApiServer();
    log.info('API server started successfully');
  } catch (err) {
    log.error('Failed to start API server:', err.message);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 320,
    minHeight: 480,
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
    log.info('Loading development URL: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173');
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
    'dailyCounter',
    'category', 'product', 'brand', 'productSpec', 'entityPrice', 'contactPrice',
    'contactCategory', 'systemSetting',
    'purchase', 'purchaseOrder', 'purchaseReturn', 'purchaseReturnItem',
    'deliveryFee', 'deliveryRecord',
    'paymentPlan', 'auditLog',
    'purchasePhoto', 'saleOrderPhoto', 'collectionRecord',
    'inventoryCheck', 'inventoryCheckItem',
    'contact', 'contactPhone', 'entity', 'bizProject',
    'contactEntityRole', 'contactProjectRole',
    'saleOrder', 'orderItem', 'orderPayment', 'receivable',
    'saleSlip', 'saleSlipItem',
    'saleReturn', 'saleReturnItem', 'badDebtWriteOff',
    'supplier', 'supplierPayment',
    'receivableAuditLog',
    'legacyBill',
    'businessCommission',
    'dailyExpense',
    'serviceAppointment', 'serviceAppointmentItem',
    'creditRecord',
  ];

  const toPascalCase = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const operations = ['findMany', 'findFirst', 'findUnique', 'create', 'update', 'delete', 'upsert', 'count', 'updateMany'];

  const registerModel = (modelName) => {
    const pascalModel = toPascalCase(modelName);
    operations.forEach(operation => {
      ipcMain.handle(`db-${modelName}-${operation}`, async (event, args) => {
        try {
          const result = await prisma[pascalModel][operation](args);
          return { success: true, data: result };
        } catch (error) {
          log.error(`[IPC] DB Error [${modelName}.${operation}]:`, error.message);
          return { success: false, error: error.message };
        }
      });
    });
  };

  models.forEach(model => {
    registerModel(model);
    const pascalModel = toPascalCase(model);
    if (model !== pascalModel) {
      registerModel(pascalModel);
    }
  });

  log.info(`Registered DB IPC handlers for ${models.length} models`);
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
  // 获取局域网 API URL
  ipcMain.handle('api-getUrl', async () => {
    return { success: true, data: { url: localApiUrl } };
  });

  ipcMain.handle('app-restart', async () => {
    log.info('App restart requested via IPC');
    stopApiServer();
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

  ipcMain.handle('app-close', async () => {
    log.info('App close requested via IPC');
    stopApiServer();
    if (prisma) {
      await prisma.$disconnect();
    }
    if (mainWindow) {
      mainWindow.close();
    }
    app.quit();
  });

  // 窗口置顶功能
  ipcMain.handle('window-setAlwaysOnTop', async (event, flag) => {
    log.info('Window setAlwaysOnTop requested:', flag);
    if (mainWindow) {
      try {
        if (flag) {
          // 置顶：使用 'screen-saver' 级别，这是 Windows 上最稳定的级别
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          mainWindow.moveTop();
          mainWindow.focus();
          log.info('Window set to always on top successfully with screen-saver level');
        } else {
          // 取消置顶
          mainWindow.setAlwaysOnTop(false);
          log.info('Window removed from always on top');
        }
        
        const currentState = mainWindow.isAlwaysOnTop();
        log.info('Current always on top state:', currentState);
        return { success: true, isAlwaysOnTop: currentState };
      } catch (error) {
        log.error('Error setting always on top:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Main window not found' };
  });

  ipcMain.handle('window-isAlwaysOnTop', async () => {
    if (mainWindow) {
      return { success: true, isAlwaysOnTop: mainWindow.isAlwaysOnTop() };
    }
    return { success: false, error: 'Main window not found' };
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
  stopApiServer();
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
