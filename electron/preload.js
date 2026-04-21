const { contextBridge, ipcRenderer } = require('electron');

// 设置 Electron 环境标志
contextBridge.exposeInMainWorld('__ELECTRON__', true);

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  app: {
    restart: () => ipcRenderer.invoke('app-restart'),
    reload: () => ipcRenderer.invoke('app-reload'),
    close: () => ipcRenderer.invoke('app-close'),
  },

  window: {
    setAlwaysOnTop: (flag) => ipcRenderer.invoke('window-setAlwaysOnTop', flag),
    isAlwaysOnTop: () => ipcRenderer.invoke('window-isAlwaysOnTop'),
  },

  db: (model, operation, args) => ipcRenderer.invoke(`db-${model}-${operation}`, args),

  photo: {
    save: (fileName, dataUrl, subDir) => ipcRenderer.invoke('photo-save', { fileName, dataUrl, subDir }),
    read: (relativePath) => ipcRenderer.invoke('photo-read', relativePath),
    delete: (relativePath) => ipcRenderer.invoke('photo-delete', relativePath),
    export: (photos, defaultFileName) => ipcRenderer.invoke('photo-export', { photos, defaultFileName }),
    stats: () => ipcRenderer.invoke('photo-stats'),
  }
});
