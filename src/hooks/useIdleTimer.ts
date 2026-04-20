import { useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeout: number;
  onIdle: () => void;
  enabled?: boolean;
}

export function useIdleTimer({ timeout, onIdle, enabled = true }: UseIdleTimerOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isIdleRef = useRef(false);
  // 使用 ref 存回调，避免依赖项问题
  const onIdleRef = useRef(onIdle);
  const timeoutRef = useRef(timeout);

  // 同步最新的回调
  useEffect(() => {
    onIdleRef.current = onIdle;
    timeoutRef.current = timeout;
  }, [onIdle, timeout]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (enabled && !isIdleRef.current && timeoutRef.current > 0) {
      timerRef.current = setTimeout(() => {
        isIdleRef.current = true;
        onIdleRef.current();
      }, timeoutRef.current);
    }
  }, [enabled]);

  const handleActivity = useCallback(() => {
    if (isIdleRef.current) {
      return;
    }
    resetTimer();
  }, [resetTimer]);

  const wakeUp = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isIdleRef.current = false;
    // 醒来后重新启动定时器
    if (enabled) {
      resetTimer();
    }
  }, [enabled, resetTimer]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    resetTimer();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, handleActivity, resetTimer]);

  return { resetTimer, wakeUp };
}

export function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} 小时`;
  }
  return `${hours} 小时 ${mins} 分钟`;
}
