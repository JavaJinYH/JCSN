import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState, useEffect, useCallback } from 'react';
import { ScreenLockOverlay } from '@/components/ScreenLock';
import { SettingsService } from '@/services/SettingsService';
import { useIdleTimer } from '@/hooks/useIdleTimer';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(0);
  const [lockPassword, setLockPassword] = useState('123456');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await SettingsService.getSettings();
        if (settings) {
          if (settings.idleTimeoutMinutes !== undefined) {
            setIdleTimeoutMinutes(settings.idleTimeoutMinutes);
          }
          if (settings.lockPassword) {
            setLockPassword(settings.lockPassword);
          }
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    };
    loadSettings();
  }, []);

  const handleIdle = useCallback(() => {
    if (idleTimeoutMinutes > 0) {
      setIsLocked(true);
    }
  }, [idleTimeoutMinutes]);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const handleLogout = useCallback(() => {
    if (window.confirm('确定要关闭系统吗？')) {
      const isElectron = window.electronAPI !== undefined;
      if (isElectron) {
        (window as any).electronAPI?.app?.close?.();
      } else {
        window.close();
      }
    }
  }, []);

  useIdleTimer({
    timeout: idleTimeoutMinutes * 60 * 1000,
    onIdle: handleIdle,
    enabled: idleTimeoutMinutes > 0 && !isLocked,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        }`}
      >
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <ScreenLockOverlay
        isLocked={isLocked}
        idleTimeoutMinutes={idleTimeoutMinutes}
        onUnlock={handleUnlock}
        onLogout={handleLogout}
        lockPassword={lockPassword}
      />
    </div>
  );
}
