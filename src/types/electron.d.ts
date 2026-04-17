export {};

declare global {
  interface Window {
    __ELECTRON__: boolean;
    electronAPI: {
      getAppVersion: () => Promise<string>;
      getAppPath: () => Promise<string>;
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
    };
  }
}
