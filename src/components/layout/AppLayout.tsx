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
    if (idleTimeoutMinutes > 0 && !isLocked) {
      console.log('💤 系统闲置，自动锁定');
      setIsLocked(true);
    }
  }, [idleTimeoutMinutes, isLocked]);

  const { wakeUp } = useIdleTimer({
    timeout: idleTimeoutMinutes * 60 * 1000,
    onIdle: handleIdle,
    enabled: idleTimeoutMinutes > 0 && !isLocked, // 锁定时停止计时
  });

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
    // 解锁后重置闲置计时器
    wakeUp();
    console.log('🔓 系统已解锁');
  }, [wakeUp]);

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
