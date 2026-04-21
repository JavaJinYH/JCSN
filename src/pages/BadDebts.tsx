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
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BadDebtService } from '@/services/BadDebtService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/Toast';

export function BadDebts() {
  const [writeOffs, setWriteOffs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedWriteOff, setSelectedWriteOff] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadData();
  }, [filterType]);

  const loadData = async () => {
    try {
      setLoading(true);
      let data;
      
      if (filterType === 'all') {
        data = await BadDebtService.getAll();
      } else if (filterType === 'negotiated') {
        data = await BadDebtService.getByType('negotiated');
      } else if (filterType === 'bad_debt') {
        data = await BadDebtService.getByType('bad_debt');
      } else if (filterType === 'pending') {
        data = await BadDebtService.getPending();
      }
      
      setWriteOffs(data || []);
      
      const statsData = await BadDebtService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('[BadDebts] 加载数据失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedWriteOff) return;

    try {
      await BadDebtService.approveBadDebt(selectedWriteOff.id, '当前用户');
      setShowApproveDialog(false);
      loadData();
      toast('坏账审批通过', 'success');
    } catch (error) {
      console.error('[BadDebts] 审批失败:', error);
      toast('操作失败，请重试', 'error');
    }
  };

  const handleReject = async () => {
    if (!selectedWriteOff) return;

    if (!rejectReason.trim()) {
      toast('请填写拒绝原因', 'warning');
      return;
    }

    try {
      await BadDebtService.rejectBadDebt(selectedWriteOff.id, '当前用户', rejectReason);
      setShowRejectDialog(false);
      setRejectReason('');
      loadData();
      toast('坏账申请已拒绝', 'success');
    } catch (error) {
      console.error('[BadDebts] 拒绝失败:', error);
      toast('操作失败，请重试', 'error');
    }
  };

  const getWriteOffTypeBadge = (type: string) => {
    if (type === 'negotiated') {
      return <Badge className="bg-blue-500">协商减免</Badge>;
    } else if (type === 'bad_debt') {
      return <Badge className="bg-red-500">坏账核销</Badge>;
    }
    return <Badge variant="secondary">{type}</Badge>;
  };

  const getWriteOffStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500">待审批</Badge>;
      case 'approved':
        return <Badge className="bg-green-500">已通过</Badge>;
      case 'rejected':
        return <Badge variant="secondary">已拒绝</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDisplayName = (writeOff: any) => {
    if (writeOff.saleOrder?.buyer?.name) {
      return writeOff.saleOrder.buyer.name;
    }
    if (writeOff.entity?.name) {
      return writeOff.entity.name;
    }
    return '-';
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
          <h2 className="text-2xl font-bold text-slate-800">坏账管理</h2>
          <p className="text-slate-500 mt-1">管理协商减免和坏账核销记录</p>
        </div>
        <Button variant="outline" onClick={loadData}>
          🔄 刷新
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">协商减免总额</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalAmountNegotiated)}
              </div>
              <div className="text-sm text-slate-500 mt-2">
                {stats.totalNegotiated} 笔
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">坏账核销总额</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalAmountBadDebt)}
              </div>
              <div className="text-sm text-slate-500 mt-2">
                {stats.totalBadDebt} 笔
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">累计减免总额</div>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.totalAmount)}
              </div>
              <div className="text-sm text-slate-500 mt-2">
                {stats.totalNegotiated + stats.totalBadDebt} 笔
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-slate-500">待审批数量</div>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingCount}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <Tabs defaultValue="all" onValueChange={setFilterType}>
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="negotiated">协商减免</TabsTrigger>
                <TabsTrigger value="bad_debt">坏账核销</TabsTrigger>
                <TabsTrigger value="pending">待审批</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>客户/主体</TableHead>
                <TableHead>原始金额</TableHead>
                <TableHead>减免金额</TableHead>
                <TableHead>最终金额</TableHead>
                <TableHead>原因</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {writeOffs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    暂无记录
                  </TableCell>
                </TableRow>
              ) : (
                writeOffs.map((writeOff) => (
                  <TableRow key={writeOff.id}>
                    <TableCell>{getWriteOffTypeBadge(writeOff.writeOffType)}</TableCell>
                    <TableCell>{getWriteOffStatusBadge(writeOff.status)}</TableCell>
                    <TableCell>{getDisplayName(writeOff)}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(writeOff.originalAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-600">
                      {formatCurrency(writeOff.writtenOffAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-600">
                      {formatCurrency(writeOff.finalAmount)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {writeOff.reason || '-'}
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(writeOff.createdAt))}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedWriteOff(writeOff);
                            setShowDetailDialog(true);
                          }}
                        >
                          详情
                        </Button>
                        {writeOff.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              onClick={() => {
                                setSelectedWriteOff(writeOff);
                                setShowApproveDialog(true);
                              }}
                            >
                              通过
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => {
                                setSelectedWriteOff(writeOff);
                                setRejectReason('');
                                setShowRejectDialog(true);
                              }}
                            >
                              拒绝
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>详情</DialogTitle>
          </DialogHeader>
          {selectedWriteOff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500">类型</div>
                  <div className="font-medium">
                    {getWriteOffTypeBadge(selectedWriteOff.writeOffType)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">状态</div>
                  <div className="font-medium">
                    {getWriteOffStatusBadge(selectedWriteOff.status)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">客户/主体</div>
                  <div className="font-medium">{getDisplayName(selectedWriteOff)}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">创建时间</div>
                  <div className="font-medium">
                    {formatDate(new Date(selectedWriteOff.createdAt))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-slate-500">原始金额</div>
                  <div className="text-xl font-bold">
                    {formatCurrency(selectedWriteOff.originalAmount)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-500">减免金额</div>
                  <div className="text-xl font-bold text-red-600">
                    {formatCurrency(selectedWriteOff.writtenOffAmount)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-500">最终金额</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(selectedWriteOff.finalAmount)}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-slate-500 mb-1">原因</div>
                <div className="p-3 bg-slate-50 rounded-lg">{selectedWriteOff.reason || '-'}</div>
              </div>

              {selectedWriteOff.operatorNote && (
                <div>
                  <div className="text-sm text-slate-500 mb-1">备注</div>
                  <div className="p-3 bg-slate-50 rounded-lg">{selectedWriteOff.operatorNote}</div>
                </div>
              )}

              {selectedWriteOff.approvedAt && (
                <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
                  审批人：{selectedWriteOff.approvedBy || '-'}{' '}
                  审批时间：{formatDate(new Date(selectedWriteOff.approvedAt))}
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

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>审批坏账申请</DialogTitle>
          </DialogHeader>
          {selectedWriteOff && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-sm text-slate-500">坏账金额</div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(selectedWriteOff.writtenOffAmount)}
                </div>
                <div className="text-sm text-slate-500 mt-2">
                  原因：{selectedWriteOff.reason || '-'}
                </div>
              </div>
              <div className="text-sm text-slate-600">
                确认审批通过此坏账申请吗？
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
              确认通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>拒绝坏账申请</DialogTitle>
          </DialogHeader>
          {selectedWriteOff && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-sm text-slate-500">坏账金额</div>
                <div className="text-xl font-bold text-red-600">
                  {formatCurrency(selectedWriteOff.writtenOffAmount)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">拒绝原因 *</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请填写拒绝原因..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              取消
            </Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700">
              确认拒绝
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
