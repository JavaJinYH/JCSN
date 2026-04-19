import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { recordFrequency } from '@/lib/frequency';
import type { Category } from '@/lib/types';

interface ProductFiltersProps {
  categories: Category[];
  selectedCategory: string;
  stockFilter: string;
  searchTerm: string;
  onCategoryChange: (value: string) => void;
  onStockFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onReset: () => void;
}

export function ProductFilters({
  categories,
  selectedCategory,
  stockFilter,
  searchTerm,
  onCategoryChange,
  onStockFilterChange,
  onSearchChange,
  onReset,
}: ProductFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={selectedCategory} onValueChange={(v) => { onCategoryChange(v); if (v !== 'all') recordFrequency('category', v); }}>
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

      <Select value={stockFilter} onValueChange={onStockFilterChange}>
        <SelectTrigger className="w-28 h-8">
          <SelectValue placeholder="库存状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部库存</SelectItem>
          <SelectItem value="normal">库存正常</SelectItem>
          <SelectItem value="low">库存预警</SelectItem>
          <SelectItem value="out">库存缺货</SelectItem>
        </SelectContent>
      </Select>

      <Input
        placeholder="搜索商品名称、规格参数、产品型号..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-48 h-8"
      />

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
