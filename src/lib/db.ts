import { isElectron, electronAPI } from './electronEnv';

function createModelProxy(modelName: string): any {
  return new Proxy({}, {
    get(_target, operation: string | symbol) {
      if (typeof operation === 'symbol') return undefined;
      if (operation === 'then') return undefined;

      return async (...args: any[]) => {
        try {
          if (!isElectron || !electronAPI?.db) {
            throw new Error('数据库不可用：仅支持在 Electron 桌面端访问');
          }

          const result = await electronAPI.db(modelName, operation, args[0]);

          if (result && typeof result === 'object' && 'success' in result) {
            if (!result.success) {
              throw new Error(result.error || `${modelName}.${operation} 失败`);
            }
            return result.data;
          }

          return result;
        } catch (error: any) {
          console.error(`[DB] ${modelName}.${operation} 错误:`, error.message);
          throw error;
        }
      };
    }
  });
}

const dbHandler: ProxyHandler<object> = {
  get(_target, prop: string | symbol): any {
    if (typeof prop !== 'string') return undefined;
    if (prop === '$connect' || prop === '$disconnect') return () => Promise.resolve();
    return createModelProxy(prop);
  }
};

export const db = new Proxy({}, dbHandler) as any;
