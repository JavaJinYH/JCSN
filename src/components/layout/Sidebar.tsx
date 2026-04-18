import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface MenuItem {
  path: string;
  label: string;
  icon: string;
}

interface MenuGroup {
  title: string;
  icon: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: '首页',
    icon: '📊',
    items: [
      { path: '/dashboard', label: '首页', icon: '📊' },
    ],
  },
  {
    title: '业务管理',
    icon: '💼',
    items: [
      { path: '/inventory', label: '库存管理', icon: '📦' },
      { path: '/purchases', label: '进货管理', icon: '📥' },
      { path: '/sales', label: '销售管理', icon: '💰' },
      { path: '/products', label: '商品管理', icon: '🏷️' },
    ],
  },
  {
    title: '客户与项目',
    icon: '👥',
    items: [
      { path: '/contacts', label: '联系人管理', icon: '🧑' },
      { path: '/entities', label: '挂靠主体', icon: '🏢' },
      { path: '/projects', label: '项目管理', icon: '🏗️' },
    ],
  },
  {
    title: '配送与回扣',
    icon: '🚚',
    items: [
      { path: '/deliveries', label: '配送管理', icon: '🚚' },
      { path: '/rebates', label: '回扣管理', icon: '💵' },
    ],
  },
  {
    title: '账务管理',
    icon: '💳',
    items: [
      { path: '/settlements', label: '挂账结算', icon: '📋' },
      { path: '/collections', label: '催账记录', icon: '📞' },
      { path: '/statements', label: '欠款统计', icon: '📄' },
    ],
  },
  {
    title: '系统工具',
    icon: '🛠️',
    items: [
      { path: '/photos', label: '照片管理', icon: '📷' },
      { path: '/reports', label: '报表统计', icon: '📈' },
    ],
  },
  {
    title: '系统',
    icon: '⚙️',
    items: [
      { path: '/legacy-bills', label: '历史账单迁移', icon: '📋' },
      { path: '/audit-logs', label: '操作日志', icon: '📝' },
      { path: '/settings', label: '系统设置', icon: '⚙️' },
    ],
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['首页', '业务管理', '客户与项目']);

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-slate-800 text-white transition-all duration-300 z-50 flex flex-col',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex-none h-16 px-4 border-b border-slate-700 flex items-center">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="text-xl">🏠</span>
            <span className="font-bold text-lg">折柳建材</span>
          </div>
        )}
        {collapsed && <span className="text-xl mx-auto">🏠</span>}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {menuGroups.map((group) => {
          const isExpanded = expandedGroups.includes(group.title);
          const hasActiveItem = group.items.some((item) =>
            window.location.pathname.startsWith(item.path)
          );

          return (
            <div key={group.title} className="mb-2">
              {!collapsed ? (
                <>
                  <button
                    onClick={() => toggleGroup(group.title)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm font-medium',
                      hasActiveItem || isExpanded
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">{group.icon}</span>
                      {group.title}
                    </span>
                    <span
                      className={cn(
                        'text-xs transition-transform',
                        isExpanded ? 'rotate-180' : ''
                      )}
                    >
                      ▼
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="mt-1 ml-2 space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm',
                              collapsed ? 'justify-center' : '',
                              isActive
                                ? 'bg-orange-500 text-white'
                                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                            )
                          }
                        >
                          <span className="text-base">{item.icon}</span>
                          {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="relative group">
                  <NavLink
                    to={group.items[0].path}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-center px-3 py-2.5 rounded-lg transition-colors',
                        isActive
                          ? 'bg-orange-500 text-white'
                          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                      )
                    }
                  >
                    <span className="text-lg">{group.icon}</span>
                  </NavLink>
                  <div className="absolute left-full top-0 ml-2 hidden group-hover:block bg-slate-700 rounded-lg shadow-lg py-1 min-w-40 z-50">
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-400 border-b border-slate-600">
                      {group.title}
                    </div>
                    {group.items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2 px-3 py-2 text-sm',
                            isActive
                              ? 'bg-orange-500 text-white'
                              : 'text-slate-300 hover:bg-slate-600 hover:text-white'
                          )
                        }
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex-none p-2">
        <button
          onClick={onToggle}
          className="w-full py-2 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>
    </aside>
  );
}
