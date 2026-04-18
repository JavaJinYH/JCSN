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
import { db } from '@/lib/db';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getAgingLevel } from '@/lib/customerUtils';
import type { CollectionRecord, Customer, AccountReceivable } from '@/lib/types';

export function Collections() {
  const [records, setRecords] = useState<(CollectionRecord & { customer?: Customer })[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedReceivable, setSelectedReceivable] = useState<string>('');
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [formData, setFormData] = useState({
    collectionDate: '',
    collectionTime: '',
    collectionMethod: '电话',
    collectionResult: '已承诺付款',
    collectionAmount: '',
    followUpDate: '',
    followUpTime: '',
    communication: '',
    nextPlan: '',
    remark: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [recordsData, customersData, receivablesData] = await Promise.all([
        db.collectionRecord.findMany({
          include: { customer: true },
          orderBy: { collectionDate: 'desc' },
        }),
        db.customer.findMany({ orderBy: { name: 'asc' } }),
        db.accountReceivable.findMany({
          where: { remainingAmount: { gt: 0 } },
          include: { contact: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      setRecords(recordsData);
      setCustomers(customersData);
      setReceivables(receivablesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (!searchTerm) return true;
    return (
      r.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.remark?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleAddRecord = async () => {
    if (!selectedCustomer) {
      alert('请选择客户');
      return;
    }

    try {
      let collectionDate = new Date();
      if (formData.collectionDate) {
        collectionDate = new Date(formData.collectionDate);
        if (formData.collectionTime) {
          const [hours, minutes] = formData.collectionTime.split(':');
          collectionDate.setHours(parseInt(hours), parseInt(minutes));
        }
      }

      await db.collectionRecord.create({
        data: {
          customerId: selectedCustomer,
          receivableId: selectedReceivable || null,
          collectionDate,
          collectionTime: formData.collectionTime || null,
          collectionMethod: formData.collectionMethod,
          collectionResult: formData.collectionResult,
          collectionAmount: formData.collectionAmount ? parseFloat(formData.collectionAmount) : null,
          followUpDate: formData.followUpDate ? new Date(formData.followUpDate) : null,
          followUpTime: formData.followUpTime || null,
          communication: formData.communication || null,
          nextPlan: formData.nextPlan || null,
          remark: formData.remark || null,
        },
      });

      setShowAddDialog(false);
      setSelectedCustomer('');
      setSelectedReceivable('');
      setFormData({
        collectionDate: '',
        collectionTime: '',
        collectionMethod: '电话',
        collectionResult: '已承诺付款',
        collectionAmount: '',
        followUpDate: '',
        followUpTime: '',
        communication: '',
        nextPlan: '',
        remark: '',
      });
      loadData();
    } catch (error) {
      console.error('Failed to add record:', error);
      alert('添加失败，请重试');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm('确定要删除这条催账记录吗？')) return;

    try {
      await db.collectionRecord.delete({ where: { id } });
      loadData();
    } catch (error) {
      console.error('Failed to delete record:', error);
      alert('删除失败，请重试');
    }
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case '已承诺付款':
        return <Badge className="bg-green-100 text-green-700">已承诺付款</Badge>;
      case '部分付款':
        return <Badge className="bg-blue-100 text-blue-700">部分付款</Badge>;
      case '拒绝付款':
        return <Badge className="bg-red-100 text-red-700">拒绝付款</Badge>;
      case '无法联系':
        return <Badge className="bg-slate-100 text-slate-700">无法联系</Badge>;
      default:
        return <Badge variant="outline">{result}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">催账记录</h2>
          <p className="text-slate-500 mt-1">记录催账历史，便于追踪客户欠款情况</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
          + 添加记录
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <Input
              placeholder="搜索客户姓名、备注..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Button variant="outline" onClick={loadData}>
              🔄 刷新
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>客户名称</TableHead>
                <TableHead>催账时间</TableHead>
                <TableHead>催账方式</TableHead>
                <TableHead>催账结果</TableHead>
                <TableHead>沟通内容</TableHead>
                <TableHead>后续计划</TableHead>
                <TableHead>跟进日期</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    暂无催账记录
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.customer?.name || '未知客户'}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      <div>{new Date(record.collectionDate).toLocaleDateString('zh-CN')}</div>
                      {record.collectionTime && (
                        <div className="text-xs">{record.collectionTime}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.collectionMethod}</Badge>
                    </TableCell>
                    <TableCell>{getResultBadge(record.collectionResult)}</TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">
                      {record.communication || '-'}
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-xs truncate">
                      {record.nextPlan || '-'}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {record.followUpDate ? (
                        <div>
                          {new Date(record.followUpDate).toLocaleDateString('zh-CN')}
                          {record.followUpTime && <span className="text-xs ml-1">{record.followUpTime}</span>}
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {record.collectionAmount && (
                          <span className="text-orange-600 text-sm">{formatCurrency(record.collectionAmount)}</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteRecord(record.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-800">{records.length}</div>
            <div className="text-sm text-slate-500">催账记录总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {records.filter((r) => r.collectionResult === '已承诺付款').length}
            </div>
            <div className="text-sm text-slate-500">已承诺付款</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {records.filter((r) => r.collectionResult === '部分付款').length}
            </div>
            <div className="text-sm text-slate-500">部分付款</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {records.filter((r) => r.collectionResult === '无法联系').length}
            </div>
            <div className="text-sm text-slate-500">无法联系</div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={() => setShowAddDialog(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加催账记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">
                  客户 <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                >
                  <option value="">选择客户</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">关联应收账款</label>
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={selectedReceivable}
                  onChange={(e) => setSelectedReceivable(e.target.value)}
                >
                  <option value="">不关联</option>
                  {receivables.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.contact?.name} - {formatCurrency(r.remainingAmount)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">催账日期</label>
                <Input
                  type="date"
                  value={formData.collectionDate}
                  onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">催账时间</label>
                <Input
                  type="time"
                  value={formData.collectionTime}
                  onChange={(e) => setFormData({ ...formData, collectionTime: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">催账方式</label>
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={formData.collectionMethod}
                  onChange={(e) => setFormData({ ...formData, collectionMethod: e.target.value })}
                >
                  <option value="电话">电话</option>
                  <option value="微信">微信</option>
                  <option value="短信">短信</option>
                  <option value="上门">上门</option>
                  <option value="面谈">面谈</option>
                  <option value="其他">其他</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">催账结果</label>
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={formData.collectionResult}
                  onChange={(e) => setFormData({ ...formData, collectionResult: e.target.value })}
                >
                  <option value="已承诺付款">已承诺付款</option>
                  <option value="部分付款">部分付款</option>
                  <option value="拒绝付款">拒绝付款</option>
                  <option value="无法联系">无法联系</option>
                  <option value="协商中">协商中</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">沟通内容</label>
              <textarea
                className="w-full h-20 px-3 py-2 border rounded-md resize-none"
                placeholder="输入本次沟通的主要内容..."
                value={formData.communication}
                onChange={(e) => setFormData({ ...formData, communication: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">后续跟进计划</label>
              <textarea
                className="w-full h-20 px-3 py-2 border rounded-md resize-none"
                placeholder="输入后续跟进计划..."
                value={formData.nextPlan}
                onChange={(e) => setFormData({ ...formData, nextPlan: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">催账金额</label>
                <Input
                  type="number"
                  placeholder="输入金额"
                  value={formData.collectionAmount}
                  onChange={(e) => setFormData({ ...formData, collectionAmount: e.target.value })}
                />
              </div>
              <div></div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">下次跟进日期</label>
                <Input
                  type="date"
                  value={formData.followUpDate}
                  onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">下次跟进时间</label>
                <Input
                  type="time"
                  value={formData.followUpTime}
                  onChange={(e) => setFormData({ ...formData, followUpTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <Input
                placeholder="输入备注信息"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddRecord}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}