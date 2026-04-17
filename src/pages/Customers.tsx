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
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { tagLabels, tagColors, getTagDescription, copyToClipboard, getPrimaryPhone, phoneTypeOptions } from '@/lib/customerUtils';
import type { Customer, CustomerCategory, Sale, CustomerPhone, Rebate, Project } from '@/lib/types';
import { calculateCustomerValueScore } from '@/lib/customerUtils';
import { toast } from '@/components/Toast';

interface CustomerWithStats extends Customer {
  totalSpent: number;
  saleCount: number;
  lastSaleDate: Date | null;
  customerCategory?: CustomerCategory | null;
  phoneRecords?: CustomerPhone[];
  recentSales?: any[];
  rebates?: any[];
  projects?: any[];
}

interface CustomerDetailData {
  customer: Customer;
  totalSpent: number;
  saleCount: number;
  lastSaleDate: Date | null;
  totalRebate: number;
  rebateCount: number;
  projectCount: number;
  totalReceivable: number;
  recentSales: any[];
  rebates: any[];
  projects: any[];
  receivables: any[];
  valueScore: number;
  autoTag: string | null;
  manualTag: string | null;
}

export function Customers() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = useState<Customer | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [customerPhones, setCustomerPhones] = useState<CustomerPhone[]>([]);
  const [newPhone, setNewPhone] = useState({ phone: '', phoneType: 'mobile', isPrimary: false, remark: '' });
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    phones: '',
    customerType: '普通客户',
    customerCategoryId: '__none__',
    address: '',
    remark: '',
    manualTag: '',
  });

  const [customerCategoryFilter, setCustomerCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const customersData = await db.customer.findMany({
        include: { customerCategory: true, phoneRecords: true },
        orderBy: { name: 'asc' },
      });

      const customersWithStats: CustomerWithStats[] = await Promise.all(
        customersData.map(async (customer) => {
          const sales = await db.sale.findMany({
            where: { customerId: customer.id },
          });
          const totalSpent = sales.reduce((sum, s) => sum + s.paidAmount, 0);
          const lastSale = sales.length > 0
            ? await db.sale.findFirst({
                where: { customerId: customer.id },
                orderBy: { saleDate: 'desc' },
              })
            : null;

          return {
            ...customer,
            totalSpent,
            saleCount: sales.length,
            lastSaleDate: lastSale?.saleDate || null,
          };
        })
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phoneRecords?.some((p: CustomerPhone) => p.phone.includes(searchTerm));
    const matchesType =
      customerTypeFilter === 'all' || c.customerType === customerTypeFilter;
    const matchesCategory =
      customerCategoryFilter === 'all' || c.customerCategoryId === customerCategoryFilter;
    const matchesTag =
      tagFilter === 'all' || (c.manualTag || c.autoTag) === tagFilter;
    return matchesSearch && matchesType && matchesCategory && matchesTag;
  });

  const tableProps = useDataTable<CustomerWithStats>({
    data: filteredCustomers,
    defaultPageSize: 20,
  });

  const handleAddCustomer = async () => {
    if (!formData.name.trim()) {
      toast('请输入客户姓名', 'warning');
      return;
    }

    try {
      await db.customer.create({
        data: {
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          phones: formData.phones.trim() || null,
          customerType: formData.customerType,
          customerCategoryId: formData.customerCategoryId === '__none__' ? null : formData.customerCategoryId,
          address: formData.address.trim() || null,
          remark: formData.remark.trim() || null,
        },
      });

      setShowAddDialog(false);
      setFormData({ name: '', phone: '', phones: '', customerType: '普通客户', customerCategoryId: '__none__', address: '', remark: '', manualTag: '' });
      loadData();
      toast('添加成功', 'success');
    } catch (error) {
      console.error('Failed to add customer:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editCustomer || !formData.name.trim()) {
      toast('请输入客户姓名', 'warning');
      return;
    }

    try {
      await db.customer.update({
        where: { id: editCustomer.id },
        data: {
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          phones: formData.phones.trim() || null,
          customerType: formData.customerType,
          customerCategoryId: formData.customerCategoryId === '__none__' ? null : formData.customerCategoryId,
          address: formData.address.trim() || null,
          manualTag: formData.manualTag || null,
        },
      });

      setEditCustomer(null);
      loadData();
      toast('更新成功', 'success');
    } catch (error) {
      console.error('Failed to update customer:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteCustomer) return;

    try {
      await db.customer.delete({ where: { id: deleteCustomer.id } });
      setDeleteCustomer(null);
      loadData();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete customer:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const handleRecalculateScores = async () => {
    const confirmed = window.confirm('确定要重新计算所有客户评分吗？');
    if (!confirmed) return;

    try {
      setLoading(true);
      const customersData = await db.customer.findMany();
      let updated = 0;

      for (const customer of customersData) {
        const sales = await db.sale.findMany({
          where: { customerId: customer.id },
          include: { items: true },
        });
        const receivables = await db.accountReceivable.findMany({
          where: { customerId: customer.id },
        });
        const rebates = await db.rebate.findMany({
          where: { plumberId: customer.id },
        });

        const score = await calculateCustomerValueScore(customer.id, sales, receivables, rebates);

        await db.customer.update({
          where: { id: customer.id },
          data: {
            valueScore: score.totalScore,
            autoTag: score.autoTag,
          },
        });
        updated++;
      }

      loadData();
      toast(`评分更新完成！共更新了 ${updated} 个客户`, 'success');
    } catch (error) {
      console.error('Failed to recalculate scores:', error);
      toast('评分更新失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPhone = async (customer: CustomerWithStats) => {
    const phones = customer.phoneRecords || [];
    const primaryPhone = getPrimaryPhone(phones.map(p => ({ phone: p.phone, isPrimary: p.isPrimary })));
    const phoneToCopy = primaryPhone || (phones.length > 0 ? phones[0].phone : customer.phone);

    if (!phoneToCopy) {
      toast('该客户没有联系电话', 'error');
      return;
    }

    const success = await copyToClipboard(phoneToCopy);
    if (success) {
      toast(`已复制: ${phoneToCopy}`, 'success');
    } else {
      toast('复制失败', 'error');
    }
  };

  const handleAddPhone = async () => {
    if (!editCustomer) return;
    if (!newPhone.phone.trim()) {
      toast('请输入手机号', 'warning');
      return;
    }
    if (customerPhones.length >= 5) {
      toast('最多只能添加5个联系电话', 'warning');
      return;
    }

    try {
      await db.customerPhone.create({
        data: {
          customerId: editCustomer.id,
          phone: newPhone.phone.trim(),
          phoneType: newPhone.phoneType,
          isPrimary: newPhone.isPrimary || customerPhones.length === 0,
          remark: newPhone.remark || null,
        },
      });

      const updatedPhones = await db.customerPhone.findMany({
        where: { customerId: editCustomer.id },
      });
      setCustomerPhones(updatedPhones);
      setNewPhone({ phone: '', phoneType: 'mobile', isPrimary: false, remark: '' });
      toast('添加成功', 'success');
    } catch (error) {
      console.error('Failed to add phone:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleUpdatePhone = async (phoneId: string, isPrimary: boolean) => {
    if (!editCustomer) return;

    try {
      if (isPrimary) {
        await db.customerPhone.updateMany({
          where: { customerId: editCustomer.id },
          data: { isPrimary: false },
        });
      }

      await db.customerPhone.update({
        where: { id: phoneId },
        data: { isPrimary },
      });

      const updatedPhones = await db.customerPhone.findMany({
        where: { customerId: editCustomer.id },
      });
      setCustomerPhones(updatedPhones);
      toast('更新成功', 'success');
    } catch (error) {
      console.error('Failed to update phone:', error);
      toast('更新失败', 'error');
    }
  };

  const handleDeletePhone = async (phoneId: string) => {
    if (!editCustomer) return;
    if (!confirm('确定要删除这个联系电话吗？')) return;

    try {
      await db.customerPhone.delete({ where: { id: phoneId } });
      const updatedPhones = await db.customerPhone.findMany({
        where: { customerId: editCustomer.id },
      });
      setCustomerPhones(updatedPhones);
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete phone:', error);
      toast('删除失败', 'error');
    }
  };

  const openEditDialog = async (customer: CustomerWithStats) => {
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      phones: customer.phones || '',
      customerType: customer.customerType,
      customerCategoryId: customer.customerCategoryId || '__none__',
      address: customer.address || '',
      remark: customer.remark || '',
      manualTag: customer.manualTag || '',
    });
    setEditCustomer(customer);

    const phonesData = await db.customerPhone.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    setCustomerPhones(phonesData);
  };

  const handleOpenDetail = async (customer: CustomerWithStats) => {
    setDetailLoading(true);
    try {
      const [sales, rebates, projects, receivables, customerData] = await Promise.all([
        db.sale.findMany({
          where: { customerId: customer.id },
          include: { items: { include: { product: true } }, project: true },
          orderBy: { saleDate: 'desc' },
          take: 10,
        }),
        db.rebate.findMany({
          where: { plumberId: customer.id },
          orderBy: { recordedAt: 'desc' },
          take: 10,
        }),
        db.project.findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        db.accountReceivable.findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: 'desc' },
        }),
        db.customer.findUnique({
          where: { id: customer.id },
          include: { phoneRecords: true, customerCategory: true },
        }),
      ]);

      const totalSpent = sales.reduce((sum, s) => sum + s.paidAmount, 0);
      const totalRebate = rebates.reduce((sum, r) => sum + r.rebateAmount, 0);
      const totalReceivable = receivables.reduce((sum, r) => sum + r.remainingAmount, 0);

      setCustomerDetail({
        customer: customerData!,
        totalSpent,
        saleCount: sales.length,
        lastSaleDate: sales[0]?.saleDate || null,
        totalRebate,
        rebateCount: rebates.length,
        projectCount: projects.length,
        totalReceivable,
        recentSales: sales,
        rebates,
        projects,
        receivables,
        valueScore: customerData?.valueScore || 0,
        autoTag: customerData?.autoTag || null,
        manualTag: customerData?.manualTag || null,
      });
      setShowDetailDialog(true);
    } catch (error) {
      console.error('Failed to load customer detail:', error);
      toast('加载客户详情失败', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const getCustomerTypeBadge = (type: string) => {
    switch (type) {
      case '水电工':
        return <Badge className="bg-blue-500">水电工</Badge>;
      case '批发商':
        return <Badge className="bg-purple-500">批发商</Badge>;
      default:
        return <Badge variant="secondary">普通客户</Badge>;
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
          <h2 className="text-2xl font-bold text-slate-800">客户管理</h2>
          <p className="text-slate-500 mt-1">管理客户信息和消费记录</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
          + 添加客户
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="普通客户">普通客户</SelectItem>
                <SelectItem value="水电工">水电工</SelectItem>
                <SelectItem value="批发商">批发商</SelectItem>
              </SelectContent>
            </Select>

            <Select value={customerCategoryFilter} onValueChange={setCustomerCategoryFilter}>
              <SelectTrigger className="w-36 h-8">
                <SelectValue placeholder="全部分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="category-1">长期合作客户（95折）</SelectItem>
                <SelectItem value="category-2">水电工专属（9折）</SelectItem>
                <SelectItem value="category-3">批发客户（85折）</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue placeholder="全部标签" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部标签</SelectItem>
                <SelectItem value="★">★ 高价值</SelectItem>
                <SelectItem value="△">△ 中等价值</SelectItem>
                <SelectItem value="○">○ 普通</SelectItem>
                <SelectItem value="×">× 低价值</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="搜索客户姓名、电话..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 h-8"
            />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setCustomerTypeFilter('all');
                setCustomerCategoryFilter('all');
                setTagFilter('all');
              }}
              className="h-8 text-slate-500"
            >
              重置筛选
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>客户名称</TableHead>
                <TableHead>标签</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>累计消费</TableHead>
                <TableHead>订单数</TableHead>
                <TableHead>最近购买</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.total === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    暂无客户数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((customer) => {
                  const displayTag = customer.manualTag || customer.autoTag;
                  const tagSymbol = displayTag ? tagLabels[displayTag] : '';
                  const tagColorClass = displayTag ? tagColors[displayTag] : 'text-slate-300';
                  return (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        {tagSymbol && (
                          <span className={`text-lg ${tagColorClass}`} title={`评分: ${customer.valueScore || 0}`}>
                            {tagSymbol}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">
                            {customer.phoneRecords && customer.phoneRecords.length > 0
                              ? customer.phoneRecords.map((p: CustomerPhone) => p.phone).join(', ')
                              : customer.phone || '-'}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-orange-600"
                            onClick={() => handleCopyPhone(customer)}
                            title="复制手机号"
                          >
                            📋
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getCustomerTypeBadge(customer.customerType)}</TableCell>
                      <TableCell className="font-mono text-orange-600">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell>{customer.saleCount}</TableCell>
                      <TableCell className="text-slate-500">
                        {customer.lastSaleDate
                          ? new Date(customer.lastSaleDate).toLocaleDateString('zh-CN')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDetail(customer)}>
                            详情
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => openEditDialog(customer)}>
                            编辑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setDeleteCustomer(customer)}
                          >
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-800">{customers.length}</div>
            <div className="text-sm text-slate-500">客户总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {customers.filter((c) => c.customerType === '水电工').length}
            </div>
            <div className="text-sm text-slate-500">水电工</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(
                customers.reduce((sum, c) => sum + c.totalSpent, 0)
              )}
            </div>
            <div className="text-sm text-slate-500">累计总消费</div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新客户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                客户姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入客户姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">联系电话</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="输入联系电话"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备用电话</label>
              <Input
                value={formData.phones}
                onChange={(e) => setFormData({ ...formData, phones: e.target.value })}
                placeholder="多个电话用逗号分隔"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">客户类型</label>
              <Select
                value={formData.customerType}
                onValueChange={(value) => setFormData({ ...formData, customerType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="普通客户">普通客户</SelectItem>
                  <SelectItem value="水电工">水电工</SelectItem>
                  <SelectItem value="批发商">批发商</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">客户分类</label>
              <Select
                value={formData.customerCategoryId}
                onValueChange={(value) => setFormData({ ...formData, customerCategoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无分类</SelectItem>
                  <SelectItem value="category-1">长期合作客户（95折）</SelectItem>
                  <SelectItem value="category-2">水电工专属（9折）</SelectItem>
                  <SelectItem value="category-3">批发客户（85折）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">地址</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="输入地址"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddCustomer}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCustomer} onOpenChange={() => setEditCustomer(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑客户</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                客户姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">联系电话管理（最多5个）</h4>

              <div className="space-y-2 mb-3">
                {customerPhones.length === 0 ? (
                  <p className="text-sm text-slate-500">暂无联系电话</p>
                ) : (
                  customerPhones.map((phone) => (
                    <div key={phone.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                      <input
                        type="radio"
                        checked={phone.isPrimary}
                        onChange={() => handleUpdatePhone(phone.id, !phone.isPrimary)}
                        className="mr-1"
                      />
                      <span className="flex-1">
                        <span className="font-medium">{phone.phone}</span>
                        {phone.isPrimary && <Badge className="ml-2 bg-orange-100 text-orange-700 text-xs">主</Badge>}
                        <span className="text-xs text-slate-500 ml-2">
                          {phoneTypeOptions.find(t => t.value === phone.phoneType)?.label || phone.phoneType}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 h-6 px-2"
                        onClick={() => handleDeletePhone(phone.id)}
                      >
                        删除
                      </Button>
                    </div>
                  ))
                )}
              </div>

              {customerPhones.length < 5 && (
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="输入手机号"
                      value={newPhone.phone}
                      onChange={(e) => setNewPhone({ ...newPhone, phone: e.target.value })}
                    />
                  </div>
                  <div className="w-28">
                    <select
                      className="w-full h-10 px-3 border rounded-md bg-white"
                      value={newPhone.phoneType}
                      onChange={(e) => setNewPhone({ ...newPhone, phoneType: e.target.value })}
                    >
                      {phoneTypeOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={newPhone.isPrimary}
                      onChange={(e) => setNewPhone({ ...newPhone, isPrimary: e.target.checked })}
                      id="phone-is-primary"
                    />
                    <label htmlFor="phone-is-primary" className="text-sm">主号</label>
                  </div>
                  <Button onClick={handleAddPhone} size="sm">添加</Button>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">客户类型</label>
              <Select
                value={formData.customerType}
                onValueChange={(value) => setFormData({ ...formData, customerType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="普通客户">普通客户</SelectItem>
                  <SelectItem value="水电工">水电工</SelectItem>
                  <SelectItem value="批发商">批发商</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">客户分类</label>
              <Select
                value={formData.customerCategoryId}
                onValueChange={(value) => setFormData({ ...formData, customerCategoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无分类</SelectItem>
                  <SelectItem value="category-1">长期合作客户（95折）</SelectItem>
                  <SelectItem value="category-2">水电工专属（9折）</SelectItem>
                  <SelectItem value="category-3">批发客户（85折）</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">地址</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">手动标签（覆盖自动标签）</label>
              <Select
                value={formData.manualTag || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, manualTag: value === '__none__' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="使用自动标签" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">使用自动标签</SelectItem>
                  <SelectItem value="★">★ 高价值客户</SelectItem>
                  <SelectItem value="△">△ 中等价值客户</SelectItem>
                  <SelectItem value="○">○ 普通客户</SelectItem>
                  <SelectItem value="×">× 低价值客户</SelectItem>
                </SelectContent>
              </Select>
              {editCustomer && editCustomer.autoTag && (
                <p className="text-xs text-slate-500 mt-1">
                  自动标签: {getTagDescription(editCustomer.autoTag)} ({editCustomer.valueScore}分)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCustomer(null)}>
              取消
            </Button>
            <Button onClick={handleUpdateCustomer}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteCustomer} onOpenChange={() => setDeleteCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              确定要删除客户 <strong>{deleteCustomer?.name}</strong> 吗？
            </p>
            <p className="text-sm text-red-500 mt-2">此操作不可恢复。</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCustomer(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteCustomer}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>客户详情 - {customerDetail?.customer.name}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-500">加载中...</div>
            </div>
          ) : customerDetail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">累计消费</div>
                  <div className="text-xl font-bold text-blue-600">{formatCurrency(customerDetail.totalSpent)}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">消费订单</div>
                  <div className="text-xl font-bold text-green-600">{customerDetail.saleCount} 笔</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">累计返点</div>
                  <div className="text-xl font-bold text-purple-600">{formatCurrency(customerDetail.totalRebate)}</div>
                </div>
                <div className={customerDetail.totalReceivable > 0 ? 'bg-red-50 p-4 rounded-lg' : 'bg-slate-50 p-4 rounded-lg'}>
                  <div className="text-sm text-slate-500">当前欠款</div>
                  <div className={`text-xl font-bold ${customerDetail.totalReceivable > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                    {formatCurrency(customerDetail.totalReceivable)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">客户类型:</span>
                      <span>{customerDetail.customer.customerType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">客户分类:</span>
                      <span>{customerDetail.customer.customerCategory?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">联系电话:</span>
                      <span>{customerDetail.customer.phone || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">地址:</span>
                      <span>{customerDetail.customer.address || '-'}</span>
                    </div>
                    {customerDetail.customer.remark && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">备注:</span>
                        <span>{customerDetail.customer.remark}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">价值评估</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">价值评分:</span>
                      <span className="font-bold">{customerDetail.valueScore} 分</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">自动标签:</span>
                      <span>{customerDetail.autoTag ? tagLabels[customerDetail.autoTag] : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">手动标签:</span>
                      <span>{customerDetail.manualTag ? tagLabels[customerDetail.manualTag] : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">关联项目:</span>
                      <span>{customerDetail.projectCount} 个</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">最后购买:</span>
                      <span>{customerDetail.lastSaleDate ? new Date(customerDetail.lastSaleDate).toLocaleDateString('zh-CN') : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {customerDetail.recentSales.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">最近订单 ({customerDetail.saleCount})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>单号</TableHead>
                        <TableHead>日期</TableHead>
                        <TableHead>项目</TableHead>
                        <TableHead className="text-right">金额</TableHead>
                        <TableHead className="text-right">已付</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerDetail.recentSales.slice(0, 5).map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-sm">
                            {sale.invoiceNo || sale.id.substring(0, 8)}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {new Date(sale.saleDate).toLocaleDateString('zh-CN')}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {sale.project?.name || '-'}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(sale.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-600">
                            {formatCurrency(sale.paidAmount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {customerDetail.rebates.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">返点记录 ({customerDetail.rebateCount})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>金额</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerDetail.rebates.slice(0, 5).map((rebate, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-purple-600">
                            {formatCurrency(rebate.rebateAmount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {rebate.rebateType === 'cash' ? '现金' : rebate.rebateType === 'transfer' ? '转账' : '抵扣'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {rebate.recordedAt ? new Date(rebate.recordedAt).toLocaleDateString('zh-CN') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {customerDetail.projects.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">关联项目 ({customerDetail.projectCount})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>项目名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>开始日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerDetail.projects.slice(0, 5).map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>
                            <Badge className={
                              project.status === '进行中' ? 'bg-blue-500' :
                              project.status === '已完成' ? 'bg-green-500' :
                              'bg-slate-500'
                            }>
                              {project.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {project.startDate ? new Date(project.startDate).toLocaleDateString('zh-CN') : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
