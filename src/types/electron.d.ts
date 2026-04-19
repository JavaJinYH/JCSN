export {};

declare global {
  interface Window {
    __ELECTRON__: boolean;
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppPath: () => Promise<string>;
      app: {
        restart: () => Promise<void>;
        reload: () => Promise<void>;
      };
      db: {
        findMany: (model: string, args?: any) => Promise<any>;
        findFirst: (model: string, args?: any) => Promise<any>;
        findUnique: (model: string, args?: any) => Promise<any>;
        create: (model: string, args?: any) => Promise<any>;
        update: (model: string, args?: any) => Promise<any>;
        delete: (model: string, args?: any) => Promise<any>;
        upsert: (model: string, args?: any) => Promise<any>;
        count: (model: string, args?: any) => Promise<any>;
        updateMany: (model: string, args?: any) => Promise<any>;
      };
      photo: {
        save: (fileName: string, dataUrl: string, subDir?: string) => Promise<any>;
        read: (photoPath: string) => Promise<any>;
        delete: (photoPath: string) => Promise<any>;
        export: (photos: { photoPath: string }[], defaultFileName?: string) => Promise<any>;
        stats: () => Promise<{ success: boolean; data?: { totalSize: number; fileCount: number; path: string } }>;
        scan: () => Promise<{ success: boolean; data?: { relativePath: string; fullPath: string; size: number; modifiedAt: string }[] }>;
        getDbPaths: () => Promise<{ success: boolean; data?: Record<string, { id: string; photoPath: string }[]> }>;
      };
    };
  }
}
