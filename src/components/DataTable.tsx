import * as React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'numberRange';
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  total: number;
}

export interface DataTableFiltersProps {
  filters: FilterOption[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onReset: () => void;
}

export function DataTableFilters({ filters, values, onChange, onReset }: DataTableFiltersProps) {
  const hasActiveFilters = Object.values(values).some((v) => {
    if (Array.isArray(v)) return v.some((item) => item !== '' && item !== null && item !== undefined);
    return v !== '' && v !== null && v !== undefined;
  });

  return (
    <div className="flex items-center gap-3 flex-wrap p-3 bg-slate-50 rounded-lg">
      {filters.map((filter) => {
        if (filter.type === 'text') {
          return (
            <div key={filter.key} className="flex items-center gap-2">
              <Input
                placeholder={filter.placeholder || `搜索${filter.label}...`}
                value={values[filter.key] || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="w-48 h-8 text-sm"
              />
            </div>
          );
        }

        if (filter.type === 'select') {
          return (
            <div key={filter.key} className="flex items-center gap-2">
              <Select
                value={values[filter.key] || '__all__'}
                onValueChange={(value) => onChange(filter.key, value === '__all__' ? '' : value)}
              >
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue placeholder={filter.placeholder || `选择${filter.label}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">全部{filter.label}</SelectItem>
                  {filter.options?.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        if (filter.type === 'date') {
          return (
            <div key={filter.key} className="flex items-center gap-2">
              <span className="text-sm text-slate-500 whitespace-nowrap">{filter.label}:</span>
              <Input
                type="date"
                value={values[filter.key] || ''}
                onChange={(e) => onChange(filter.key, e.target.value)}
                className="w-36 h-8 text-sm"
              />
            </div>
          );
        }

        if (filter.type === 'dateRange') {
          const startKey = `${filter.key}Start`;
          const endKey = `${filter.key}End`;
          return (
            <div key={filter.key} className="flex items-center gap-2">
              <span className="text-sm text-slate-500 whitespace-nowrap">{filter.label}:</span>
              <Input
                type="date"
                value={values[startKey] || ''}
                onChange={(e) => onChange(startKey, e.target.value)}
                className="w-32 h-8 text-sm"
              />
              <span className="text-slate-400">至</span>
              <Input
                type="date"
                value={values[endKey] || ''}
                onChange={(e) => onChange(endKey, e.target.value)}
                className="w-32 h-8 text-sm"
              />
            </div>
          );
        }

        if (filter.type === 'numberRange') {
          const minKey = `${filter.key}Min`;
          const maxKey = `${filter.key}Max`;
          return (
            <div key={filter.key} className="flex items-center gap-2">
              <span className="text-sm text-slate-500 whitespace-nowrap">{filter.label}:</span>
              <Input
                type="number"
                placeholder="最小值"
                value={values[minKey] || ''}
                onChange={(e) => onChange(minKey, e.target.value)}
                className="w-24 h-8 text-sm"
              />
              <span className="text-slate-400">-</span>
              <Input
                type="number"
                placeholder="最大值"
                value={values[maxKey] || ''}
                onChange={(e) => onChange(maxKey, e.target.value)}
                className="w-24 h-8 text-sm"
              />
            </div>
          );
        }

        return null;
      })}

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-sm text-slate-500">
          🔄 重置筛选
        </Button>
      )}
    </div>
  );
}

export interface DataTablePaginationProps {
  pagination: PaginationOptions;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function DataTablePagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps) {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.ceil(total / pageSize);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('ellipsis');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">
          显示 {startItem}-{endItem} 条，共 {total} 条
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">每页</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} 条
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="h-8 w-16"
        >
          首页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="h-8 w-16"
        >
          上一页
        </Button>

        {getPageNumbers().map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
              ...
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPageChange(p)}
              className={`h-8 w-10 ${p === page ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
            >
              {p}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          className="h-8 w-16"
        >
          下一页
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || totalPages === 0}
          className="h-8 w-16"
        >
          末页
        </Button>
      </div>
    </div>
  );
}

export interface UseDataTableOptions<T> {
  data: T[];
  defaultPageSize?: number;
}

export function useDataTable<T>(options: UseDataTableOptions<T>) {
  const { data, defaultPageSize = 20 } = options;
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);
  const [filters, setFilters] = React.useState<Record<string, any>>({});

  const filteredData = React.useMemo(() => {
    if (Object.keys(filters).length === 0) return data;

    return data.filter((item: any) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value === '' || value === null || value === undefined) continue;

        const itemValue = item[key];

        if (key.endsWith('Start')) {
          const baseKey = key.replace('Start', '');
          const startValue = item[baseKey];
          if (startValue && new Date(startValue) < new Date(value as string)) {
            return false;
          }
        } else if (key.endsWith('End')) {
          const baseKey = key.replace('End', '');
          const endValue = item[baseKey];
          if (endValue && new Date(endValue) > new Date(value as string + 'T23:59:59')) {
            return false;
          }
        } else if (key.endsWith('Min')) {
          const baseKey = key.replace('Min', '');
          const minValue = item[baseKey];
          if (minValue !== undefined && Number(minValue) < Number(value)) {
            return false;
          }
        } else if (key.endsWith('Max')) {
          const baseKey = key.replace('Max', '');
          const maxValue = item[baseKey];
          if (maxValue !== undefined && Number(maxValue) > Number(value)) {
            return false;
          }
        } else if (typeof value === 'string' && typeof itemValue === 'string') {
          if (!itemValue.toLowerCase().includes(value.toLowerCase())) {
            return false;
          }
        } else if (itemValue !== value) {
          return false;
        }
      }
      return true;
    });
  }, [data, filters]);

  const total = filteredData.length;
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const updateFilter = React.useCallback((key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = React.useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  React.useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [totalPages, page]);

  return {
    data: paginatedData,
    total,
    page,
    pageSize,
    totalPages,
    filters,
    startIndex,
    endIndex,
    setPage,
    setPageSize,
    updateFilter,
    resetFilters,
    setFilters,
  };
}
