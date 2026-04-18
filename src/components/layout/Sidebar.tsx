import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const menuItems = [
  { path: '/dashboard', label: '首页', icon: '📊' },
  { path: '/inventory', label: '库存管理', icon: '📦' },
  { path: '/purchases', label: '进货管理', icon: '📥' },
  { path: '/sales', label: '销售管理', icon: '💰' },
  { path: '/products', label: '商品管理', icon: '🏷️' },
  { path: '/brands', label: '品牌管理', icon: '🏷️' },
  { path: '/customers', label: '客户管理', icon: '👥' },
  { path: '/contacts', label: '联系人管理', icon: '🧑' },
  { path: '/entities', label: '结账主体', icon: '🏢' },
  { path: '/projects', label: '项目管理', icon: '🏗️' },
  { path: '/rebates', label: '回扣管理', icon: '💵' },
  { path: '/deliveries', label: '配送管理', icon: '🚚' },
  { path: '/settlements', label: '挂账结算', icon: '📋' },
  { path: '/collections', label: '催账记录', icon: '📞' },
  { path: '/statements', label: '对账单', icon: '📄' },
  { path: '/photos', label: '照片管理', icon: '📷' },
  { path: '/reports', label: '报表统计', icon: '📈' },
  { path: '/purchase-history', label: '进货价格历史', icon: '📊' },
  { path: '/legacy-bills', label: '历史账单迁移', icon: '📋' },
  { path: '/audit-logs', label: '操作日志', icon: '📝' },
  { path: '/settings', label: '系统设置', icon: '⚙️' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-slate-800 text-white transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl">🏠</span>
            <span className="font-bold text-lg">折柳建材</span>
          </div>
        )}
        {collapsed && <span className="text-xl mx-auto">🏠</span>}
      </div>

      <nav className="p-2 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              )
            }
          >
            <span className="text-lg">{item.icon}</span>
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="absolute bottom-4 right-0 transform translate-x-1/2 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  );
}
