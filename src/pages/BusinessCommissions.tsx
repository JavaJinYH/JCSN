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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { Combobox } from '@/components/Combobox';
import { BusinessCommissionService } from '@/services/BusinessCommissionService';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type CommissionType = 'OUTGOING' | 'INCOMING';
type CommissionCategory = 'INTRODUCER' | 'SUPPLIER';

interface Commission {
  id: string;
  type: CommissionType;
  category: CommissionCategory;
  amount: number;
  recordedAt: string;
  remark?: string;
  project?: { name: string; id: string };
  contact?: { name: string };
  supplier?: { name: string };
  product?: { name: string };
  saleOrder?: { invoiceNo?: string; id: string };
}

export function BusinessCommissions() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSaleOrderSelectDialog, setShowSaleOrderSelectDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    type: 'OUTGOING' as CommissionType,
    category: 'INTRODUCER' as CommissionCategory,
    projectId: '__none__' as string,
    saleOrderId: '__none__' as string,
    contactId: '__none__' as string,
    supplierId: '__none__' as string,
    productId: '__none__' as string,
    amount: '',
    remark: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      loadProjects();
      loadContacts();
      loadSuppliers();
      loadProducts();
    }
  }, [showAddDialog]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await BusinessCommissionService.getCommissions();
      setCommissions(data);
    } catch (error) {
      console.error('Failed to load commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await BusinessCommissionService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadSalesByProject = async (projectId: string) => {
    try {
      let data;
      if (projectId && projectId !== '__none__') {
        data = await BusinessCommissionService.getSaleOrdersByProject(projectId);
      } else {
        data = await BusinessCommissionService.getAllSaleOrders();
      }
      setSales(data);
    } catch (error) {
      console.error('Failed to load sales:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await BusinessCommissionService.getContacts();
      setContacts(data);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await BusinessCommissionService.getSuppliers();
      setSuppliers(data);
    } catch (error) {
      console.error('Failed to load suppliers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await BusinessCommissionService.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleOpenSaleOrderSelect = async () => {
    await loadSalesByProject(formData.projectId);
    setShowSaleOrderSelectDialog(true);
  };

  const handleSelectSaleOrder = (saleOrderId: string) => {
    setFormData({ ...formData, saleOrderId });
    setShowSaleOrderSelectDialog(false);
  };

  const handleAddCommission = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast('请输入金额', 'warning');
      return;
    }

    try {
      const contactId = formData.contactId === '__none__' ? undefined : formData.contactId;
      const supplierId = formData.supplierId === '__none__' ? undefined : formData.supplierId;
      const productId = formData.productId === '__none__' ? undefined : formData.productId;
      const saleOrderId = formData.saleOrderId === '__none__' ? undefined : formData.saleOrderId;
      const projectId = formData.projectId === '__none__' ? undefined : formData.projectId;

      await BusinessCommissionService.createCommission({
        type: formData.type,
        category: formData.category,
        projectId,
        saleOrderId,
        contactId,
        supplierId,
        productId,
        amount: parseFloat(formData.amount),
        remark: formData.remark || undefined,
      });

      setShowAddDialog(false);
      setFormData({
        type: 'OUTGOING',
        category: 'INTRODUCER',
        projectId: '__none__',
        saleOrderId: '__none__',
        contactId: '__none__',
        supplierId: '__none__',
        productId: '__none__',
        amount: '',
        remark: '',
      });
      loadData();
      toast('业务返点记录添加成功', 'success');
    } catch (error) {
      console.error('Failed to add commission:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleDeleteCommission = async (id: string) => {
    if (!confirm('确定要删除这条返点记录吗？')) return;
    try {
      await BusinessCommissionService.deleteCommission(id);
      loadData();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete commission:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const filteredCommissions = commissions.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.remark?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || c.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || c.category === categoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const tableProps = useDataTable<Commission>({
    data: filteredCommissions,
    defaultPageSize: 20,
  });

  const totalOutgoing = filteredCommissions.filter(c => c.type === 'OUTGOING').reduce((sum, c) => sum + c.amount, 0);
  const totalIncoming = filteredCommissions.filter(c => c.type === 'INCOMING').reduce((sum, c) => sum + c.amount, 0);

  const typeLabels: Record<string, string> = {
    OUTGOING: '支出（介绍人返点）',
    INCOMING: '收入（供应商返点）',
  };

  const categoryLabels: Record<string, string> = {
    INTRODUCER: '介绍人',
    SUPPLIER: '供应商',
  };

  const projectOptions = projects.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.entity?.name || '未关联主体'})`,
  }));

  const contactOptions = contacts.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.code || '-'})`,
  }));

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
  }));

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">业务返点</h2>
          <p className="text-slate-500 mt-1">记录介绍人返点（支出）和供应商返点（收入）</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-blue-500 hover:bg-blue-600">
          + 添加返点记录
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">介绍人返点（支出）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutgoing)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">供应商返点（收入）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncoming)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">净返点</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalIncoming - totalOutgoing >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(totalIncoming - totalOutgoing)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加返点记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs defaultValue="introducer" onValueChange={(value) => {
              const type = value === 'introducer' ? 'OUTGOING' : 'INCOMING';
              const category = value === 'introducer' ? 'INTRODUCER' : 'SUPPLIER';
              setFormData({
                ...formData,
                type,
                category,
                projectId: '__none__',
                saleOrderId: '__none__',
                contactId: '__none__',
                supplierId: '__none__',
                productId: '__none__',
              });
            }}>
              <TabsList>
                <TabsTrigger value="introducer">介绍人返点（支出）</TabsTrigger>
                <TabsTrigger value="supplier">供应商返点（收入）</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">关联项目（可选）</label>
                <Combobox
                  value={formData.projectId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, projectId: value, saleOrderId: '__none__' });
                  }}
                  options={projectOptions}
                  placeholder="搜索并选择项目"
                  emptyText="未找到项目"
                  allowCustom={false}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">关联销售单（可选）</label>
                <div className="flex gap-2">
                  <Input
                    value={(() => {
                      if (formData.saleOrderId === '__none__') return '';
                      const sale = sales.find((s) => s.id === formData.saleOrderId);
                      if (sale) return sale.invoiceNo || sale.id.slice(0, 8);
                      return '已选择';
                    })()}
                    placeholder="未选择"
                    readOnly
                    onClick={handleOpenSaleOrderSelect}
                    className="cursor-pointer"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setFormData({ ...formData, saleOrderId: '__none__' })}
                  >
                    清除
                  </Button>
                </div>
              </div>

              {formData.category === 'INTRODUCER' ? (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">介绍人（可选）</label>
                  <Combobox
                    value={formData.contactId}
                    onValueChange={(value) => setFormData({ ...formData, contactId: value })}
                    options={contactOptions}
                    placeholder="搜索并选择介绍人"
                    emptyText="未找到介绍人"
                    allowCustom={false}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">供应商</label>
                    <Combobox
                      value={formData.supplierId}
                      onValueChange={(value) => setFormData({ ...formData, supplierId: value })}
                      options={supplierOptions}
                      placeholder="搜索并选择供应商"
                      emptyText="未找到供应商"
                      allowCustom={false}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">关联商品（可选）</label>
                    <Combobox
                      value={formData.productId}
                      onValueChange={(value) => setFormData({ ...formData, productId: value })}
                      options={productOptions}
                      placeholder="搜索并选择商品"
                      emptyText="未找到商品"
                      allowCustom={false}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">金额</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddCommission} className="bg-blue-500 hover:bg-blue-600">
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaleOrderSelectDialog} onOpenChange={setShowSaleOrderSelectDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>选择销售单</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {sales.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                {formData.projectId === '__none__' ? '暂无销售单' : '该项目暂无销售单'}
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:bg-slate-50 ${formData.saleOrderId === sale.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                    onClick={() => handleSelectSaleOrder(sale.id)}
                  >
                    <div className="font-medium text-slate-800">
                      {sale.invoiceNo || sale.id.slice(0, 8)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {sale.buyer?.name || '散客'} - {new Date(sale.saleDate).toLocaleDateString('zh-CN')} - {formatCurrency(sale.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaleOrderSelectDialog(false)}>
              取消
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="搜索项目、介绍人、供应商、商品..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 h-8"
            />

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="OUTGOING">支出</SelectItem>
                <SelectItem value="INCOMING">收入</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="INTRODUCER">介绍人</SelectItem>
                <SelectItem value="SUPPLIER">供应商</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('all');
                setCategoryFilter('all');
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
            <div className="text-center py-8 text-slate-500">暂无返点记录</div>
          ) : (
            <div className="space-y-3">
              {tableProps.data.map((commission) => (
                <div
                  key={commission.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    commission.type === 'OUTGOING' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={commission.type === 'OUTGOING' ? 'destructive' : 'default'}>
                        {typeLabels[commission.type]}
                      </Badge>
                      <Badge variant="secondary">{categoryLabels[commission.category]}</Badge>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {new Date(commission.recordedAt).toLocaleDateString('zh-CN')}
                      {commission.project && ` - 项目: ${commission.project.name}`}
                      {commission.contact && ` - 介绍人: ${commission.contact.name}`}
                      {commission.supplier && ` - 供应商: ${commission.supplier.name}`}
                      {commission.product && ` - 商品: ${commission.product.name}`}
                      {commission.remark && ` - ${commission.remark}`}
                    </div>
                    {commission.saleOrder && (
                      <div className="text-xs text-slate-400 mt-1">
                        关联销售单: {commission.saleOrder.invoiceNo || commission.saleOrder.id.slice(0, 8)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-bold ${commission.type === 'OUTGOING' ? 'text-orange-600' : 'text-green-600'}`}>
                      {commission.type === 'OUTGOING' ? '-' : '+'}{formatCurrency(commission.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCommission(commission.id)}
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
