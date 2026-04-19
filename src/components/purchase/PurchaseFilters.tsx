import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Category } from '@/lib/types';

interface PurchaseFiltersProps {
  categories: Category[];
  selectedCategory: string;
  searchTerm: string;
  dateRange: { start: string; end: string };
  statusFilter: string;
  onCategoryChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onStatusChange: (value: string) => void;
  onReset: () => void;
}

export function PurchaseFilters({
  categories,
  selectedCategory,
  searchTerm,
  dateRange,
  statusFilter,
  onCategoryChange,
  onSearchChange,
  onDateRangeChange,
  onStatusChange,
  onReset,
}: PurchaseFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">进货状态:</span>
        <Select value={statusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-28 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="sent">已发送</SelectItem>
            <SelectItem value="delivered">已到货</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">商品分类:</span>
        <Select value={selectedCategory} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-36 h-8">
            <SelectValue placeholder="全部分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部分类</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Input
        placeholder="搜索商品名称、供应商..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-48 h-8"
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">日期:</span>
        <Input
          type="date"
          value={dateRange.start}
          onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
          className="w-32 h-8"
        />
        <span className="text-slate-400">至</span>
        <Input
          type="date"
          value={dateRange.end}
          onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
          className="w-32 h-8"
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="h-8 text-slate-500"
      >
        🔄 重置筛选
      </Button>
    </div>
  );
}
