import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { Rebate, Sale, Customer } from '@/lib/types';
import { toast } from '@/components/Toast';

export function Rebates() {
  const [rebates, setRebates] = useState<Rebate[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rebateTypeFilter, setRebateTypeFilter] = useState<string>('all');
  const [showHidden, setShowHidden] = useState(false);

  const [formData, setFormData] = useState({
    saleId: '',
    plumberId: '',
    supplierName: '',
    rebateAmount: '',
    rebateType: 'cash',
    rebateRate: '',
    remark: '',
    isHidden: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      loadSales();
      loadCustomers();
    }
  }, [showAddDialog]);

  const loadData = async () => {
    try {
      setLoading(true);
      const rebatesData = await db.rebate.findMany({
        include: {
          sale: true,
          plumber: true,
        },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      });
      setRebates(rebatesData);
    } catch (error) {
      console.error('Failed to load rebates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSales = async () => {
    try {
      const salesData = await db.sale.findMany({
        include: {
          customer: true,
          items: { include: { product: true } },
        },
        orderBy: { saleDate: 'desc' },
        take: 50,
      });
      setSales(salesData);
    } catch (error) {
      console.error('Failed to load sales:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const customersData = await db.customer.findMany({
        where: { customerType: '水电工' },
        orderBy: { name: 'asc' },
      });
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const handleAddRebate = async () => {
    if (!formData.saleId) {
      alert('请选择销售单');
      return;
    }
    if (!formData.rebateAmount || parseFloat(formData.rebateAmount) <= 0) {
      alert('请输入回扣金额');
      return;
    }

    try {
      const selectedSale = sales.find(s => s.id === formData.saleId);
      const selectedCustomer = customers.find(c => c.id === formData.plumberId);
      const plumberId = formData.plumberId === '__none__' ? null : formData.plumberId;
      await db.rebate.create({
        data: {
          saleId: formData.saleId,
          plumberId,
          supplierName: formData.supplierName || selectedCustomer?.name || '未知',
          rebateAmount: parseFloat(formData.rebateAmount),
          rebateType: formData.rebateType,
          rebateRate: formData.rebateRate ? parseFloat(formData.rebateRate) : 0,
          remark: formData.remark || null,
          isHidden: formData.isHidden,
        },
      });

      setShowAddDialog(false);
      setFormData({
        saleId: '',
        plumberId: '',
        supplierName: '',
        rebateAmount: '',
        rebateType: 'cash',
        rebateRate: '',
        remark: '',
        isHidden: false,
      });
      loadData();
      toast('回扣记录添加成功', 'success');
    } catch (error) {
      console.error('Failed to add rebate:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleDeleteRebate = async (id: string) => {
    if (!confirm('确定要删除这条回扣记录吗？')) return;

    try {
      await db.rebate.delete({ where: { id } });
      loadData();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete rebate:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const filteredRebates = rebates.filter((r) => {
    const matchesSearch =
      !searchTerm ||
      r.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.plumber?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.remark?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = rebateTypeFilter === 'all' || r.rebateType === rebateTypeFilter;
    const matchesHidden = showHidden || !r.isHidden;
    return matchesSearch && matchesType && matchesHidden;
  });

  const tableProps = useDataTable<Rebate & { plumber?: Customer | null }>({
    data: filteredRebates,
    defaultPageSize: 20,
  });

  const totalRebateAmount = filteredRebates.reduce((sum, r) => sum + r.rebateAmount, 0);
  const visibleRebateAmount = filteredRebates.filter(r => !r.isHidden).reduce((sum, r) => sum + r.rebateAmount, 0);

  const rebateTypeLabels: Record<string, string> = {
    cash: '现金',
    transfer: '转账',
    discount: '折扣',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">回扣管理</h2>
          <p className="text-slate-500 mt-1">记录与管理销售返点（水电工返点）</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-orange-500 hover:bg-orange-600">
          + 添加回扣记录
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">回扣总额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalRebateAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">可见回扣</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(visibleRebateAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">隐蔽回扣</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(totalRebateAmount - visibleRebateAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {showAddDialog && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle>添加回扣记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">关联销售单</label>
                <Select
                  value={formData.saleId}
                  onValueChange={(value) => {
                    const sale = sales.find(s => s.id === value);
                    setFormData({
                      ...formData,
                      saleId: value,
                      supplierName: sale?.customer?.name || '',
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择销售单" />
                  </SelectTrigger>
                  <SelectContent>
                    {sales.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        {sale.invoiceNo || sale.id.slice(0, 8)} - {sale.customer?.name || '散客'} - {formatCurrency(sale.totalAmount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">水电工（介绍人）</label>
                <Select
                  value={formData.plumberId}
                  onValueChange={(value) => setFormData({ ...formData, plumberId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择水电工（可选）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">供应商/客户名称</label>
                <Input
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="自动填充或手动输入"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">回扣金额</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.rebateAmount}
                  onChange={(e) => setFormData({ ...formData, rebateAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">回扣类型</label>
                <Select
                  value={formData.rebateType}
                  onValueChange={(value) => setFormData({ ...formData, rebateType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">现金</SelectItem>
                    <SelectItem value="transfer">转账</SelectItem>
                    <SelectItem value="discount">折扣</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">回扣比例 (%)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.rebateRate}
                  onChange={(e) => setFormData({ ...formData, rebateRate: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">备注</label>
                <Input
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isHidden"
                checked={formData.isHidden}
                onChange={(e) => setFormData({ ...formData, isHidden: e.target.checked })}
              />
              <label htmlFor="isHidden" className="text-sm text-slate-700">
                隐蔽记录（仅管理员可见）
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                取消
              </Button>
              <Button onClick={handleAddRebate} className="bg-orange-500 hover:bg-orange-600">
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="搜索供应商、水电工..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 h-8"
            />

            <Select value={rebateTypeFilter} onValueChange={setRebateTypeFilter}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue placeholder="回扣类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="cash">现金</SelectItem>
                <SelectItem value="transfer">转账</SelectItem>
                <SelectItem value="discount">折扣</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant={showHidden ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowHidden(!showHidden)}
              className="h-8"
            >
              {showHidden ? '隐藏隐蔽回扣' : '显示隐蔽回扣'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setRebateTypeFilter('all');
                setShowHidden(false);
              }}
              className="h-8 text-slate-500"
            >
              🔄 重置筛选
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">加载中...</div>
          ) : tableProps.total === 0 ? (
            <div className="text-center py-8 text-slate-500">暂无回扣记录</div>
          ) : (
            <div className="space-y-3">
              {tableProps.data.map((rebate) => (
                <div
                  key={rebate.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    rebate.isHidden ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{rebate.supplierName}</span>
                      <Badge variant={rebate.isHidden ? 'warning' : 'default'}>
                        {rebateTypeLabels[rebate.rebateType] || rebate.rebateType}
                      </Badge>
                      {rebate.isHidden && <Badge variant="destructive">隐蔽</Badge>}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {new Date(rebate.recordedAt).toLocaleDateString('zh-CN')}
                      {rebate.plumber && ` - 水电工: ${rebate.plumber.name}`}
                      {rebate.rebateRate > 0 && ` - 比例: ${rebate.rebateRate}%`}
                      {rebate.remark && ` - ${rebate.remark}`}
                    </div>
                    {rebate.sale && (
                      <div className="text-xs text-slate-400 mt-1">
                        关联销售单: {rebate.sale.invoiceNo || rebate.sale.id.slice(0, 8)} - {rebate.sale.customer?.name || '散客'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold ${rebate.isHidden ? 'text-amber-600' : 'text-green-600'}`}>
                      {formatCurrency(rebate.rebateAmount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRebate(rebate.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
    </div>
  );
}
