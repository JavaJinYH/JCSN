import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

const pageTitles: Record<string, string> = {
  '/dashboard': '首页',
  '/inventory': '库存管理',
  '/purchases': '进货管理',
  '/sales': '销售记录',
  '/sales/new': '新增销售',
  '/products': '商品管理',
  '/products/new': '添加商品',
  '/projects': '项目管理',
  '/reports': '报表统计',
  '/settings': '系统设置',
};

export function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || '折柳建材管理系统';
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false);

  // 检查是否是 Electron 环境（通过 electronAPI 是否存在）
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  // 初始化置顶状态
  useEffect(() => {
    if (isElectron && window.electronAPI?.window?.isAlwaysOnTop) {
      window.electronAPI.window.isAlwaysOnTop().then((result) => {
        if (result.success) {
          setIsAlwaysOnTop(result.isAlwaysOnTop || false);
        }
      });
    }
  }, [isElectron]);

  const toggleAlwaysOnTop = async () => {
    if (!isElectron || !window.electronAPI?.window?.setAlwaysOnTop) return;
    const newState = !isAlwaysOnTop;
    setIsAlwaysOnTop(newState); // 先立即更新 UI
    const result = await window.electronAPI.window.setAlwaysOnTop(newState);
    if (result.success) {
      setIsAlwaysOnTop(result.isAlwaysOnTop || false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500">
          {dayjs().format('YYYY年MM月DD日 dddd')}
        </p>
      </div>

      <div className="flex items-center gap-4">
        {isElectron && (
          <button
            onClick={toggleAlwaysOnTop}
            title={isAlwaysOnTop ? '取消置顶' : '置顶窗口'}
            className={`p-2 rounded-lg transition-all ${
              isAlwaysOnTop
                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isAlwaysOnTop ? '🔒' : '🔓'}
          </button>
        )}
        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          🔔
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
          <span className="text-sm text-slate-600">当前用户:</span>
          <span className="text-sm font-medium text-slate-800">店主</span>
        </div>
      </div>
    </header>
  );
}
