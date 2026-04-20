import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/Toast';

interface ScreenLockProps {
  isLocked: boolean;
  onUnlock: () => void;
  idleTimeoutMinutes: number;
  onLogout: () => void;
  lockPassword: string;
}

export function ScreenLock({ isLocked, onUnlock, idleTimeoutMinutes, onLogout, lockPassword }: ScreenLockProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 锁定时重置并聚焦输入框
  useEffect(() => {
    if (isLocked) {
      setError('');
      setPassword('');
      // 稍微延迟一下，确保 DOM 更新后再聚焦
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isLocked]);

  const handleUnlock = () => {
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    if (password !== lockPassword) {
      setError('密码错误');
      return;
    }
    onUnlock();
    setPassword('');
    setError('');
  };

  const handleLogout = () => {
    if (confirm('确定要关闭系统吗？')) {
      onLogout();
    } else {
      // 取消后重新聚焦
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  return (
    <>
      {isLocked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            style={{ backdropFilter: 'blur(8px)' }}
          />
          <div className="relative z-[10000] w-full max-w-md">
            <div className="bg-white rounded-lg shadow-2xl p-6">
              <div className="text-center mb-4">
                <h2 className="text-xl font-bold text-slate-800">🔒 系统已锁定</h2>
              </div>
              <div className="space-y-4">
                <p className="text-center text-slate-500 text-sm">
                  已闲置 {idleTimeoutMinutes} 分钟，请输入密码解锁
                </p>

                <div className="space-y-2">
                  <Input
                    ref={inputRef}
                    type="password"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUnlock();
                      }
                    }}
                  />
                  {error && (
                    <p className="text-red-500 text-sm text-center">{error}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={handleLogout}>
                    退出系统
                  </Button>
                  <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={handleUnlock}>
                    解锁
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface ScreenLockOverlayProps {
  isLocked: boolean;
  idleTimeoutMinutes: number;
  onUnlock: () => void;
  onLogout: () => void;
  lockPassword: string;
}

export function ScreenLockOverlay({ isLocked, idleTimeoutMinutes, onUnlock, onLogout, lockPassword }: ScreenLockOverlayProps) {
  return (
    <ScreenLock
      isLocked={isLocked}
      onUnlock={onUnlock}
      idleTimeoutMinutes={idleTimeoutMinutes}
      onLogout={onLogout}
      lockPassword={lockPassword}
    />
  );
}
