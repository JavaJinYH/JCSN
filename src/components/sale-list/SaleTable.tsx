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
import { formatCurrency, formatDateTime } from '@/lib/utils';

type SaleSource = 'legacy' | 'new';

interface SaleListItem {
  id: string;
  invoiceNo: string | null;
  writtenInvoiceNo: string | null;
  saleDate: Date;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  buyerName?: string;
  entityName?: string;
  projectName?: string;
  _count?: { items: number };
  source: SaleSource;
}

interface SaleTableProps {
  sales: SaleListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onView: (sale: SaleListItem) => void;
}

export function SaleTable({
  sales,
  pagination,
  onPageChange,
  onPageSizeChange,
  onView,
}: SaleTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>单据号</TableHead>
            <TableHead>日期</TableHead>
            <TableHead>购货人</TableHead>
            <TableHead>挂靠主体</TableHead>
            <TableHead>项目</TableHead>
            <TableHead className="text-right">商品数</TableHead>
            <TableHead className="text-right">金额</TableHead>
            <TableHead className="text-right">实付</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.total === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                暂无销售记录
              </TableCell>
            </TableRow>
          ) : (
            sales.map((sale) => (
              <TableRow key={`${sale.source}-${sale.id}`}>
                <TableCell className="font-mono text-sm">
                  {sale.invoiceNo || '-'}
                  {sale.source === 'new' && (
                    <Badge className="ml-1 bg-blue-100 text-blue-700 text-xs">新</Badge>
                  )}
                </TableCell>
                <TableCell>{formatDateTime(sale.saleDate)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {sale.buyerName || '散客'}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-500 text-sm">
                  {sale.entityName || '-'}
                </TableCell>
                <TableCell className="text-slate-500 text-sm">
                  {sale.projectName || '-'}
                </TableCell>
                <TableCell className="text-right">{sale._count?.items || 0}</TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(sale.totalAmount)}
                </TableCell>
                <TableCell className="text-right font-mono text-orange-600 font-bold">
                  {formatCurrency(sale.paidAmount)}
                </TableCell>
                <TableCell>
                  {sale.paidAmount >= sale.totalAmount ? (
                    <Badge className="bg-green-100 text-green-700">已付款</Badge>
                  ) : sale.paidAmount > 0 ? (
                    <Badge className="bg-yellow-100 text-yellow-700">部分付款</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-700">未付款</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => onView(sale)}>
                    查看
                  </Button>
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
