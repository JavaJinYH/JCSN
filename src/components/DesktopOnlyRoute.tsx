import { Navigate } from 'react-router-dom';

const isMobile = typeof window !== 'undefined' && !!(window as any).Capacitor;

interface DesktopOnlyRouteProps {
  children: React.ReactNode;
}

export function DesktopOnlyRoute({ children }: DesktopOnlyRouteProps) {
  if (isMobile) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-6xl mb-4">💻</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">此功能仅在桌面端可用</h2>
        <p className="text-slate-500 mb-4">请使用电脑访问完整功能</p>
        <Navigate to="/mobile/pending-documents" replace />
      </div>
    );
  }
  return <>{children}</>;
}

export { isMobile };