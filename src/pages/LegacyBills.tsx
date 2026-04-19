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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LegacyBillService } from '@/services/LegacyBillService';
import { ContactService } from '@/services/ContactService';
import { ProjectService } from '@/services/ProjectService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { Contact, AccountReceivable, BizProject } from '@/lib/types';

export function LegacyBills() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<BizProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBill, setEditingBill] = useState<AccountReceivable | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    contactId: '',
    projectName: '',
    billDate: new Date().toISOString().split('T')[0],
    totalAmount: '',
    paidAmount: '0',
    remark: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsData, projectsData] = await Promise.all([
        ContactService.getContacts(),
        ProjectService.getProjects(),
      ]);
      setContacts(contactsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('[LegacyBills] 加载失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = searchTerm
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.primaryPhone?.includes(searchTerm)
      )
    : contacts;

  const getContactBills = async (contactId: string) => {
    const bills = await LegacyBillService.getAccountReceivablesByContact(contactId);
    return bills;
  };

  const handleAddBill = async () => {
    if (!formData.contactId) {
      toast('请选择客户', 'warning');
      return;
    }
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      toast('请输入正确的账单金额', 'warning');
      return;
    }

    try {
      const totalAmount = parseFloat(formData.totalAmount);
      const paidAmount = parseFloat(formData.paidAmount) || 0;
      const remainingAmount = totalAmount - paidAmount;

      await LegacyBillService.createAccountReceivable({
        contactId: formData.contactId,
        originalAmount: totalAmount,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount,
        status: remainingAmount > 0 ? 'pending' : 'settled',
        remark: formData.remark || `历史账单迁：${formData.projectName}`,
      });

      toast('历史账单添加成功', 'success');
      resetForm();
      loadData();
    } catch (error) {
      console.error('[LegacyBills] 添加失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleUpdateBill = async () => {
    if (!editingBill) return;

    try {
      const totalAmount = parseFloat(formData.totalAmount);
      const paidAmount = parseFloat(formData.paidAmount) || 0;
      const remainingAmount = totalAmount - paidAmount;

      await LegacyBillService.updateAccountReceivable(editingBill.id, {
        originalAmount: totalAmount,
        paidAmount: paidAmount,
        remainingAmount: remainingAmount,
        status: remainingAmount > 0 ? 'pending' : 'settled',
        remark: formData.remark || `历史账单：${formData.projectName}`,
      });

      toast('账单更新成功', 'success');
      resetForm();
      loadData();
    } catch (error) {
      console.error('[LegacyBills] 更新失败:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleDeleteBill = async (bill: AccountReceivable) => {
    try {
      await LegacyBillService.deleteAccountReceivable(bill.id);
      toast('账单删除成功', 'success');
      loadData();
    } catch (error) {
      console.error('[LegacyBills] 删除失败:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      contactId: '',
      projectName: '',
      billDate: new Date().toISOString().split('T')[0],
      totalAmount: '',
      paidAmount: '0',
      remark: '',
    });
    setEditingBill(null);
    setShowAddDialog(false);
  };

  const openEditDialog = (bill: AccountReceivable) => {
    setFormData({
      contactId: bill.contactId,
      projectName: bill.remark?.replace('历史账单迁：', '').replace('历史账单：', '') || '',
      billDate: bill.createdAt.toISOString().split('T')[0],
      totalAmount: bill.originalAmount.toString(),
      paidAmount: bill.paidAmount.toString(),
      remark: bill.remark || '',
    });
    setEditingBill(bill);
    setShowAddDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount);
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
          <h2 className="text-2xl font-bold text-slate-800">历史账单迁移</h2>
          <p className="text-slate-500 mt-1">录入老客户的历史欠款账单</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>刷新</Button>
          <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
            + 添加历史账单
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              placeholder="搜索客户姓名或手机号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-56"
            />
            <p className="text-sm text-slate-500 ml-auto">
              提示：历史账单不关联具体销售单，仅记录客户累计欠款
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              暂无客户数据
            </div>
          ) : (
            <div className="space-y-6">
              {filteredContacts.map((contact) => {
                return (
                  <div key={contact.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-lg">{contact.name}</div>
                        <Badge variant="secondary">{contact.primaryPhone || '无电话'}</Badge>
                        <Badge variant="outline">{contact.code}</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFormData({ ...formData, contactId: contact.id });
                          setShowAddDialog(true);
                        }}
                      >
                        + 添加账单
                      </Button>
                    </div>

                    <LegacyBillList
                      contactId={contact.id}
                      onEdit={openEditDialog}
                      onDelete={handleDeleteBill}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowAddDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBill ? '编辑历史账单' : '添加历史账单'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                客户 <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.contactId}
                onValueChange={(value) => setFormData({ ...formData, contactId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择客户" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} - {c.primaryPhone || '无电话'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                项目名称
              </label>
              <Input
                value={formData.projectName}
                onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                placeholder="如：某小区水管改造（可选）"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  账单日期
                </label>
                <Input
                  type="date"
                  value={formData.billDate}
                  onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  总金额 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                已付金额
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.paidAmount}
                onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-slate-500 mt-1">
                剩余未付：{formatCurrency(
                  (parseFloat(formData.totalAmount) || 0) - (parseFloat(formData.paidAmount) || 0)
                )}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">
                备注
              </label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="可选备注信息"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              取消
            </Button>
            <Button onClick={editingBill ? handleUpdateBill : handleAddBill}>
              {editingBill ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LegacyBillList({
  contactId,
  onEdit,
  onDelete,
  formatCurrency,
}: {
  contactId: string;
  onEdit: (bill: AccountReceivable) => void;
  onDelete: (bill: AccountReceivable) => void;
  formatCurrency: (amount: number) => string;
}) {
  const [bills, setBills] = useState<AccountReceivable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBills();
  }, [contactId]);

  const loadBills = async () => {
    try {
      setLoading(true);
      const data = await LegacyBillService.getAccountReceivablesByContact(contactId);
      setBills(data);
    } catch (error) {
      console.error('[LegacyBillList] 加载失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-slate-400">加载中...</div>;
  }

  if (bills.length === 0) {
    return <div className="text-sm text-slate-400">暂无历史账单</div>;
  }

  const totalRemaining = bills.reduce((sum, b) => sum + b.remainingAmount, 0);

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日期</TableHead>
            <TableHead>项目</TableHead>
            <TableHead className="text-right">总金额</TableHead>
            <TableHead className="text-right">已付</TableHead>
            <TableHead className="text-right">未付</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bills.map((bill) => (
            <TableRow key={bill.id}>
              <TableCell className="text-sm">
                {new Date(bill.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-sm text-slate-500">
                {bill.remark?.replace('历史账单迁：', '').replace('历史账单：', '') || '-'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(bill.originalAmount)}
              </TableCell>
              <TableCell className="text-right font-mono text-green-600">
                {formatCurrency(bill.paidAmount)}
              </TableCell>
              <TableCell className="text-right font-mono text-orange-600">
                {formatCurrency(bill.remainingAmount)}
              </TableCell>
              <TableCell>
                <Badge
                  variant={bill.status === 'settled' ? 'default' : 'destructive'}
                  className={bill.status === 'settled' ? 'bg-green-100 text-green-800' : ''}
                >
                  {bill.status === 'settled' ? '已结清' : '未结清'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(bill)}>
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDelete(bill)}
                  >
                    删除
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-2 text-right text-sm">
        <span className="text-slate-500">该客户历史账单累计未付：</span>
        <span className="font-bold text-orange-600 ml-2">{formatCurrency(totalRemaining)}</span>
      </div>
    </div>
  );
}