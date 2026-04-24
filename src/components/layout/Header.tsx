import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';
import { isElectron, electronAPI } from '@/lib/electronEnv';

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
  const [showMoney, setShowMoney] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_showMoney');
    if (saved === 'true') setShowMoney(true);
  }, []);

  useEffect(() => {
    if (isElectron && electronAPI?.api?.getUrl) {
      electronAPI.api.getUrl().then((result: any) => {
        if (result.success && result.data?.url) {
          setApiUrl(result.data.url);
        }
      });
    }
   }, []);

  const toggleShowMoney = () => {
    const newValue = !showMoney;
    setShowMoney(newValue);
    localStorage.setItem('dashboard_showMoney', String(newValue));
    window.dispatchEvent(new CustomEvent('showMoneyChanged', { detail: newValue }));
  };

  // 初始化置顶状态
  useEffect(() => {
    if (isElectron && electronAPI?.window?.isAlwaysOnTop) {
      electronAPI.window.isAlwaysOnTop().then((result: any) => {
        if (result.success && result.isAlwaysOnTop !== undefined) {
          setIsAlwaysOnTop(result.isAlwaysOnTop);
        }
      });
    }
  }, []);

  const toggleAlwaysOnTop = async () => {
    if (!isElectron || !electronAPI?.window?.setAlwaysOnTop) return;

    try {
      const result = await electronAPI.window.setAlwaysOnTop(!isAlwaysOnTop);
      if (result.success && result.isAlwaysOnTop !== undefined) {
        setIsAlwaysOnTop(result.isAlwaysOnTop);
      }
    } catch (error) {
      console.error('Failed to toggle always on top:', error);
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
        <button
          onClick={toggleShowMoney}
          title={showMoney ? '隐藏金额' : '显示金额'}
          className="p-2 rounded-lg transition-all text-slate-500 hover:text-slate-700 hover:bg-slate-100"
        >
          {showMoney ? '💰' : '💰ₓ'}
        </button>
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
        {apiUrl && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-600 text-sm">📱:</span>
            <code className="text-green-700 text-xs font-mono">{apiUrl}</code>
          </div>
        )}
      </div>
    </header>
  );
}