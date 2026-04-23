import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export function Sales() {
  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [quarterFilter, setQuarterFilter] = useState<string>('');

  // 生成季度选项
  const generateQuarterOptions = () => {
    const options = [{ value: '__all__', label: '全部季度' }];
    const currentYear = new Date().getFullYear();
    
    for (let year = currentYear; year >= currentYear - 3; year--) {
      for (let q = 4; q >= 1; q--) {
        options.push({
          value: `${year}-Q${q}`,
          label: `${year}年第${q}季度`
        });
      }
    }
    return options;
  };

  // 检查日期是否在指定季度
  const isDateInQuarter = (date: Date, quarterValue: string) => {
    if (!quarterValue || quarterValue === '__all__') return true;
    
    const [year, q] = quarterValue.split('-Q');
    const yearNum = parseInt(year);
    const quarterNum = parseInt(q);
    
    const dateYear = date.getFullYear();
    const dateQuarter = Math.floor(date.getMonth() / 3) + 1;
    
    return dateYear === yearNum && dateQuarter === quarterNum;
  };

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<{ id: string } | null>(null);
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
        { value: '__all__', label: '全部' },
        { value: 'customer', label: '客户' },
        { value: 'plumber', label: '水电工' },
        { value: 'company', label: '公司联系人' },
      ],
    },
    {
      key: 'customer',
      label: '客户',
      type: 'select' as const,
      options: [
        { value: '__all__', label: '全部' },
        ...contacts.map((c) => ({ value: c.id, label: c.name })),
      ],
    },
    {
      key: 'entity',
      label: '挂靠主体',
      type: 'select' as const,
      options: [
        { value: '__all__', label: '全部' },
        ...entities.map((e) => ({ value: e.id, label: e.name })),
      ],
    },
    {
      key: 'quarter',
      label: '季度筛选',
      type: 'select' as const,
      options: generateQuarterOptions(),
    },
    { key: 'saleDate', label: '销售日期', type: 'dateRange' as const },
    {
      key: 'status',
      label: '状态',
      type: 'select' as const,
      options: [
        { value: '__all__', label: '全部' },
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
    entity: selectedEntity,
    quarter: quarterFilter,
    saleDateStart: dateRange.start,
    saleDateEnd: dateRange.end,
    status: statusFilter,
  };

  const handleFilterChange = (key: string, value: any) => {
    if (key === 'search') setSearchTerm(value);
    else if (key === 'customerType') setCustomerTypeFilter(value);
    else if (key === 'customer') setSelectedCustomer(value);
    else if (key === 'entity') setSelectedEntity(value);
    else if (key === 'quarter') setQuarterFilter(value);
    else if (key === 'saleDateStart') setDateRange((prev) => ({ ...prev, start: value }));
    else if (key === 'saleDateEnd') setDateRange((prev) => ({ ...prev, end: value }));
    else if (key === 'status') setStatusFilter(value);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCustomer('__all__');
    setSelectedEntity('__all__');
    setQuarterFilter('__all__');
    setDateRange({ start: '', end: '' });
    setCustomerTypeFilter('__all__');
    setStatusFilter('__all__');
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('[Sales] 开始加载数据...');
      const [newSales, contactsData, entitiesData] = await Promise.all([
        SaleService.getSaleOrders(),
        SaleService.getContacts(),
        SaleService.getPaymentEntities(),
      ]);

      console.log('[Sales] 原始销售数据:', newSales.length, '条');
      console.log('[Sales] 销售数据详情:', newSales);

      const saleItems: SaleListItem[] = newSales.map((s) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        writtenInvoiceNo: s.writtenInvoiceNo,
        saleDate: s.saleDate,
        totalAmount: s.totalAmount,
        discount: s.discount,
        paidAmount: s.paidAmount,
        status: s.status,
        remark: s.remark,
        buyerId: s.buyerId,
        introducerId: s.introducerId,
        pickerId: s.pickerId,
        pickerName: s.pickerName || null,
        pickerPhone: s.pickerPhone || null,
        projectId: s.projectId,
        paymentEntityId: s.paymentEntityId,
        buyerName: s.buyer?.name,
        buyerPhone: s.buyer?.primaryPhone,
        introducerName: s.introducer?.name,
        projectName: s.project?.name,
        entityName: s.paymentEntity?.name,
        _count: { items: s.items?.length || 0 },
      }));

      console.log('[Sales] 即将设置sales状态, saleItems:', saleItems);
      setSales(saleItems);
      setContacts(contactsData);
      setEntities(entitiesData);
      console.log('[Sales] 已设置sales状态');
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

    const matchesCustomer = selectedCustomer === '__all__' || selectedCustomer === '' || sale.buyerId === selectedCustomer;
    const matchesEntity = selectedEntity === '__all__' || selectedEntity === '' || sale.paymentEntityId === selectedEntity;

    const saleDate = new Date(sale.saleDate);
    const matchesDateStart = !dateRange.start || saleDate >= new Date(dateRange.start);
    const matchesDateEnd = !dateRange.end || saleDate <= new Date(dateRange.end + 'T23:59:59');
    const matchesQuarter = isDateInQuarter(saleDate, quarterFilter);

    let matchesStatus = true;
    if (statusFilter === 'paid') matchesStatus = sale.paidAmount >= sale.totalAmount;
    else if (statusFilter === 'partial') matchesStatus = sale.paidAmount > 0 && sale.paidAmount < sale.totalAmount;
    else if (statusFilter === 'unpaid') matchesStatus = sale.paidAmount === 0;
    else matchesStatus = true;

    let matchesCustomerType = true;
    if (customerTypeFilter !== '__all__' && customerTypeFilter) {
      const buyer = contacts.find(c => c.id === sale.buyerId);
      matchesCustomerType = buyer?.contactType === customerTypeFilter;
    }

    return matchesSearch && matchesCustomer && matchesEntity && matchesQuarter && matchesDateStart && matchesDateEnd && matchesStatus && matchesCustomerType;
  });

  const tableProps = useDataTable<SaleListItem>({ data: filteredSales, defaultPageSize: 20 });

  const totalAmount = filteredSales.reduce((sum, s) => sum + s.paidAmount, 0);
  const totalProfit = filteredSales.reduce((sum, s) => sum + (s.paidAmount - (s.totalAmount - s.discount)), 0);

  const handleViewSale = (sale: SaleListItem) => {
    setSelectedSale({ id: sale.id });
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
        newCount={filteredSales.length}
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
            sales={tableProps.data}
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">数据说明</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• 销售记录用于管理所有销售订单，包含订单金额、付款情况等核心数据</p>
          <p>• 点击「详情」查看销售单完整信息，包括商品明细、付款记录、关联项目等</p>
          <p>• 新增销售单请使用「+ 新增销售」按钮，跳转到新建销售单页面</p>
          <p>• 支持按客户类型、结账主体、日期范围、单据状态等条件筛选</p>
        </div>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">销售详情</DialogTitle>
          </DialogHeader>
          <SaleDetail
            saleId={selectedSale?.id || null}
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
