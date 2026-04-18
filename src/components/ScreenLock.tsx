import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useIdleTimer } from '@/hooks/useIdleTimer';
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
  const [showLockDialog, setShowLockDialog] = useState(false);

  useEffect(() => {
    if (isLocked) {
      setShowLockDialog(true);
      setError('');
      setPassword('');
    } else {
      setShowLockDialog(false);
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
    if (window.confirm('确定要退出登录吗？')) {
      onLogout();
    }
  };

  return (
    <Dialog open={showLockDialog} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl">🔒 系统已锁定</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-center text-slate-500 text-sm">
            已闲置 {idleTimeoutMinutes} 分钟，请输入密码解锁
          </p>

          <div className="space-y-2">
            <Input
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
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleLogout}>
              退出登录
            </Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={handleUnlock}>
              解锁
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
    <>
      {isLocked && (
        <div
          className="fixed inset-0 z-[9998] bg-slate-900/20 backdrop-blur-sm"
          style={{ backdropFilter: 'blur(8px)' }}
        />
      )}
      <ScreenLock
        isLocked={isLocked}
        onUnlock={onUnlock}
        idleTimeoutMinutes={idleTimeoutMinutes}
        onLogout={onLogout}
        lockPassword={lockPassword}
      />
    </>
  );
}
