import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useState, useEffect, useCallback } from 'react';
import { ScreenLockOverlay } from '@/components/ScreenLock';
import { db } from '@/lib/db';
import { useIdleTimer } from '@/hooks/useIdleTimer';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(5);
  const [lockPassword, setLockPassword] = useState('123456');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await db.systemSetting.findUnique({ where: { id: 'default' } });
        if (settings) {
          if ((settings as any).idleTimeoutMinutes) {
            setIdleTimeoutMinutes((settings as any).idleTimeoutMinutes);
          }
          if ((settings as any).lockPassword) {
            setLockPassword((settings as any).lockPassword);
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
    setIsLocked(false);
    window.location.href = '/';
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
