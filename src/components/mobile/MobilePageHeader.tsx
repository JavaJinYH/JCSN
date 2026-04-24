import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMobileApi } from '@/services/MobileApiService';

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  rightContent?: React.ReactNode;
}

export function MobilePageHeader({
  title,
  subtitle,
  onRefresh,
  rightContent
}: MobilePageHeaderProps) {
  const { isOnline, isCached, refreshStatus } = useMobileApi();
  
  return (
    <div className="space-y-3 px-4 pt-4 pb-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-slate-800 truncate">{title}</h2>
          {subtitle && <p className="text-slate-500 text-sm mt-0.5 truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isOnline ? (
            <Badge className="bg-green-100 text-green-700 text-xs">✅ 在线</Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 text-xs">📴 离线</Badge>
          )}
          {isCached && (
            <Badge className="bg-blue-100 text-blue-700 text-xs">💾 缓存</Badge>
          )}
          {rightContent}
        </div>
      </div>
      {onRefresh && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs h-7">
            🔄 刷新
          </Button>
        </div>
      )}
    </div>
  );
}

export function MobileSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-semibold text-slate-800 text-sm px-4">{children}</h3>
  );
}

export function MobileCardGrid({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 px-4 ${className}`}>
      {children}
    </div>
  );
}

export function MobileCardItem({
  label,
  value,
  gradient,
  icon
}: {
  label: string;
  value: React.ReactNode;
  gradient?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl p-3 ${gradient || 'bg-slate-50'}`}>
      <div className="text-xs text-slate-500 truncate">{icon} {label}</div>
      <div className="text-xl font-bold text-slate-800 truncate mt-1">{value}</div>
    </div>
  );
}

export function MobileList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`space-y-3 px-4 ${className}`}>{children}</div>;
}

export function MobileEmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-slate-500">
      <div className="text-4xl mb-2">📭</div>
      <div>{message}</div>
    </div>
  );
}

export function MobileLoadingState({ message = '加载中...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center h-64 text-slate-500">
      <div className="text-center">
        <div className="text-3xl animate-pulse">⏳</div>
        <div className="mt-2">{message}</div>
      </div>
    </div>
  );
}
