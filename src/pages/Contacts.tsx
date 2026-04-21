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
  DialogDescription,
} from '@/components/ui/dialog';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { ContactService } from '@/services/ContactService';
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
  autoTag: string | null;
  creditLevel: string;
  riskLevel: string;
  creditLimit: number;
  blacklist: boolean;
  blacklistReason: string | null;
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
  const [blacklistReason, setBlacklistReason] = useState('');
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false);
  const [selectedContactForBlacklist, setSelectedContactForBlacklist] = useState<PersonInfo | null>(null);
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
      const contactsData = await ContactService.getContacts();

      const contactPersons: PersonInfo[] = await Promise.all(
        contactsData.map(async (contact) => {
          const orders = await ContactService.getContactOrders(contact.id);
          const totalSpent = orders.reduce((sum, o) => sum + o.paidAmount, 0);
          const lastOrder = orders.length > 0
            ? await ContactService.getContactLastOrder(contact.id)
            : null;

          const personalEntity = await ContactService.getPersonalEntityByContact(contact.id);

          return {
            id: contact.id,
            code: contact.code,
            name: contact.name,
            primaryPhone: contact.primaryPhone,
            otherPhones: contact.phonesObj?.filter(p => !p.isPrimary).map(p => p.phone) || [],
            address: contact.address,
            remark: contact.remark,
            contactType: contact.contactType,
            valueScore: contact.valueScore,
            autoTag: contact.autoTag,
            creditLevel: contact.creditLevel,
            riskLevel: contact.riskLevel,
            creditLimit: contact.creditLimit,
            blacklist: contact.blacklist,
            blacklistReason: contact.blacklistReason,
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

  const handleRecalculateScore = async (contact: PersonInfo) => {
    try {
      setLoading(true);
      await ContactService.updateCustomerScore(contact.id);
      toast('客户评分已更新', 'success');
      await loadData();
    } catch (error) {
      console.error('[Contacts] 重新计算评分失败:', error);
      toast('更新评分失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateAllScores = async () => {
    try {
      setLoading(true);
      await ContactService.recalculateAllCustomerScores();
      toast('所有客户评分已更新', 'success');
      await loadData();
    } catch (error) {
      console.error('[Contacts] 重新计算所有评分失败:', error);
      toast('更新评分失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlacklist = (contact: PersonInfo) => {
    setSelectedContactForBlacklist(contact);
    setBlacklistReason(contact._contactData.blacklistReason || '');
    setShowBlacklistDialog(true);
  };

  const handleConfirmBlacklist = async () => {
    if (!selectedContactForBlacklist) return;
    try {
      await ContactService.setBlacklist(
        selectedContactForBlacklist.id,
        !selectedContactForBlacklist.blacklist,
        !selectedContactForBlacklist.blacklist ? blacklistReason : undefined
      );
      toast(selectedContactForBlacklist.blacklist ? '已从黑名单移除' : '已加入黑名单', 'success');
      await loadData();
    } catch (error) {
      console.error('[Contacts] 更新黑名单失败:', error);
      toast('操作失败', 'error');
    } finally {
      setShowBlacklistDialog(false);
      setSelectedContactForBlacklist(null);
      setBlacklistReason('');
    }
  };

  const getCreditLevelLabel = (level: string) => {
    const labels = {
      excellent: '优秀',
      good: '良好',
      normal: '普通',
      poor: '较差',
      blocked: '冻结',
    };
    return labels[level as keyof typeof labels] || level;
  };

  const getCreditLevelColor = (level: string) => {
    const colors = {
      excellent: 'bg-green-500',
      good: 'bg-blue-500',
      normal: 'bg-gray-500',
      poor: 'bg-orange-500',
      blocked: 'bg-red-500',
    };
    return colors[level as keyof typeof colors] || 'bg-gray-500';
  };

  const getRiskLevelLabel = (level: string) => {
    const labels = {
      low: '低风险',
      medium: '中风险',
      high: '高风险',
      critical: '极高风险',
    };
    return labels[level as keyof typeof labels] || level;
  };

  const getRiskLevelColor = (level: string) => {
    const colors = {
      low: 'bg-green-500',
      medium: 'bg-yellow-500',
      high: 'bg-orange-500',
      critical: 'bg-red-500',
    };
    return colors[level as keyof typeof colors] || 'bg-gray-500';
  };

  const getAutoTagLabel = (tag: string | null) => {
    const labels = {
      star: '★高价值',
      triangle: '△中等价值',
      circle: '○普通价值',
      cross: '×低价值',
    };
    return labels[tag as keyof typeof labels] || '-';
  };

  const getAutoTagColor = (tag: string | null) => {
    const colors = {
      star: 'text-yellow-500',
      triangle: 'text-blue-500',
      circle: 'text-gray-500',
      cross: 'text-red-500',
    };
    return colors[tag as keyof typeof colors] || 'text-gray-500';
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
      const existing = await ContactService.findContactByPhone(formData.primaryPhone.trim());
      if (existing) {
        toast('该手机号已被使用', 'warning');
        return;
      }

      const contactCount = await ContactService.countContacts();
      const newCode = `C${String(contactCount + 1).padStart(3, '0')}`;

      await ContactService.createContact({
        code: newCode,
        name: formData.name.trim(),
        primaryPhone: formData.primaryPhone.trim(),
        address: formData.address.trim() || undefined,
        remark: formData.remark.trim() || undefined,
        contactType: formData.contactType,
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
      const existing = await ContactService.checkPhoneExists(formData.primaryPhone.trim(), editContact.id);
      if (existing) {
        toast('该手机号已被其他联系人使用', 'warning');
        return;
      }

      await ContactService.updateContact(editContact.id, {
        name: formData.name.trim(),
        primaryPhone: formData.primaryPhone.trim(),
        address: formData.address.trim() || undefined,
        remark: formData.remark.trim() || undefined,
        contactType: formData.contactType,
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
        ContactService.getContactOrders(person.id),
        ContactService.getContactRebates(person.id),
        ContactService.getContactProjectRoles(person.id),
      ]);
      setDetailSales(sales.slice(0, 10));
      setDetailRebates(rebates.slice(0, 10));
      setDetailProjects(projects.slice(0, 10).map((r: any) => r.project).filter(Boolean));
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRecalculateAllScores}>
            🔄 重新计算所有评分
          </Button>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
            + 添加联系人
          </Button>
        </div>
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
                <TableHead>价值评分</TableHead>
                <TableHead>信用等级</TableHead>
                <TableHead>风险等级</TableHead>
                <TableHead>信用额度</TableHead>
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
                  <TableCell colSpan={14} className="text-center py-8 text-slate-500">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-mono text-slate-500">{person.code}</TableCell>
                    <TableCell className="font-medium">
                      {person.blacklist && (
                        <Badge variant="destructive" className="mr-2">黑名单</Badge>
                      )}
                      {person.name}
                    </TableCell>
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
                          {person.autoTag && (
                            <span className={`text-xs ${getAutoTagColor(person.autoTag)}`}>
                              {getAutoTagLabel(person.autoTag)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getCreditLevelColor(person.creditLevel)}>
                        {getCreditLevelLabel(person.creditLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskLevelColor(person.riskLevel)}>
                        {getRiskLevelLabel(person.riskLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(person.creditLimit)}
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
                      <div className="flex items-center gap-1">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecalculateScore(person)}
                          title="重新计算评分"
                        >
                          🔄
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleBlacklist(person)}
                        >
                          {person.blacklist ? '移出黑名单' : '加入黑名单'}
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
          <p>• 点击「详情」查看联系人的订单、佣金、项目等信息</p>
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
                联系人类型 (可随便选，不影响系统)
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
                placeholder="输入手机号"
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
                联系人类型 (可随便选，不影响系统)
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
                placeholder="输入手机号"
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
                  <div className="text-sm text-slate-500">累计佣金</div>
                  <div className="text-xl font-bold text-purple-600">
                    {formatCurrency(detailRebates.reduce((sum, r) => sum + (r.amount || 0), 0))}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">关联项目</div>
                  <div className="text-xl font-bold text-slate-600">{detailProjects.length} 个</div>
                </div>
              </div>

              {/* 信用评估卡片 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">信用评估</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">价值评分</p>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-orange-600">
                          {contactDetail.valueScore != null ? contactDetail.valueScore.toFixed(1) : '-'}
                        </span>
                        {contactDetail.valueScore != null && <span className="text-yellow-500 text-xl">★</span>}
                        {contactDetail.autoTag && (
                          <span className={`text-sm ${getAutoTagColor(contactDetail.autoTag)}`}>
                            {getAutoTagLabel(contactDetail.autoTag)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">信用等级</p>
                      <Badge className={getCreditLevelColor(contactDetail.creditLevel)}>
                        {getCreditLevelLabel(contactDetail.creditLevel)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">风险等级</p>
                      <Badge className={getRiskLevelColor(contactDetail.riskLevel)}>
                        {getRiskLevelLabel(contactDetail.riskLevel)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">信用额度</p>
                      <span className="text-xl font-bold text-orange-600">
                        {formatCurrency(contactDetail.creditLimit)}
                      </span>
                    </div>
                  </div>
                  {contactDetail.blacklist && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700">
                        <span className="text-sm">⚠️ 该联系人在黑名单中</span>
                        {contactDetail._contactData.blacklistReason && (
                          <span className="text-sm text-red-600">
                            - {contactDetail._contactData.blacklistReason}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

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
                      <span className="text-slate-500">佣金记录:</span>
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
                  <h4 className="font-medium mb-3">业务佣金记录 ({detailRebates.length})</h4>
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
                          <TableCell className={`font-mono ${rebate.type === 'OUTGOING' ? 'text-purple-600' : 'text-green-600'}`}>
                            {formatCurrency(rebate.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {rebate.category === 'INTRODUCER' ? '介绍人返点' : '供应商返点'}
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

      {/* 黑名单对话框 */}
      <Dialog open={showBlacklistDialog} onOpenChange={setShowBlacklistDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
            {selectedContactForBlacklist?.blacklist 
              ? '移出黑名单' 
              : '加入黑名单'} - {selectedContactForBlacklist?.name}
          </DialogTitle>
          <DialogDescription>
            {selectedContactForBlacklist?.blacklist
              ? '确认要将该联系人从黑名单中移除吗？'
              : '请提供加入黑名单的原因，点击确认将该联系人加入黑名单。'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!selectedContactForBlacklist?.blacklist && (
            <div>
              <label className="text-sm font-medium mb-1 block">
                原因
              </label>
              <Input
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="请输入原因"
              />
            </div>
          )}
          {selectedContactForBlacklist?.blacklist && selectedContactForBlacklist?.blacklistReason && (
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-500">当前原因: {selectedContactForBlacklist.blacklistReason}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBlacklistDialog(false)}>
            取消
          </Button>
          <Button onClick={handleConfirmBlacklist}>
            确认
          </Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}