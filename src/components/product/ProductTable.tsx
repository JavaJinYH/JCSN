import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/DataTable';
import { formatCurrency } from '@/lib/utils';
import type { Product, Category, ProductSpec } from '@/lib/types';

interface ProductWithDetails extends Product {
  category: Category;
  productSpecs?: ProductSpec[];
}

interface ProductTableProps {
  products: ProductWithDetails[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDelete: (product: ProductWithDetails) => void;
}

export function ProductTable({
  products,
  pagination,
  onPageChange,
  onPageSizeChange,
  onDelete,
}: ProductTableProps) {
  const getSpecSummary = (product: Product) => {
    const hasSpec = product.specification && product.specification.trim() !== '';
    const hasModel = product.model && product.model.trim() !== '';

    if (!hasSpec && !hasModel) {
      return '-';
    }

    return (
      <div className="space-y-1">
        {hasSpec && (
          <div className="text-xs text-slate-600">
            <span className="font-medium">规格:</span> {product.specification}
          </div>
        )}
        {hasModel && (
          <div className="text-xs text-slate-600">
            <span className="font-medium">型号:</span> {product.model}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>编码</TableHead>
            <TableHead>商品名称</TableHead>
            <TableHead>分类</TableHead>
            <TableHead>规格参数/产品型号</TableHead>
            <TableHead>单位</TableHead>
            <TableHead className="text-right">参考售价</TableHead>
            <TableHead className="text-right">库存</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.total === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                暂无商品数据
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-mono text-xs text-slate-500">
                  {product.code || '-'}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{product.name}</div>
                  {product.brand && (
                    <div className="text-xs text-slate-400">{product.brand}</div>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{product.category.name}</Badge>
                </TableCell>
                <TableCell className="text-slate-500">
                  {getSpecSummary(product)}
                </TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell className="text-right font-mono text-orange-600">
                  {product.referencePrice ? formatCurrency(product.referencePrice) : '-'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {product.stock}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link to={`/products/${product.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        编辑
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => onDelete(product)}
                    >
                      删除
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <DataTablePagination
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
