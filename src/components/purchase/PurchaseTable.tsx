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
import { formatCurrency, formatDateTime, formatProductName } from '@/lib/utils';
import type { Purchase, Product } from '@/lib/types';

interface PurchaseTableProps {
  purchases: (Purchase & { product: Product })[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (purchaseId: string) => void;
  onViewPriceHistory: (product: Product) => void;
}

export function PurchaseTable({
  purchases,
  pagination,
  onPageChange,
  onPageSizeChange,
  onView,
  onViewPriceHistory,
}: PurchaseTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>进货日期</TableHead>
          <TableHead>商品名称</TableHead>
          <TableHead>分类</TableHead>
          <TableHead>批次号</TableHead>
          <TableHead className="text-right">数量</TableHead>
          <TableHead className="text-right">单价</TableHead>
          <TableHead className="text-right">金额</TableHead>
          <TableHead>供应商</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pagination.total === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8 text-slate-500">
              暂无进货记录
            </TableCell>
          </TableRow>
        ) : (
          purchases.map((purchase) => (
            <TableRow key={purchase.id}>
              <TableCell>{formatDateTime(purchase.purchaseDate)}</TableCell>
              <TableCell className="font-medium">{formatProductName(purchase.product)}</TableCell>
              <TableCell>
                <Badge variant="secondary">{(purchase.product as any).category?.name || '-'}</Badge>
              </TableCell>
              <TableCell className="text-slate-500">{purchase.batchNo || '-'}</TableCell>
              <TableCell className="text-right font-mono">{purchase.quantity}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(purchase.unitPrice)}</TableCell>
              <TableCell className="text-right font-mono text-green-600">{formatCurrency(purchase.totalAmount)}</TableCell>
              <TableCell className="text-slate-500">{purchase.supplier?.name || purchase.supplierName || '-'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onView(purchase.id)}>
                    查看
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onViewPriceHistory(purchase.product)}>
                    进货历史
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
