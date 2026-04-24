import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { isMobile } from '@/components/DesktopOnlyRoute';

const allMenuItems = [
  { path: '/dashboard', label: '首页', icon: '📊' },
  { path: '/inventory', label: '库存', icon: '📦' },
  { path: '/sales', label: '销售', icon: '💰' },
  { path: '/purchases', label: '进货', icon: '📥' },
  {
    path: isMobile ? '/mobile/settlements' : '/settlements',
    label: '挂账',
    icon: '📋'
  },
  {
    path: isMobile ? '/mobile/collections' : '/collections',
    label: '催账',
    icon: '📞'
  },
  { path: '/mobile/pending-documents', label: '待拍照', icon: '📷' }
];

const menuItems = isMobile
  ? [
      { path: '/mobile/dashboard', label: '首页', icon: '📊' },
      { path: '/mobile/pending-documents', label: '待拍照', icon: '📷' },
      { path: '/mobile/inventory', label: '库存', icon: '📦' },
      { path: '/mobile/sales', label: '销售', icon: '💰' },
      { path: '/mobile/purchases', label: '进货', icon: '📥' },
      { path: '/mobile/settlements', label: '挂账', icon: '📋' },
      { path: '/mobile/collections', label: '催账', icon: '📞' }
    ]
  : allMenuItems;

export function MobileBottomNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* 导航栏 */}
      <nav className="bg-slate-800 text-white border-t border-slate-700">
        <div className="flex items-center justify-around h-16">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center w-full h-full text-xs transition-colors',
                  isActive ? 'text-orange-400 bg-slate-700' : 'text-slate-300 hover:bg-slate-700'
                )
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
