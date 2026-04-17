import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';

const pageTitles: Record<string, string> = {
  '/dashboard': '首页',
  '/inventory': '库存管理',
  '/purchases': '进货管理',
  '/sales': '销售记录',
  '/sales/new': '新增销售',
  '/products': '商品管理',
  '/products/new': '添加商品',
  '/customers': '客户管理',
  '/projects': '项目管理',
  '/reports': '报表统计',
  '/settings': '系统设置',
};

export function Header() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || '折柳建材管理系统';

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
        <p className="text-sm text-slate-500">
          {dayjs().format('YYYY年MM月DD日 dddd')}
        </p>
      </div>

      <div className="flex items-center gap-4">
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
