import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DataTableFilters, DataTablePagination, useDataTable } from '@/components/DataTable';
import { CollectionService } from '@/services/CollectionService';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { CollectionRecord, Entity, AccountReceivable } from '@/lib/types';

const filters = [
  { key: 'search', label: '关键词', type: 'text' as const, placeholder: '主体名称、备注、沟通内容...' },
  { key: 'collectionMethod', label: '催账方式', type: 'select' as const, options: [
    { value: 'all', label: '全部' },
    { value: '电话', label: '电话' },
    { value: '微信', label: '微信' },
    { value: '短信', label: '短信' },
    { value: '上门', label: '上门' },
    { value: '面谈', label: '面谈' },
    { value: '其他', label: '其他' },
  ]},
  { key: 'collectionResult', label: '催账结果', type: 'select' as const, options: [
    { value: 'all', label: '全部' },
    { value: '已承诺付款', label: '已承诺付款' },
    { value: '部分付款', label: '部分付款' },
    { value: '拒绝付款', label: '拒绝付款' },
    { value: '无法联系', label: '无法联系' },
    { value: '协商中', label: '协商中' },
  ]},
];

export function Collections() {
  const [records, setRecords] = useState<(CollectionRecord & { entity?: Entity })[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [selectedReceivable, setSelectedReceivable] = useState<string>('');
  const [receivables, setReceivables] = useState<AccountReceivable[]>([]);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [selectedRecord, setSelectedRecord] = useState<(CollectionRecord & { entity?: Entity }) | null>(null);
  
  const [formData, setFormData] = useState({
    collectionDate: '',
    collectionTime: '',
    collectionMethod: '电话',
    collectionResult: '已承诺付款',
    attitude: '',
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
      const [recordsData, entitiesData, receivablesData] = await Promise.all([
        CollectionService.getCollectionRecords(),
        CollectionService.getEntities(),
        CollectionService.getReceivables(),
      ]);
      setRecords(recordsData);
      setEntities(entitiesData);
      setReceivables(receivablesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilterValues({});
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterValues.search) {
        const search = filterValues.search.toLowerCase();
        const matchEntity = r.entity?.name.toLowerCase().includes(search);
        const matchRemark = r.remark?.toLowerCase().includes(search);
        const matchCommunication = r.communication?.toLowerCase().includes(search);
        const matchNextPlan = r.nextPlan?.toLowerCase().includes(search);
        if (!matchEntity && !matchRemark && !matchCommunication && !matchNextPlan) {
          return false;
        }
      }
      if (filterValues.collectionMethod && filterValues.collectionMethod !== 'all') {
        if (r.collectionMethod !== filterValues.collectionMethod) {
          return false;
        }
      }
      if (filterValues.collectionResult && filterValues.collectionResult !== 'all') {
        if (r.collectionResult !== filterValues.collectionResult) {
          return false;
        }
      }
      return true;
    });
  }, [records, filterValues]);

  const tableProps = useDataTable({
    data: filteredRecords,
    defaultPageSize: 20,
  });

  const handleAddRecord = async () => {
    if (!selectedEntity) {
      toast('请选择主体', 'warning');
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

      await CollectionService.createCollectionRecord({
        entityId: selectedEntity,
        receivableId: selectedReceivable || undefined,
        collectionDate,
        collectionTime: formData.collectionTime || undefined,
        collectionMethod: formData.collectionMethod,
        collectionResult: formData.collectionResult,
        attitude: formData.attitude || undefined,
        collectionAmount: formData.collectionAmount ? parseFloat(formData.collectionAmount) : undefined,
        followUpDate: formData.followUpDate ? new Date(formData.followUpDate) : undefined,
        followUpTime: formData.followUpTime || undefined,
        communication: formData.communication || undefined,
        nextPlan: formData.nextPlan || undefined,
        remark: formData.remark || undefined,
      });

      setShowAddDialog(false);
      setSelectedEntity('');
      setSelectedReceivable('');
      setFormData({
        collectionDate: '',
        collectionTime: '',
        collectionMethod: '电话',
        collectionResult: '已承诺付款',
        attitude: '',
        collectionAmount: '',
        followUpDate: '',
        followUpTime: '',
        communication: '',
        nextPlan: '',
        remark: '',
      });
      loadData();
      toast('添加成功', 'success');
    } catch (error) {
      console.error('Failed to add record:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleViewDetail = (record: any) => {
    setSelectedRecord(record);
    setShowDetailDialog(true);
  };

  const handleEditRecord = (record: any) => {
    setSelectedRecord(record);
    setSelectedEntity(record.entityId);
    setSelectedReceivable(record.receivableId || '');
    setFormData({
      collectionDate: record.collectionDate ? new Date(record.collectionDate).toISOString().split('T')[0] : '',
      collectionTime: record.collectionTime || '',
      collectionMethod: record.collectionMethod || '电话',
      collectionResult: record.collectionResult || '已承诺付款',
      attitude: record.attitude || '',
      collectionAmount: record.collectionAmount?.toString() || '',
      followUpDate: record.followUpDate ? new Date(record.followUpDate).toISOString().split('T')[0] : '',
      followUpTime: record.followUpTime || '',
      communication: record.communication || '',
      nextPlan: record.nextPlan || '',
      remark: record.remark || '',
    });
    setShowEditDialog(true);
  };

  const handleUpdateRecord = async () => {
    if (!selectedRecord || !selectedEntity) {
      toast('请选择主体', 'warning');
      return;
    }

    try {
      let collectionDate = new Date(selectedRecord.collectionDate);
      if (formData.collectionDate) {
        collectionDate = new Date(formData.collectionDate);
        if (formData.collectionTime) {
          const [hours, minutes] = formData.collectionTime.split(':');
          collectionDate.setHours(parseInt(hours), parseInt(minutes));
        }
      }

      await CollectionService.updateCollectionRecord(selectedRecord.id, {
        entityId: selectedEntity,
        receivableId: selectedReceivable || null,
        collectionDate,
        collectionTime: formData.collectionTime || null,
        collectionMethod: formData.collectionMethod,
        collectionResult: formData.collectionResult,
        attitude: formData.attitude || null,
        collectionAmount: formData.collectionAmount ? parseFloat(formData.collectionAmount) : null,
        followUpDate: formData.followUpDate ? new Date(formData.followUpDate) : null,
        followUpTime: formData.followUpTime || null,
        communication: formData.communication || null,
        nextPlan: formData.nextPlan || null,
        remark: formData.remark || null,
      });

      setShowEditDialog(false);
      setSelectedRecord(null);
      setSelectedEntity('');
      setSelectedReceivable('');
      loadData();
      toast('更新成功', 'success');
    } catch (error) {
      console.error('Failed to update record:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedRecord) return;
    
    try {
      await CollectionService.deleteCollectionRecord(selectedRecord.id);
      setShowDeleteDialog(false);
      setSelectedRecord(null);
      loadData();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete record:', error);
      toast('删除失败，请重试', 'error');
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
          <p className="text-slate-500 mt-1">记录催账历史，便于追踪主体欠款情况</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
          + 添加记录
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4 flex-wrap">
            <DataTableFilters
              filters={filters}
              values={filterValues}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
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
                <TableHead>主体名称</TableHead>
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
              {tableProps.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                    暂无催账记录
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      {record.entity?.name || '未知主体'}
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
                          onClick={() => handleViewDetail(record)}
                        >
                          详情
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRecord(record)}
                        >
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setSelectedRecord(record);
                            setShowDeleteDialog(true);
                          }}
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

      {/* 添加记录对话框 */}
      <Dialog 
        open={showAddDialog} 
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) {
            setSelectedEntity('');
            setSelectedReceivable('');
            setFormData({
              collectionDate: '',
              collectionTime: '',
              collectionMethod: '电话',
              collectionResult: '已承诺付款',
              attitude: '',
              collectionAmount: '',
              followUpDate: '',
              followUpTime: '',
              communication: '',
              nextPlan: '',
              remark: '',
            });
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加催账记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                主体 <span className="text-red-500">*</span>
              </label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="选择主体" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">关联应收账款</label>
              <Select value={selectedReceivable || '__none__'} onValueChange={(v) => setSelectedReceivable(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="不关联" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不关联</SelectItem>
                  {receivables.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.contact?.name || (r as any).order?.paymentEntity?.name} - {formatCurrency(r.remainingAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Select 
                  value={formData.collectionMethod} 
                  onValueChange={(v) => setFormData({ ...formData, collectionMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="电话">电话</SelectItem>
                    <SelectItem value="微信">微信</SelectItem>
                    <SelectItem value="短信">短信</SelectItem>
                    <SelectItem value="上门">上门</SelectItem>
                    <SelectItem value="面谈">面谈</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">催账结果</label>
                <Select 
                  value={formData.collectionResult} 
                  onValueChange={(v) => setFormData({ ...formData, collectionResult: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="已承诺付款">已承诺付款</SelectItem>
                    <SelectItem value="部分付款">部分付款</SelectItem>
                    <SelectItem value="拒绝付款">拒绝付款</SelectItem>
                    <SelectItem value="无法联系">无法联系</SelectItem>
                    <SelectItem value="协商中">协商中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">对方态度</label>
              <Select
                value={formData.attitude || '__none__'}
                onValueChange={(v) => setFormData({ ...formData, attitude: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择态度（影响信用评分）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不记录</SelectItem>
                  <SelectItem value="积极友好">积极友好 😊</SelectItem>
                  <SelectItem value="正常配合">正常配合</SelectItem>
                  <SelectItem value="敷衍">敷衍 😑</SelectItem>
                  <SelectItem value="态度恶劣">态度恶劣 😠</SelectItem>
                  <SelectItem value="回避">回避 🙈</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">沟通内容</label>
              <Textarea
                placeholder="输入本次沟通的主要内容..."
                value={formData.communication}
                onChange={(e) => setFormData({ ...formData, communication: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">后续跟进计划</label>
              <Textarea
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

      {/* 编辑记录对话框 */}
      <Dialog 
        open={showEditDialog} 
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            setSelectedRecord(null);
            setSelectedEntity('');
            setSelectedReceivable('');
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑催账记录</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                主体 <span className="text-red-500">*</span>
              </label>
              <Select value={selectedEntity} onValueChange={setSelectedEntity}>
                <SelectTrigger>
                  <SelectValue placeholder="选择主体" />
                </SelectTrigger>
                <SelectContent>
                  {entities.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">关联应收账款</label>
              <Select value={selectedReceivable || '__none__'} onValueChange={(v) => setSelectedReceivable(v === '__none__' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="不关联" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不关联</SelectItem>
                  {receivables.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.contact?.name || (r as any).order?.paymentEntity?.name} - {formatCurrency(r.remainingAmount)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                <Select 
                  value={formData.collectionMethod} 
                  onValueChange={(v) => setFormData({ ...formData, collectionMethod: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="电话">电话</SelectItem>
                    <SelectItem value="微信">微信</SelectItem>
                    <SelectItem value="短信">短信</SelectItem>
                    <SelectItem value="上门">上门</SelectItem>
                    <SelectItem value="面谈">面谈</SelectItem>
                    <SelectItem value="其他">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">催账结果</label>
                <Select 
                  value={formData.collectionResult} 
                  onValueChange={(v) => setFormData({ ...formData, collectionResult: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="已承诺付款">已承诺付款</SelectItem>
                    <SelectItem value="部分付款">部分付款</SelectItem>
                    <SelectItem value="拒绝付款">拒绝付款</SelectItem>
                    <SelectItem value="无法联系">无法联系</SelectItem>
                    <SelectItem value="协商中">协商中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">对方态度</label>
              <Select
                value={formData.attitude || '__none__'}
                onValueChange={(v) => setFormData({ ...formData, attitude: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择态度（影响信用评分）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不记录</SelectItem>
                  <SelectItem value="积极友好">积极友好</SelectItem>
                  <SelectItem value="正常配合">正常配合</SelectItem>
                  <SelectItem value="敷衍">敷衍</SelectItem>
                  <SelectItem value="态度恶劣">态度恶劣</SelectItem>
                  <SelectItem value="回避">回避</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">沟通内容</label>
              <Textarea
                placeholder="输入本次沟通的主要内容..."
                value={formData.communication}
                onChange={(e) => setFormData({ ...formData, communication: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">后续跟进计划</label>
              <Textarea
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
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateRecord}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>催账记录详情</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500">主体</div>
                  <div className="font-medium">{selectedRecord.entity?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">催账时间</div>
                  <div>
                    {new Date(selectedRecord.collectionDate).toLocaleDateString('zh-CN')}
                    {selectedRecord.collectionTime && (
                      <span className="ml-2">{selectedRecord.collectionTime}</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">催账方式</div>
                  <div><Badge variant="outline">{selectedRecord.collectionMethod}</Badge></div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">催账结果</div>
                  <div>{getResultBadge(selectedRecord.collectionResult)}</div>
                </div>
              </div>

              {selectedRecord.collectionAmount && (
                <div>
                  <div className="text-sm text-slate-500">催账金额</div>
                  <div className="text-lg font-bold text-orange-600">{formatCurrency(selectedRecord.collectionAmount)}</div>
                </div>
              )}

              {selectedRecord.communication && (
                <div>
                  <div className="text-sm text-slate-500">沟通内容</div>
                  <div className="p-3 bg-slate-50 rounded-lg">{selectedRecord.communication}</div>
                </div>
              )}

              {selectedRecord.nextPlan && (
                <div>
                  <div className="text-sm text-slate-500">后续跟进计划</div>
                  <div className="p-3 bg-slate-50 rounded-lg">{selectedRecord.nextPlan}</div>
                </div>
              )}

              {selectedRecord.followUpDate && (
                <div>
                  <div className="text-sm text-slate-500">下次跟进</div>
                  <div>
                    {new Date(selectedRecord.followUpDate).toLocaleDateString('zh-CN')}
                    {selectedRecord.followUpTime && (
                      <span className="ml-2">{selectedRecord.followUpTime}</span>
                    )}
                  </div>
                </div>
              )}

              {selectedRecord.remark && (
                <div>
                  <div className="text-sm text-slate-500">备注</div>
                  <div className="p-3 bg-slate-50 rounded-lg">{selectedRecord.remark}</div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除这条催账记录吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="py-4">
              <p>
                主体：<strong>{selectedRecord.entity?.name}</strong>
              </p>
              <p className="text-sm text-slate-500 mt-2">
                时间：{new Date(selectedRecord.collectionDate).toLocaleDateString('zh-CN')}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
