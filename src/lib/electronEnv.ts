export const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

export const electronAPI = isElectron ? (window as any).electronAPI : null;