import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/dashboard', label: '首页', icon: '📊' },
  { path: '/inventory', label: '库存', icon: '📦' },
  { path: '/sales', label: '销售', icon: '💰' },
  { path: '/purchases', label: '进货', icon: '📥' },
  { path: '/mobile/pending-documents', label: '待拍照', icon: '📷' },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 text-white border-t border-slate-700 z-50">
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
  );
}
