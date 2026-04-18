import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PhotoViewer } from '@/components/PhotoViewer';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { DataTableFilters, DataTablePagination, useDataTable } from '@/components/DataTable';
import { Link } from 'react-router-dom';
import { db } from '@/lib/db';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from '@/components/Toast';

type SaleSource = 'legacy' | 'new';

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
  source: SaleSource;
  buyerId: string;
  payerId: string | null;
  introducerId: string | null;
  pickerId: string | null;
  pickerName: string | null;
  pickerPhone: string | null;
  projectId: string | null;
  paymentEntityId: string | null;
  customerId: string | null;
  buyerName?: string;
  buyerPhone?: string;
  payerName?: string;
  introducerName?: string;
  projectName?: string;
  entityName?: string;
  customerName?: string;
  customerType?: string;
  _count?: { items: number };
}

export function Sales() {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState<string>('');
  const [returnItemIndex, setReturnItemIndex] = useState<number>(0);

  const filters = [
    { key: 'search', label: '搜索', type: 'text' as const, placeholder: '搜索单据号或客户...' },
    {
      key: 'customerType',
      label: '客户类型',
      type: 'select' as const,
      options: [
        { value: 'all', label: '全部类型' },
        { value: '普通客户', label: '普通客户' },
        { value: '水电工', label: '水电工' },
        { value: '批发商', label: '批发商' },
      ],
    },
    {
      key: 'customer',
      label: '客户',
      type: 'select' as const,
      options: [
        { value: 'all', label: '全部客户' },
        ...customers.map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    {
      key: 'saleDate',
      label: '销售日期',
      type: 'dateRange' as const,
    },
    {
      key: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: 'all', label: '全部状态' },
        { value: 'paid', label: '已付款' },
        { value: 'partial', label: '部分付款' },
        { value: 'unpaid', label: '未付款' },
      ],
    },
  ];

  const filterValues = {
    search: searchTerm,
    customerType: customerTypeFilter,
    customer: selectedCustomer,
    saleDateStart: dateRange.start,
    saleDateEnd: dateRange.end,
    status: statusFilter,
  };

  const handleFilterChange = (key: string, value: any) => {
    if (key === 'search') {
      setSearchTerm(value);
    } else if (key === 'customerType') {
      setCustomerTypeFilter(value);
    } else if (key === 'customer') {
      setSelectedCustomer(value);
    } else if (key === 'saleDateStart') {
      setDateRange((prev) => ({ ...prev, start: value }));
    } else if (key === 'saleDateEnd') {
      setDateRange((prev) => ({ ...prev, end: value }));
    } else if (key === 'status') {
      setStatusFilter(value);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCustomer('all');
    setDateRange({ start: '', end: '' });
    setCustomerTypeFilter('all');
    setStatusFilter('all');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [legacySales, newSales, customersData, contactsData, entitiesData, projectsData] = await Promise.all([
        db.sale.findMany({
          include: {
            customer: true,
            _count: { select: { items: true } },
          },
          orderBy: { saleDate: 'desc' },
        }),
        db.saleOrder.findMany({
          include: {
            buyer: true,
            payer: true,
            introducer: true,
            project: true,
            paymentEntity: true,
            items: true,
          },
          orderBy: { saleDate: 'desc' },
        }),
        db.customer.findMany({ orderBy: { name: 'asc' } }),
        db.contact.findMany({ orderBy: { name: 'asc' } }),
        db.entity.findMany({ orderBy: { name: 'asc' } }),
        db.bizProject.findMany({ orderBy: { name: 'asc' } }),
      ]);

      const legacySaleItems: SaleListItem[] = legacySales.map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        writtenInvoiceNo: s.writtenInvoiceNo,
        saleDate: s.saleDate,
        totalAmount: s.totalAmount,
        discount: s.discount,
        paidAmount: s.paidAmount,
        status: s.status,
        remark: s.remark,
        source: 'legacy' as SaleSource,
        buyerId: s.customerId || '',
        payerId: s.payerCustomerId,
        introducerId: s.introducerCustomerId,
        pickerId: s.pickerCustomerId,
        pickerName: s.pickerName || null,
        pickerPhone: s.pickerPhone || null,
        projectId: s.projectId,
        paymentEntityId: null,
        customerId: s.customerId,
        buyerName: s.customer?.name,
        buyerPhone: s.customer?.phone,
        payerName: undefined,
        introducerName: undefined,
        projectName: s.project?.name,
        entityName: undefined,
        customerName: s.customer?.name,
        customerType: s.customer?.customerType,
        _count: s._count,
      }));

      const newSaleItems: SaleListItem[] = newSales.map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        writtenInvoiceNo: s.writtenInvoiceNo,
        saleDate: s.saleDate,
        totalAmount: s.totalAmount,
        discount: s.discount,
        paidAmount: s.paidAmount,
        status: s.status,
        remark: s.remark,
        source: 'new' as SaleSource,
        buyerId: s.buyerId,
        payerId: s.payerId,
        introducerId: s.introducerId,
        pickerId: s.pickerId,
        pickerName: s.pickerName || null,
        pickerPhone: s.pickerPhone || null,
        projectId: s.projectId,
        paymentEntityId: s.paymentEntityId,
        customerId: null,
        buyerName: s.buyer?.name,
        buyerPhone: s.buyer?.primaryPhone,
        payerName: s.payer?.name,
        introducerName: s.introducer?.name,
        projectName: s.project?.name,
        entityName: s.paymentEntity?.name,
        customerName: s.buyer?.name,
        customerType: undefined,
        _count: { items: s.items?.length || 0 },
      }));

      const allSales = [...legacySaleItems, ...newSaleItems].sort(
        (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
      );

      setSales(allSales);
      setCustomers(customersData);
      setContacts(contactsData);
      setEntities(entitiesData);
      setProjects(projectsData);
    } catch (error) {
      console.error('[Sales] 加载销售数据失败:', error);
      toast('加载销售数据失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch = searchTerm
      ? sale.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.buyerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.writtenInvoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.entityName?.toLowerCase().includes(searchTerm.toLowerCase())
      : true;

    const matchesCustomer =
      selectedCustomer === 'all' ||
      sale.customerId === selectedCustomer ||
      sale.buyerId === selectedCustomer;

    const matchesCustomerType =
      customerTypeFilter === 'all' || sale.customerType === customerTypeFilter;

    const saleDate = new Date(sale.saleDate);
    const matchesDateStart = !dateRange.start || saleDate >= new Date(dateRange.start);
    const matchesDateEnd = !dateRange.end || saleDate <= new Date(dateRange.end + 'T23:59:59');

    let matchesStatus = true;
    if (statusFilter === 'paid') {
      matchesStatus = sale.paidAmount >= sale.totalAmount;
    } else if (statusFilter === 'partial') {
      matchesStatus = sale.paidAmount > 0 && sale.paidAmount < sale.totalAmount;
    } else if (statusFilter === 'unpaid') {
      matchesStatus = sale.paidAmount === 0;
    }

    return matchesSearch && matchesCustomer && matchesDateStart && matchesDateEnd && matchesCustomerType && matchesStatus;
  });

  const tableProps = useDataTable<SaleListItem>({
    data: filteredSales,
    defaultPageSize: 20,
  });

  const totalAmount = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.paidAmount - (s.totalAmount - s.discount)), 0);

  const handleViewSale = async (sale: SaleListItem) => {
    setViewLoading(true);
    try {
      let saleData: any = null;

      if (sale.source === 'legacy') {
        saleData = await db.sale.findUnique({
          where: { id: sale.id },
          include: {
            customer: true,
            project: true,
            payerCustomer: true,
            introducerCustomer: true,
            pickerCustomer: true,
            items: {
              include: { product: true },
            },
            payments: true,
            photos: true,
            rebates: {
              include: { plumber: true },
            },
            accountReceivables: true,
          },
        });
        saleData.source = 'legacy';
      } else {
        saleData = await db.saleOrder.findUnique({
          where: { id: sale.id },
          include: {
            buyer: true,
            payer: true,
            introducer: true,
            picker: true,
            project: true,
            paymentEntity: true,
            items: true,
            payments: true,
            receivables: true,
          },
        });
        if (saleData?.items) {
          const productIds = [...new Set(saleData.items.map((item: any) => item.productId))];
          const products = await db.product.findMany({
            where: { id: { in: productIds } },
          });
          const productMap = new Map(products.map(p => [p.id, p]));
          (saleData as any).items = saleData.items.map((item: any) => ({
            ...item,
            product: productMap.get(item.productId),
          }));
        }
        saleData.source = 'new';
      }

      if (saleData) {
        setSelectedSale(saleData);
        setViewDialogOpen(true);
      }
    } catch (error: any) {
      console.error('[Sales] 加载销售详情失败:', error);
      toast(`加载销售详情失败: ${error?.message || '未知错误'}`, 'error');
    } finally {
      setViewLoading(false);
    }
  };

  const handleOpenReturnDialog = (itemIndex: number) => {
    setReturnItemIndex(itemIndex);
    setReturnQuantity('');
    setShowReturnDialog(true);
  };

  const handleReturnConfirm = async () => {
    if (!selectedSale || !returnQuantity) {
      toast('请填写退货数量', 'warning');
      return;
    }

    const item = selectedSale.items[returnItemIndex];
    if (!item) return;

    const qty = parseFloat(returnQuantity);
    if (qty <= 0 || qty > item.quantity) {
      toast('退货数量必须大于0且不超过购买数量', 'warning');
      return;
    }

    try {
      const returnAmount = qty * item.unitPrice;

      await db.saleReturn.create({
        data: {
          saleOrderId: selectedSale.id,
          totalAmount: returnAmount,
          items: {
            create: {
              productId: item.productId,
              returnQuantity: qty,
              unitPrice: item.unitPrice,
              amount: returnAmount,
            },
          },
        },
      });

      await db.product.update({
        where: { id: item.productId },
        data: { stock: { increment: qty } },
      });

      await db.receivable.update({
        where: { orderId: selectedSale.id },
        data: { remainingAmount: { increment: returnAmount } },
      });

      setShowReturnDialog(false);
      setReturnQuantity('');
      setViewDialogOpen(false);
      loadData();
      toast('退货记录创建成功！', 'success');
    } catch (error) {
      console.error('[Sales] 创建退货记录失败:', error);
      toast('退货失败，请重试', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">销售记录</h2>
          <p className="text-slate-500 mt-1">查看和管理所有销售订单</p>
        </div>
        <Link to="/sales/new">
          <Button className="bg-orange-500 hover:bg-orange-600">+ 新增销售</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-800">{filteredSales.length}</div>
            <div className="text-sm text-slate-500">订单总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalAmount)}</div>
            <div className="text-sm text-slate-500">销售总额</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalProfit)}</div>
            <div className="text-sm text-slate-500">预估利润</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {sales.filter(s => s.source === 'new').length}
            </div>
            <div className="text-sm text-slate-500">新架构订单</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <DataTableFilters
            filters={filters}
            values={filterValues}
            onChange={handleFilterChange}
            onReset={handleResetFilters}
          />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>单据号</TableHead>
                <TableHead>日期</TableHead>
                <TableHead>购货人</TableHead>
                <TableHead>结账主体</TableHead>
                <TableHead>项目</TableHead>
                <TableHead className="text-right">商品数</TableHead>
                <TableHead className="text-right">金额</TableHead>
                <TableHead className="text-right">实付</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.total === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-slate-500">
                    暂无销售记录
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((sale) => (
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
                      <Button variant="ghost" size="sm" onClick={() => handleViewSale(sale)}>
                        查看
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <DataTablePagination
            pagination={{
              page: tableProps.page,
              pageSize: tableProps.pageSize,
              total: tableProps.total,
            }}
            onPageChange={tableProps.setPage}
            onPageSizeChange={tableProps.setPageSize}
          />
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              销售详情
              {selectedSale?.source === 'new' && (
                <Badge className="ml-2 bg-blue-100 text-blue-700">新架构</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-slate-500">单据号</div>
                  <div className="font-mono font-bold">{selectedSale.invoiceNo || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">手写单号</div>
                  <div className="font-mono">{selectedSale.writtenInvoiceNo || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">销售日期</div>
                  <div>{formatDateTime(selectedSale.saleDate)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">关联项目</div>
                  <div>
                    {selectedSale.project?.name ||
                     (selectedSale.source === 'legacy' ? selectedSale.project?.name : '-')}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-slate-700 mb-3">
                  {selectedSale.source === 'new' ? '四角色信息（联系人）' : '四角色信息（客户）'}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm text-slate-500 mb-1">购货人（业主）</div>
                    <div className="font-medium">
                      {selectedSale.source === 'new'
                        ? selectedSale.buyer?.name || '散客'
                        : selectedSale.customer?.name || '散客'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {selectedSale.source === 'new'
                        ? selectedSale.buyer?.primaryPhone
                        : selectedSale.customer?.phone || '-'}
                    </div>
                    {selectedSale.source === 'legacy' && (
                      <div className="text-xs text-slate-500">
                        {selectedSale.customer?.customerType || '普通客户'}
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm text-slate-500 mb-1">付款人</div>
                    {selectedSale.source === 'new' ? (
                      selectedSale.payer ? (
                        <>
                          <div className="font-medium">{selectedSale.payer.name}</div>
                          <div className="text-xs text-slate-500">{selectedSale.payer.primaryPhone}</div>
                        </>
                      ) : (
                        <div className="text-slate-400">无</div>
                      )
                    ) : selectedSale.payerCustomer ? (
                      <>
                        <div className="font-medium">{selectedSale.payerCustomer.name}</div>
                        <div className="text-xs text-slate-500">{selectedSale.payerCustomer.phone}</div>
                      </>
                    ) : (
                      <div className="text-slate-400">同购货人</div>
                    )}
                  </div>

                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm text-slate-500 mb-1">介绍人（水电工）</div>
                    {selectedSale.source === 'new' ? (
                      selectedSale.introducer ? (
                        <>
                          <div className="font-medium">{selectedSale.introducer.name}</div>
                          <div className="text-xs text-slate-500">{selectedSale.introducer.primaryPhone}</div>
                          <div className="text-xs text-purple-600">返点客户</div>
                        </>
                      ) : (
                        <div className="text-slate-400">无</div>
                      )
                    ) : selectedSale.introducerCustomer ? (
                      <>
                        <div className="font-medium">{selectedSale.introducerCustomer.name}</div>
                        <div className="text-xs text-slate-500">{selectedSale.introducerCustomer.phone}</div>
                        <div className="text-xs text-purple-600">返点客户</div>
                      </>
                    ) : (
                      <div className="text-slate-400">无</div>
                    )}
                  </div>

                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-sm text-slate-500 mb-1">提货人</div>
                    {selectedSale.source === 'new' ? (
                      selectedSale.picker ? (
                        <>
                          <div className="font-medium">{selectedSale.picker.name}</div>
                          <div className="text-xs text-slate-500">{selectedSale.picker.primaryPhone}</div>
                        </>
                      ) : selectedSale.pickerName ? (
                        <>
                          <div className="font-medium">{selectedSale.pickerName}</div>
                          <div className="text-xs text-slate-500">{selectedSale.pickerPhone || '-'}</div>
                        </>
                      ) : (
                        <div className="text-slate-400">无</div>
                      )
                    ) : selectedSale.pickerCustomer ? (
                      <>
                        <div className="font-medium">{selectedSale.pickerCustomer.name}</div>
                        <div className="text-xs text-slate-500">{selectedSale.pickerCustomer.phone}</div>
                      </>
                    ) : selectedSale.pickerName ? (
                      <>
                        <div className="font-medium">{selectedSale.pickerName}</div>
                        <div className="text-xs text-slate-500">{selectedSale.pickerPhone || '-'}</div>
                      </>
                    ) : (
                      <div className="text-slate-400">同购货人</div>
                    )}
                  </div>
                </div>
              </div>

              {selectedSale.source === 'new' && selectedSale.paymentEntity && (
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <h3 className="font-bold text-indigo-700 mb-2">结账主体信息</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-indigo-600">主体名称</div>
                      <div className="font-medium">{selectedSale.paymentEntity.name}</div>
                    </div>
                    <div>
                      <div className="text-sm text-indigo-600">主体类型</div>
                      <div className="font-medium">
                        {selectedSale.paymentEntity.entityType === 'personal' ? '个人' :
                         selectedSale.paymentEntity.entityType === 'company' ? '公司' : '政府'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-indigo-600">关联人员</div>
                      <div className="font-medium">
                        {selectedSale.paymentEntity.contact?.name || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-sm text-slate-500">商品金额</div>
                  <div className="text-lg font-bold font-mono">{formatCurrency(selectedSale.totalAmount)}</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-slate-500">优惠</div>
                  <div className="text-lg font-bold font-mono text-green-600">{formatCurrency(selectedSale.discount)}</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-slate-500">实付金额</div>
                  <div className="text-lg font-bold font-mono text-orange-600">{formatCurrency(selectedSale.paidAmount)}</div>
                </div>
              </div>

              {selectedSale.source === 'legacy' && selectedSale.accountReceivables && selectedSale.accountReceivables.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="font-bold text-red-700 mb-2">欠款状态</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedSale.accountReceivables.map((ar: any) => (
                      <div key={ar.id}>
                        <div className="text-sm text-red-600">欠款金额</div>
                        <div className="text-lg font-bold text-red-700">{formatCurrency(ar.remainingAmount)}</div>
                        <div className="text-xs text-red-600">
                          {ar.isOverdue ? `已逾期${ar.overdueDays}天` : '正常'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedSale.source === 'new' && selectedSale.receivables && selectedSale.receivables.length > 0 && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="font-bold text-red-700 mb-2">欠款状态</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedSale.receivables.map((ar: any) => (
                      <div key={ar.id}>
                        <div className="text-sm text-red-600">欠款金额</div>
                        <div className="text-lg font-bold text-red-700">{formatCurrency(ar.remainingAmount)}</div>
                        <div className="text-xs text-red-600">
                          {ar.isOverdue ? `已逾期${ar.overdueDays}天` : '正常'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-slate-700 mb-2">商品明细</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品名称</TableHead>
                      <TableHead className="text-right">规格</TableHead>
                      <TableHead className="text-right">单位</TableHead>
                      <TableHead className="text-right">单价</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">小计</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items?.map((item: any, index: number) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.product?.name || '-'}</TableCell>
                        <TableCell className="text-right">{item.product?.specification || '-'}</TableCell>
                        <TableCell className="text-right">{item.product?.unit || '-'}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.subtotal)}</TableCell>
                        <TableCell>
                          {selectedSale.source === 'new' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenReturnDialog(index)}
                            >
                              退货
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {selectedSale.payments && selectedSale.payments.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-2">付款记录</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>付款方式</TableHead>
                        <TableHead className="text-right">付款人</TableHead>
                        <TableHead className="text-right">金额</TableHead>
                        <TableHead className="text-right">付款时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.payments.map((payment: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Badge variant="outline">{payment.method}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {payment.payerName || payment.thirdPartyName || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {payment.paidAt ? formatDateTime(payment.paidAt) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedSale.source === 'legacy' && selectedSale.photos && selectedSale.photos.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-2">单据照片 ({selectedSale.photos.length})</h3>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedSale.photos.map((photo: any, index: number) => (
                      <PhotoThumbnail
                        key={photo.id}
                        photo={photo}
                        onClick={() => {
                          setPhotoViewerIndex(index);
                          setPhotoViewerOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedSale.remark && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-2">备注</h3>
                  <div className="bg-slate-50 p-3 rounded-lg text-slate-600">{selectedSale.remark}</div>
                </div>
              )}

              {selectedSale.source === 'legacy' && selectedSale.rebates && selectedSale.rebates.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-bold text-purple-700 mb-2">返点记录</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>水电工</TableHead>
                        <TableHead className="text-right">返点金额</TableHead>
                        <TableHead className="text-right">返点方式</TableHead>
                        <TableHead className="text-right">返点时间</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.rebates.map((rebate: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{rebate.plumber?.name || '未知'}</div>
                            <div className="text-xs text-slate-500">{rebate.plumber?.phone || '-'}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-purple-600">
                            {formatCurrency(rebate.rebateAmount)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline">
                              {rebate.rebateType === 'cash' ? '现金' : rebate.rebateType === 'transfer' ? '转账' : '抵扣'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-slate-500">
                            {rebate.recordedAt ? formatDateTime(rebate.recordedAt) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>销售退货</DialogTitle>
          </DialogHeader>
          {selectedSale && selectedSale.items[returnItemIndex] && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="text-sm text-slate-500">商品名称</div>
                <div className="font-bold">{selectedSale.items[returnItemIndex].product?.name}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500">原购买数量</div>
                  <div className="font-bold">{selectedSale.items[returnItemIndex].quantity}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">购买单价</div>
                  <div className="font-bold font-mono">
                    {formatCurrency(selectedSale.items[returnItemIndex].unitPrice)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  退货数量 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  max={selectedSale.items[returnItemIndex].quantity}
                />
                <div className="text-xs text-slate-500 mt-1">
                  最多可退: {selectedSale.items[returnItemIndex].quantity}
                </div>
              </div>

              {returnQuantity && (
                <div className="bg-orange-50 p-3 rounded-lg">
                  <div className="text-sm text-slate-500">退货金额</div>
                  <div className="text-xl font-bold text-orange-600">
                    {formatCurrency(
                      parseFloat(returnQuantity) * selectedSale.items[returnItemIndex].unitPrice
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturnDialog(false)}>取消</Button>
            <Button onClick={handleReturnConfirm}>确认退货</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedSale &&
       ((selectedSale.source === 'legacy' && selectedSale.photos && selectedSale.photos.length > 0) ||
        (selectedSale.photos && selectedSale.photos.length > 0)) && (
        <PhotoViewer
          photos={selectedSale.photos}
          open={photoViewerOpen}
          onOpenChange={setPhotoViewerOpen}
          initialIndex={photoViewerIndex}
        />
      )}
    </div>
  );
}