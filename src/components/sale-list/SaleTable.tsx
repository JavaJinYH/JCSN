import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

interface SaleListItem {
  id: string;
  invoiceNo: string | null;
  writtenInvoiceNo: string | null;
  saleDate: Date;
  totalAmount: number;
  discount: number;
  paidAmount: number;
  status: string;
  remark: string | null;
  buyerId: string;
  introducerId: string | null;
  pickerId: string | null;
  pickerName: string | null;
  pickerPhone: string | null;
  projectId: string | null;
  paymentEntityId: string | null;
  buyerName?: string;
  buyerPhone?: string;
  introducerName?: string;
  projectName?: string;
  entityName?: string;
  _count?: { items: number };
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

// 移动端卡片式布局组件
function SaleCard({ sale, onView }: { sale: SaleListItem; onView: (sale: SaleListItem) => void }) {
  return (
    <Card className="mb-3 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="font-mono text-sm text-slate-700">
            {sale.invoiceNo || '无单号'}
          </div>
          {sale.paidAmount >= sale.totalAmount ? (
            <Badge className="bg-green-100 text-green-700">已付款</Badge>
          ) : sale.paidAmount > 0 ? (
            <Badge className="bg-yellow-100 text-yellow-700">部分付款</Badge>
          ) : (
            <Badge className="bg-red-100 text-red-700">未付款</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">日期</span>
          <span>{formatDateTime(sale.saleDate)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">购货人</span>
          <Badge variant="secondary">{sale.buyerName || '散客'}</Badge>
        </div>
        {sale.entityName && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">主体</span>
            <span className="text-slate-700">{sale.entityName}</span>
          </div>
        )}
        {sale.projectName && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">项目</span>
            <span className="text-slate-700">{sale.projectName}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-100">
          <span className="text-slate-500">商品数</span>
          <span>{sale._count?.items || 0} 件</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-500 text-sm">金额</span>
          <div className="text-right">
            <div className="font-mono text-slate-700">{formatCurrency(sale.totalAmount)}</div>
            <div className="font-mono text-orange-600 font-bold text-sm">
              实付：{formatCurrency(sale.paidAmount)}
            </div>
          </div>
        </div>
        <div className="pt-2">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => onView(sale)}>
            查看详情
          </Button>
        </div>
      </CardContent>
    </Card>
  );
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
      {/* 桌面端：表格布局 */}
      <div className="hidden md:block">
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
                <TableRow key={sale.id}>
                  <TableCell className="font-mono text-sm">
                    {sale.invoiceNo || '-'}
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
      </div>

      {/* 移动端：卡片式布局 */}
      <div className="md:hidden">
        {pagination.total === 0 ? (
          <div className="text-center py-8 text-slate-500">
            暂无销售记录
          </div>
        ) : (
          sales.map((sale) => (
            <SaleCard key={sale.id} sale={sale} onView={onView} />
          ))
        )}
      </div>

      <DataTablePagination
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
