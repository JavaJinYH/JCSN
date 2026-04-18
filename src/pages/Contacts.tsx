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
import { toast } from '@/components/Toast';
import type { Contact, ContactPhone, Entity, BizProject } from '@/lib/types';

interface PersonInfo {
  id: string;
  code: string;
  name: string;
  primaryPhone: string;
  otherPhones: string[];
  address: string | null;
  remark: string | null;
  contactType: string;
  valueScore: number | null;
  totalSpent: number;
  orderCount: number;
  lastOrderDate: Date | null;
  entityName?: string;
  _contactData: Contact;
}

export function Contacts() {
  const [persons, setPersons] = useState<PersonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('__all__');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [contactDetail, setContactDetail] = useState<PersonInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSales, setDetailSales] = useState<any[]>([]);
  const [detailRebates, setDetailRebates] = useState<any[]>([]);
  const [detailProjects, setDetailProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    primaryPhone: '',
    address: '',
    remark: '',
    contactType: 'customer',
    valueScore: null as number | null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const contactsData = await db.contact.findMany({
        orderBy: { name: 'asc' },
      });

      const contactPersons: PersonInfo[] = await Promise.all(
        contactsData.map(async (contact) => {
          const orders = await db.saleOrder.findMany({
            where: { buyerId: contact.id },
          });
          const totalSpent = orders.reduce((sum, o) => sum + o.paidAmount, 0);
          const lastOrder = orders.length > 0
            ? await db.saleOrder.findFirst({
                where: { buyerId: contact.id },
                orderBy: { saleDate: 'desc' },
              })
            : null;

          const personalEntity = await db.entity.findFirst({
            where: { contactId: contact.id },
          });

          return {
            id: contact.id,
            code: contact.code,
            name: contact.name,
            primaryPhone: contact.primaryPhone,
            otherPhones: contact.phones ? [contact.phones] : [],
            address: contact.address,
            remark: contact.remark,
            contactType: contact.contactType,
            valueScore: contact.valueScore,
            totalSpent,
            orderCount: orders.length,
            lastOrderDate: lastOrder?.saleDate || null,
            entityName: personalEntity?.name,
            _contactData: contact,
          };
        })
      );

      setPersons(contactPersons);
    } catch (error) {
      console.error('[Contacts] 加载数据失败:', error);
      toast('加载数据失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPersons = persons.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.primaryPhone.includes(searchTerm) ||
      p.otherPhones.some(phone => phone.includes(searchTerm));
    const matchesType = typeFilter === '__all__' || p.contactType === typeFilter;
    return matchesSearch && matchesType;
  });

  const tableProps = useDataTable<PersonInfo>({
    data: filteredPersons,
    defaultPageSize: 20,
  });

  const handleAddContact = async () => {
    if (!formData.name.trim()) {
      toast('请输入联系人姓名', 'warning');
      return;
    }
    if (!formData.primaryPhone.trim()) {
      toast('请输入手机号', 'warning');
      return;
    }

    try {
      const existing = await db.contact.findFirst({
        where: { primaryPhone: formData.primaryPhone.trim() },
      });
      if (existing) {
        toast('该手机号已被使用', 'warning');
        return;
      }

      const contactCount = await db.contact.count();
      const newCode = `C${String(contactCount + 1).padStart(3, '0')}`;

      await db.contact.create({
        data: {
          code: newCode,
          name: formData.name.trim(),
          primaryPhone: formData.primaryPhone.trim(),
          address: formData.address.trim() || null,
          remark: formData.remark.trim() || null,
          contactType: formData.contactType,
        },
      });

      setShowAddDialog(false);
      setFormData({ name: '', code: '', primaryPhone: '', address: '', remark: '', contactType: 'customer', valueScore: null });
      loadData();
      toast('添加成功', 'success');
    } catch (error) {
      console.error('[Contacts] 添加联系人失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const openEditDialog = (person: PersonInfo) => {
    const contact = person._contactData;
    if (!contact) return;
    setFormData({
      name: contact.name,
      code: contact.code,
      primaryPhone: contact.primaryPhone,
      address: contact.address || '',
      remark: contact.remark || '',
      contactType: contact.contactType,
      valueScore: contact.valueScore,
    });
    setEditContact(contact);
  };

  const handleUpdateContact = async () => {
    if (!editContact || !formData.name.trim()) {
      toast('请输入联系人姓名', 'warning');
      return;
    }
    if (!formData.primaryPhone.trim()) {
      toast('请输入手机号', 'warning');
      return;
    }

    try {
      const existing = await db.contact.findFirst({
        where: {
          primaryPhone: formData.primaryPhone.trim(),
          NOT: { id: editContact.id },
        },
      });
      if (existing) {
        toast('该手机号已被其他联系人使用', 'warning');
        return;
      }

      await db.contact.update({
        where: { id: editContact.id },
        data: {
          name: formData.name.trim(),
          primaryPhone: formData.primaryPhone.trim(),
          address: formData.address.trim() || null,
          remark: formData.remark.trim() || null,
          contactType: formData.contactType,
          valueScore: formData.valueScore,
        },
      });

      setEditContact(null);
      loadData();
      toast('更新成功', 'success');
    } catch (error) {
      console.error('[Contacts] 更新联系人失败:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleOpenDetail = async (person: PersonInfo) => {
    setContactDetail(person);
    setShowDetailDialog(true);
    setDetailLoading(true);

    try {
      const [sales, rebates, projects] = await Promise.all([
        db.saleOrder.findMany({
          where: { buyerId: person.id },
          include: { project: true },
          orderBy: { saleDate: 'desc' },
          take: 10,
        }),
        db.rebate.findMany({
          where: { plumberId: person.id },
          orderBy: { recordedAt: 'desc' },
          take: 10,
        }),
        db.contactProjectRole.findMany({
          where: { contactId: person.id },
          include: { project: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);
      setDetailSales(sales);
      setDetailRebates(rebates);
      setDetailProjects(projects.map((r: any) => r.project).filter(Boolean));
    } catch (error) {
      console.error('[Contacts] 加载联系人详情失败:', error);
      toast('加载详情失败', 'error');
    } finally {
      setDetailLoading(false);
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
          <h2 className="text-2xl font-bold text-slate-800">联系人管理</h2>
          <p className="text-slate-500 mt-1">统一管理联系人和客户数据</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
          + 添加联系人
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-800">{persons.length}</div>
            <div className="text-sm text-slate-500">人员总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{persons.length}</div>
            <div className="text-sm text-slate-500">联系人总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {persons.filter(p => p.orderCount > 0).length}
            </div>
            <div className="text-sm text-slate-500">有订单联系人</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(persons.reduce((sum, p) => sum + p.totalSpent, 0))}
            </div>
            <div className="text-sm text-slate-500">累计消费总额</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              placeholder="搜索姓名、编号、手机号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 h-8"
            />

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">全部类型</SelectItem>
                <SelectItem value="customer">客户</SelectItem>
                <SelectItem value="plumber">水电工</SelectItem>
                <SelectItem value="company">公司联系人</SelectItem>
              </SelectContent>
            </Select>

            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                }}
                className="h-8 text-slate-500"
              >
                清除筛选
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>编号</TableHead>
                <TableHead>姓名</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>评分</TableHead>
                <TableHead>主手机号</TableHead>
                <TableHead>其他电话</TableHead>
                <TableHead>关联主体</TableHead>
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
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-mono text-slate-500">{person.code}</TableCell>
                    <TableCell className="font-medium">{person.name}</TableCell>
                    <TableCell>
                      {person.contactType === 'customer' && <Badge variant="outline" className="bg-blue-50">客户</Badge>}
                      {person.contactType === 'plumber' && <Badge variant="outline" className="bg-green-50">水电工</Badge>}
                      {person.contactType === 'company' && <Badge variant="outline" className="bg-purple-50">公司</Badge>}
                    </TableCell>
                    <TableCell>
                      {person.valueScore != null ? (
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-orange-600">{person.valueScore.toFixed(1)}</span>
                          <span className="text-yellow-500">★</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-orange-600">{person.primaryPhone}</TableCell>
                    <TableCell className="text-slate-500 text-sm">
                      {person.otherPhones.length > 0 ? person.otherPhones.join(', ') : '-'}
                    </TableCell>
                    <TableCell>
                      {person.entityName ? (
                        <Badge variant="outline">{person.entityName}</Badge>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-orange-600">
                      {formatCurrency(person.totalSpent)}
                    </TableCell>
                    <TableCell>{person.orderCount}</TableCell>
                    <TableCell className="text-slate-500">
                      {person.lastOrderDate
                        ? new Date(person.lastOrderDate).toLocaleDateString('zh-CN')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDetail(person)}
                        >
                          详情
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(person)}
                        >
                          编辑
                        </Button>
                      </div>
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">数据说明</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• 联系人数据用于新建销售单，支持选择购货人、付款人、介绍人、提货人</p>
          <p>• 点击「详情」查看联系人的订单、返点、项目等信息</p>
          <p>• 点击「编辑」修改联系人基本信息</p>
          <p>• 新增联系人请使用「+ 添加联系人」按钮</p>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新联系人</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入联系人姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                联系人类型
              </label>
              <Select value={formData.contactType} onValueChange={(v) => setFormData({ ...formData, contactType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="plumber">水电工</SelectItem>
                  <SelectItem value="company">公司联系人</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                客户评分
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.valueScore ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      valueScore: val ? parseFloat(val) : null,
                    });
                  }}
                  placeholder="0-10分"
                  className="w-32"
                />
                <span className="text-sm text-slate-500">分 (0-10)</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                主手机号 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.primaryPhone}
                onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                placeholder="输入手机号（唯一标识）"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">地址</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="输入地址"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="输入备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddContact}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editContact} onOpenChange={() => setEditContact(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑联系人</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入联系人姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                联系人类型
              </label>
              <Select value={formData.contactType} onValueChange={(v) => setFormData({ ...formData, contactType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="plumber">水电工</SelectItem>
                  <SelectItem value="company">公司联系人</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                主手机号 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.primaryPhone}
                onChange={(e) => setFormData({ ...formData, primaryPhone: e.target.value })}
                placeholder="输入手机号（唯一标识）"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">地址</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="输入地址"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="输入备注"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContact(null)}>
              取消
            </Button>
            <Button onClick={handleUpdateContact}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>联系人详情 - {contactDetail?.name}</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-500">加载中...</div>
            </div>
          ) : contactDetail && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">累计消费</div>
                  <div className="text-xl font-bold text-blue-600">{formatCurrency(contactDetail.totalSpent)}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">消费订单</div>
                  <div className="text-xl font-bold text-green-600">{contactDetail.orderCount} 笔</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">累计返点</div>
                  <div className="text-xl font-bold text-purple-600">
                    {formatCurrency(detailRebates.reduce((sum, r) => sum + (r.rebateAmount || 0), 0))}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">关联项目</div>
                  <div className="text-xl font-bold text-slate-600">{detailProjects.length} 个</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">主手机号:</span>
                      <span className="text-orange-600">{contactDetail.primaryPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">其他电话:</span>
                      <span>{contactDetail.otherPhones.length > 0 ? contactDetail.otherPhones.join(', ') : '-'}</span>
                    </div>
                    {contactDetail.address && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">地址:</span>
                        <span>{contactDetail.address}</span>
                      </div>
                    )}
                    {contactDetail.remark && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">备注:</span>
                        <span>{contactDetail.remark}</span>
                      </div>
                    )}
                    {contactDetail.entityName && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">关联主体:</span>
                        <Badge variant="outline">{contactDetail.entityName}</Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">消费统计</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">累计消费:</span>
                      <span className="font-bold text-orange-600">{formatCurrency(contactDetail.totalSpent)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">订单数量:</span>
                      <span>{contactDetail.orderCount} 笔</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">最近购买:</span>
                      <span>
                        {contactDetail.lastOrderDate
                          ? new Date(contactDetail.lastOrderDate).toLocaleDateString('zh-CN')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">返点记录:</span>
                      <span>{detailRebates.length} 条</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">关联项目:</span>
                      <span>{detailProjects.length} 个</span>
                    </div>
                  </div>
                </div>
              </div>

              {detailSales.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">最近订单 ({detailSales.length})</h4>
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
                      {detailSales.slice(0, 5).map((sale) => (
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
                            {formatCurrency(sale.totalAmount || sale.paidAmount)}
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

              {detailRebates.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">返点记录 ({detailRebates.length})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>金额</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead>日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailRebates.slice(0, 5).map((rebate, index) => (
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

              {detailProjects.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">关联项目 ({detailProjects.length})</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>项目名称</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>开始日期</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailProjects.slice(0, 5).map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>
                            <Badge className={
                              project.status === '进行中' ? 'bg-blue-500' :
                              project.status === '已完成' ? 'bg-green-500' :
                              'bg-slate-500'
                            }>
                              {project.status || '进行中'}
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