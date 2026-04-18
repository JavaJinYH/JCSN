import { recordFrequency, getAllFrequency, sortByFrequency, type SortableItem } from './frequency';

export interface QuickAction {
  path: string;
  label: string;
  icon: string;
  count: number;
}

const defaultActions: Omit<QuickAction, 'count'>[] = [
  { path: '/sales/new', label: '新增销售', icon: '💰' },
  { path: '/purchases', label: '进货管理', icon: '📥' },
  { path: '/inventory', label: '库存管理', icon: '📦' },
  { path: '/products', label: '商品管理', icon: '🏷️' },
  { path: '/contacts', label: '联系人', icon: '👤' },
  { path: '/entities', label: '挂靠主体', icon: '🏢' },
  { path: '/projects', label: '项目管理', icon: '🏗️' },
  { path: '/deliveries', label: '配送管理', icon: '🚚' },
  { path: '/rebates', label: '回扣管理', icon: '💵' },
  { path: '/settlements', label: '挂账结算', icon: '📋' },
  { path: '/collections', label: '催账记录', icon: '📞' },
  { path: '/statements', label: '欠款统计', icon: '📄' },
  { path: '/photos', label: '照片管理', icon: '📷' },
];

export function recordAction(path: string): void {
  recordFrequency('module', path);
}

export function getTopActions(limit: number = 4): QuickAction[] {
  const freqStats = getAllFrequency('module');
  const allActions: QuickAction[] = defaultActions.map(action => ({
    ...action,
    count: freqStats[action.path] || 0,
  }));
  allActions.sort((a, b) => b.count - a.count);
  return allActions.slice(0, limit);
}

export function resetStats(): void {
  import('./frequency').then(m => m.resetFrequency('module'));
}
