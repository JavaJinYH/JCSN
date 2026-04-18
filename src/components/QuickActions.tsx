import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTopActions, recordAction, type QuickAction } from '@/lib/quickActions';
import { Button } from '@/components/ui/button';

export function QuickActions() {
  const [topActions, setTopActions] = useState<QuickAction[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setTopActions(getTopActions(4));
  }, [refreshKey]);

  const handleClick = (path: string) => {
    recordAction(path);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-slate-600">⚡ 快捷操作</h3>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          className="text-xs text-slate-400 hover:text-slate-600"
          title="刷新"
        >
          ↻
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {topActions.length > 0 ? (
          topActions.map((action) => (
            <Link
              key={action.path}
              to={action.path}
              onClick={() => handleClick(action.path)}
              className="block"
            >
              <Button
                variant="outline"
                className="w-full justify-start text-sm h-auto py-2 px-3"
              >
                <span className="mr-2">{action.icon}</span>
                <span className="truncate">{action.label}</span>
              </Button>
            </Link>
          ))
        ) : (
          <div className="col-span-2 text-center text-sm text-slate-400 py-4">
            暂无使用记录<br />
            <span className="text-xs">点击功能后会记录使用频率</span>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-2 text-center">
        根据使用频率自动调整
      </p>
    </div>
  );
}
