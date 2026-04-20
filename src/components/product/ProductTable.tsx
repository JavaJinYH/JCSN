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
  const getSpecSummary = (specs?: ProductSpec[]) => {
    if (!specs || specs.length === 0) return '-';
    const brandGroups = new Map<string, string[]>();
    specs.forEach(spec => {
      const brandName = spec.brand?.name || '未知';
      if (!brandGroups.has(brandName)) {
        brandGroups.set(brandName, []);
      }
      brandGroups.get(brandName)!.push(spec.name);
    });
    const summary: string[] = [];
    brandGroups.forEach((specNames, brandName) => {
      summary.push(`${brandName}: ${specNames.join(', ')}`);
    });
    return summary.map((s, i) => (
      <div key={i} className="text-xs">{s}</div>
    ));
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
                  {getSpecSummary(product.productSpecs)}
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
