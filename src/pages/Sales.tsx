import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DataTableFilters, useDataTable } from '@/components/DataTable';
import { Link } from 'react-router-dom';
import { PhotoViewer } from '@/components/PhotoViewer';
import { toast } from '@/components/Toast';
import { SaleStats, SaleTable, SaleDetail } from '@/components/sale-list';
import { SaleService } from '@/services/SaleService';

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
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<{ id: string; source: SaleSource } | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [photoList, setPhotoList] = useState<any[]>([]);

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
        ...contacts.map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    { key: 'saleDate', label: '销售日期', type: 'dateRange' as const },
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
    if (key === 'search') setSearchTerm(value);
    else if (key === 'customerType') setCustomerTypeFilter(value);
    else if (key === 'customer') setSelectedCustomer(value);
    else if (key === 'saleDateStart') setDateRange((prev) => ({ ...prev, start: value }));
    else if (key === 'saleDateEnd') setDateRange((prev) => ({ ...prev, end: value }));
    else if (key === 'status') setStatusFilter(value);
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
      const [legacySales, newSales, contactsData] = await Promise.all([
        SaleService.getLegacySales(),
        SaleService.getSaleOrders(),
        SaleService.getContacts(),
      ]);

      const legacySaleItems: SaleListItem[] = legacySales.map((s) => ({
        id: s.id, invoiceNo: s.invoiceNo, writtenInvoiceNo: s.writtenInvoiceNo,
        saleDate: s.saleDate, totalAmount: s.totalAmount, discount: s.discount,
        paidAmount: s.paidAmount, status: s.status, remark: s.remark,
        source: 'legacy' as SaleSource, buyerId: s.customerId || '', payerId: s.payerCustomerId,
        introducerId: s.introducerCustomerId, pickerId: s.pickerCustomerId,
        pickerName: s.pickerName || null, pickerPhone: s.pickerPhone || null,
        projectId: s.projectId, paymentEntityId: null, customerId: s.customerId,
        buyerName: s.customer?.name, buyerPhone: s.customer?.primaryPhone,
        payerName: undefined, introducerName: undefined, projectName: s.project?.name,
        entityName: undefined, customerName: s.customer?.name,
        customerType: s.customer?.contactType, _count: s._count,
      }));

      const newSaleItems: SaleListItem[] = newSales.map((s) => ({
        id: s.id, invoiceNo: s.invoiceNo, writtenInvoiceNo: s.writtenInvoiceNo,
        saleDate: s.saleDate, totalAmount: s.totalAmount, discount: s.discount,
        paidAmount: s.paidAmount, status: s.status, remark: s.remark,
        source: 'new' as SaleSource, buyerId: s.buyerId, payerId: s.payerId,
        introducerId: s.introducerId, pickerId: s.pickerId,
        pickerName: s.pickerName || null, pickerPhone: s.pickerPhone || null,
        projectId: s.projectId, paymentEntityId: s.paymentEntityId, customerId: null,
        buyerName: s.buyer?.name, buyerPhone: s.buyer?.primaryPhone,
        payerName: s.payer?.name, introducerName: s.introducer?.name,
        projectName: s.project?.name, entityName: s.paymentEntity?.name,
        customerName: s.buyer?.name, customerType: undefined,
        _count: { items: s.items?.length || 0 },
      }));

      const allSales = [...legacySaleItems, ...newSaleItems].sort(
        (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
      );

      setSales(allSales);
      setContacts(contactsData);
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

    const matchesCustomer = selectedCustomer === 'all' || sale.customerId === selectedCustomer || sale.buyerId === selectedCustomer;
    const matchesCustomerType = customerTypeFilter === 'all' || sale.customerType === customerTypeFilter;
    const saleDate = new Date(sale.saleDate);
    const matchesDateStart = !dateRange.start || saleDate >= new Date(dateRange.start);
    const matchesDateEnd = !dateRange.end || saleDate <= new Date(dateRange.end + 'T23:59:59');

    let matchesStatus = true;
    if (statusFilter === 'paid') matchesStatus = sale.paidAmount >= sale.totalAmount;
    else if (statusFilter === 'partial') matchesStatus = sale.paidAmount > 0 && sale.paidAmount < sale.totalAmount;
    else if (statusFilter === 'unpaid') matchesStatus = sale.paidAmount === 0;

    return matchesSearch && matchesCustomer && matchesDateStart && matchesDateEnd && matchesCustomerType && matchesStatus;
  });

  const tableProps = useDataTable<SaleListItem>({ data: filteredSales, defaultPageSize: 20 });

  const totalAmount = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.paidAmount - (s.totalAmount - s.discount)), 0);

  const handleViewSale = (sale: SaleListItem) => {
    setSelectedSale({ id: sale.id, source: sale.source });
    setViewDialogOpen(true);
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

      <SaleStats
        totalCount={filteredSales.length}
        newCount={sales.filter(s => s.source === 'new').length}
        paidAmount={totalAmount}
        profit={totalProfit}
      />

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
          <SaleTable
            sales={filteredSales}
            pagination={{
              page: tableProps.page,
              pageSize: tableProps.pageSize,
              total: tableProps.total,
            }}
            onPageChange={tableProps.setPage}
            onPageSizeChange={tableProps.setPageSize}
            onView={handleViewSale}
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
          <SaleDetail
            saleId={selectedSale?.id || null}
            source={selectedSale?.source || null}
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            onSuccess={loadData}
          />
        </DialogContent>
      </Dialog>

      <PhotoViewer
        photos={photoList}
        open={photoViewerOpen}
        onOpenChange={setPhotoViewerOpen}
        initialIndex={photoViewerIndex}
      />
    </div>
  );
}
