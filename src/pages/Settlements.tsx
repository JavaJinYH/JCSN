import { useEffect, useState, useMemo } from 'react';
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
import { PhotoViewer } from '@/components/PhotoViewer';
import { DataTableFilters, DataTablePagination, useDataTable } from '@/components/DataTable';
import { SettlementService } from '@/services/SettlementService';
import { BadDebtService } from '@/services/BadDebtService';
import { EntityService } from '@/services/EntityService';
import { EntityCreditService } from '@/services/EntityCreditService';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { Entity, SaleOrder, Contact, BizProject } from '@/lib/types';

type EntityWithStats = Entity & {
  contact?: Contact | null;
  orders?: SaleOrder[];
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
  creditScore?: number | null;
  creditLevel?: string | null;
  riskLevel?: string | null;
  lastCreditEvalDate?: Date | null;
};

const filters = [
  { key: 'status', label: '状态', type: 'select' as const, options: [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待收款' },
    { value: 'partial', label: '部分还款' },
    { value: 'overdue', label: '已逾期' },
    { value: 'settled', label: '已结清' },
  ]},
  { key: 'entityType', label: '主体类型', type: 'select' as const, options: [
    { value: 'all', label: '全部' },
    { value: 'company', label: '装修/建材公司' },
    { value: 'contractor', label: '包工头/水电工' },
    { value: 'personal', label: '个人/业主' },
  ]},
  { key: 'search', label: '关键词', type: 'text' as const, placeholder: '主体名称/联系人电话...' },
];

export function Settlements() {
  const [entities, setEntities] = useState<EntityWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'receivables' | 'credits'>('receivables');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showNegotiatedDialog, setShowNegotiatedDialog] = useState(false);
  const [showBadDebtDialog, setShowBadDebtDialog] = useState(false);
  const [showEntityDetailDialog, setShowEntityDetailDialog] = useState(false);
  const [showOrderDetailDialog, setShowOrderDetailDialog] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityWithStats | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [photoViewerIndex, setPhotoViewerIndex] = useState(0);
  const [entityProjects, setEntityProjects] = useState<BizProject[]>([]);
  const [entityOrders, setEntityOrders] = useState<SaleOrder[]>([]);

  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    method: '现金',
    remark: '',
  });

  const [writeOffFormData, setWriteOffFormData] = useState({
    amount: '',
    reason: '',
    operatorNote: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const entitiesData = await SettlementService.getEntitiesWithContact();

      const entitiesWithStats: EntityWithStats[] = await Promise.all(
        entitiesData.map(async (entity) => {
          const orders = await SettlementService.getOrdersByEntity(entity.id);
          
          let totalReceivable = 0;
          let totalPaid = 0;

          for (const order of orders) {
            let orderTotal = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);
            
            for (const ret of order.returns || []) {
              orderTotal -= ret.totalAmount;
            }

            for (const writeOff of order.badDebtWriteOffs || []) {
              orderTotal -= writeOff.writtenOffAmount;
            }

            totalReceivable += orderTotal;
            totalPaid += order.paidAmount;
          }

          const totalRemaining = Math.max(0, totalReceivable - totalPaid);

          return {
            ...entity,
            orders,
            totalReceivable,
            totalPaid,
            totalRemaining,
          };
        })
      );

      setEntities(entitiesWithStats);
    } catch (error) {
      console.error('[Settlements] 加载数据失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateOrderBalance = (order: any) => {
    let total = order.totalAmount + (order.deliveryFee || 0) - (order.discount || 0);
    let paid = order.paidAmount;

    for (const ret of order.returns || []) {
      total -= ret.totalAmount;
    }

    for (const writeOff of order.badDebtWriteOffs || []) {
      total -= writeOff.writtenOffAmount;
    }

    return Math.max(0, total - paid);
  };

  const isOrderOverdue = (order: any) => {
    const remaining = calculateOrderBalance(order);
    const saleDate = new Date(order.saleDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return remaining > 0 && saleDate < thirtyDaysAgo;
  };

  const getOrderStatus = (order: any) => {
    const remaining = calculateOrderBalance(order);
    if (remaining <= 0) return 'settled';
    if (isOrderOverdue(order)) return 'overdue';
    if (order.paidAmount > 0) return 'partial';
    return 'pending';
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilterValues({});
  };

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (filterValues.status && filterValues.status !== 'all') {
        if (filterValues.status === 'overdue') {          if (!entity.orders?.some(o => isOrderOverdue(o) && calculateOrderBalance(o) > 0)) return false;
        } else if (filterValues.status === 'settled') {
          if (entity.totalRemaining > 0) return false;
        } else {
          if (entity.totalRemaining <= 0) return false;
        }
      }

      if (filterValues.entityType && filterValues.entityType !== 'all' && entity.entityType !== filterValues.entityType) {
        return false;
      }

      if (filterValues.search) {
        const search = filterValues.search.toLowerCase();
        const matchName = entity.name.toLowerCase().includes(search);
        const matchPhone = entity.contact?.primaryPhone?.includes(search);
        if (!matchName && !matchPhone) return false;
      }
      return true;
    });
  }, [entities, filterValues]);

  const tableProps = useDataTable({
    data: filteredEntities,
    defaultPageSize: 20,
  });

  const totalReceivable = useMemo(() => {
    return entities.reduce((sum, e) => sum + e.totalReceivable, 0);
  }, [entities]);

  const totalRemaining = useMemo(() => {
    return entities.reduce((sum, e) => sum + e.totalRemaining, 0);
  }, [entities]);

  const overdueCount = useMemo(() => {
    return entities.filter(e => 
      e.orders?.some(o => isOrderOverdue(o) && calculateOrderBalance(o) > 0)
    ).length;
  }, [entities]);

  const highCreditUsedCount = useMemo(() => {
    return entities.filter(e => e.creditLimit > 0 && (e.creditUsed / e.creditLimit) > 0.8).length;
  }, [entities]);

  const handleOpenPaymentDialog = (order: SaleOrder) => {
    setSelectedOrder(order);
    const remaining = calculateOrderBalance(order);
    setPaymentFormData({
      amount: remaining.toFixed(2),
      method: '现金',
      remark: '',
    });
    setShowPaymentDialog(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedOrder) return;

    const amount = parseFloat(paymentFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast('请输入有效的还款金额', 'warning');
      return;
    }

    try {
      const newPaidAmount = selectedOrder.paidAmount + amount;
      const newRemaining = calculateOrderBalance(selectedOrder) - amount;
      const newStatus = newRemaining <= 0 ? 'completed' : 'partial';

      await SettlementService.updateOrderPayment(selectedOrder.id, {
        paidAmount: newPaidAmount,
        status: newStatus,
      });

      await SettlementService.createPayment({
        orderId: selectedOrder.id,
        amount,
        method: paymentFormData.method,
        payerName: selectedOrder.buyer?.name,
        remark: paymentFormData.remark || '客户还款',
      });

      if (selectedOrder.paymentEntityId) {
        const entity = entities.find(e => e.id === selectedOrder.paymentEntityId);
        if (entity) {
          const newCreditUsed = Math.max(0, (entity.creditUsed || 0) - amount);
          await SettlementService.updateEntityCredit(entity.id, newCreditUsed);
        }
      }

      setShowPaymentDialog(false);
      loadData();
      toast('还款记录成功', 'success');
    } catch (error) {
      console.error('[Settlements] 记录还款失败:', error);
      toast('操作失败，请重试', 'error');
    }
  };

  const handleOpenEntityDetail = async (entity: EntityWithStats) => {
    setSelectedEntity(entity);
    try {
      const [projectsData, ordersData] = await Promise.all([
        EntityService.getProjectsByEntity(entity.id),
        EntityService.getEntityOrders(entity.id),
      ]);
      setEntityProjects(projectsData);
      setEntityOrders(ordersData);
    } catch (error) {
      console.error('[Settlements] 加载主体详情失败:', error);
      toast('加载主体详情失败，请重试', 'error');
    }
    setShowEntityDetailDialog(true);
  };

  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case 'company':
        return <Badge className="bg-purple-500">装修/建材公司</Badge>;
      case 'contractor':
        return <Badge className="bg-orange-500">包工头/水电工</Badge>;
      case 'personal':
        return <Badge className="bg-blue-500">个人/业主</Badge>;
      case 'government':
        return <Badge className="bg-green-500">政府/单位</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getCreditLevelLabel = (level: string | null | undefined) => {
    if (!level) return null;
    switch (level) {
      case 'AAA': return 'AAA-优质';
      case 'AA': return 'AA-良好';
      case 'A': return 'A-一般';
      case 'BBB': return 'BBB-尚可';
      case 'BB': return 'BB-欠佳';
      case 'B': return 'B-较差';
      case 'excellent': return '优秀';
      case 'good': return '良好';
      case 'average': return '一般';
      case 'poor': return '较差';
      default: return level;
    }
  };

  const getRiskLevelLabel = (level: string | null | undefined) => {
    if (!level) return null;
    switch (level) {
      case 'low': return '低风险';
      case 'medium': return '中风险';
      case 'high': return '高风险';
      default: return level;
    }
  };

  const getOrderStatusBadge = (order: SaleOrder) => {
    const status = getOrderStatus(order);

    switch (status) {
      case 'settled':
        return <Badge className="bg-green-500">已结清</Badge>;
      case 'overdue':
        return <Badge variant="destructive">已逾期</Badge>;
      case 'partial':
        return <Badge variant="warning">部分还款</Badge>;
      default:
        return <Badge variant="secondary">待收款</Badge>;
    }
  };

  const getWriteOffStatusBadge = (type: string, status: string) => {
    if (type === 'negotiated') {
      return <Badge className="bg-blue-500">协商减免</Badge>;
    } else if (type === 'bad_debt') {
      if (status === 'pending') {
        return <Badge className="bg-yellow-500">待审批坏账</Badge>;
      } else if (status === 'approved') {
        return <Badge className="bg-red-500">坏账核销</Badge>;
      } else if (status === 'rejected') {
        return <Badge variant="secondary">已拒绝</Badge>;
      }
    }
    return <Badge variant="secondary">{type}</Badge>;
  };

  const getOrdersByProject = (projectId: string | null) => {
    if (projectId === null) {
      return entityOrders.filter(order => !order.projectId);
    }
    return entityOrders.filter(order => order.projectId === projectId);
  };

  const getProjectTotal = (projectId: string | null) => {
    const orders = getOrdersByProject(projectId);
    return orders.reduce((sum, o) => sum + o.totalAmount, 0);
  };

  const getProjectPaid = (projectId: string | null) => {
    const orders = getOrdersByProject(projectId);
    return orders.reduce((sum, o) => sum + o.paidAmount, 0);
  };

  const handleOpenNegotiatedDialog = (order: SaleOrder) => {
    setSelectedOrder(order);
    const remaining = calculateOrderBalance(order);
    setWriteOffFormData({
      amount: remaining.toFixed(2),
      reason: '',
      operatorNote: '',
    });
    setShowNegotiatedDialog(true);
  };

  const handleOpenBadDebtDialog = (order: SaleOrder) => {
    setSelectedOrder(order);
    const remaining = calculateOrderBalance(order);
    setWriteOffFormData({
      amount: remaining.toFixed(2),
      reason: '',
      operatorNote: '',
    });
    setShowBadDebtDialog(true);
  };

  const handleNegotiatedSettlement = async () => {
    if (!selectedOrder) return;

    const amount = parseFloat(writeOffFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast('请输入有效的减免金额', 'warning');
      return;
    }
    if (!writeOffFormData.reason.trim()) {
      toast('请填写协商减免原因', 'warning');
      return;
    }

    try {
      const entityId = selectedOrder.paymentEntityId || '';
      if (!entityId) {
        toast('无法确定付款主体', 'error');
        return;
      }

      await BadDebtService.createNegotiatedSettlement({
        saleOrderId: selectedOrder.id,
        entityId,
        writtenOffAmount: amount,
        reason: writeOffFormData.reason,
        operatorNote: writeOffFormData.operatorNote,
        createdBy: '当前用户',
      });

      setShowNegotiatedDialog(false);
      loadData();
      toast('协商减免记录成功', 'success');
    } catch (error) {
      console.error('[Settlements] 协商减免失败:', error);
      toast('操作失败，请重试', 'error');
    }
  };

  const handleBadDebtWriteOff = async () => {
    if (!selectedOrder) return;

    const amount = parseFloat(writeOffFormData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast('请输入有效的坏账金额', 'warning');
      return;
    }
    if (!writeOffFormData.reason.trim()) {
      toast('请填写坏账原因', 'warning');
      return;
    }

    try {
      const entityId = selectedOrder.paymentEntityId || '';
      if (!entityId) {
        toast('无法确定付款主体', 'error');
        return;
      }

      await BadDebtService.createBadDebtWriteOff({
        saleOrderId: selectedOrder.id,
        entityId,
        writtenOffAmount: amount,
        reason: writeOffFormData.reason,
        operatorNote: writeOffFormData.operatorNote,
        createdBy: '当前用户',
      });

      setShowBadDebtDialog(false);
      loadData();
      toast('坏账申请已提交，请等待审批', 'success');
    } catch (error) {
      console.error('[Settlements] 坏账申请失败:', error);
      toast('操作失败，请重试', 'error');
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
          <h2 className="text-2xl font-bold text-slate-800">挂账结算</h2>
          <p className="text-slate-500 mt-1">按付款主体查询欠款 - 账目挂在主体下</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">应收账款总额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalReceivable)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">待回收金额</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalRemaining)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">逾期主体数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">主体总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{entities.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === 'receivables' ? 'default' : 'outline'}
          onClick={() => setActiveTab('receivables')}
          className={activeTab === 'receivables' ? 'bg-orange-500' : ''}
        >
          应收账款
        </Button>
        <Button
          variant={activeTab === 'credits' ? 'default' : 'outline'}
          onClick={() => setActiveTab('credits')}
          className={activeTab === 'credits' ? 'bg-orange-500' : ''}
        >
          信用额度
        </Button>
      </div>

      {activeTab === 'receivables' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              {filters.map((filter) => (
                <div key={filter.key} className="flex items-center gap-2">
                  <span className="text-sm text-slate-600">{filter.label}:</span>
                  {filter.type === 'select' ? (
                    <Select value={filterValues[filter.key] || 'all'} onValueChange={(v) => handleFilterChange(filter.key, v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="text"
                      placeholder={filter.placeholder}
                      value={filterValues[filter.key] || ''}
                      onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                      className="w-48"
                    />
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={handleResetFilters}>重置筛选</Button>
              <Button variant="outline" onClick={loadData}>刷新数据</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>主体名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead className="text-right">应付总额</TableHead>
                  <TableHead className="text-right">已付金额</TableHead>
                  <TableHead className="text-right">待收金额</TableHead>
                  <TableHead>欠款笔数</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableProps.total === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      暂无应收账款数据
                    </TableCell>
                  </TableRow>
                ) : (
                  tableProps.data.map((entity) => {
                    const outstandingOrders = entity.orders?.filter(o => calculateOrderBalance(o) > 0) || [];
                    return (
                      <TableRow key={entity.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{entity.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{getEntityTypeBadge(entity.entityType)}</TableCell>
                        <TableCell>
                          <div className="text-slate-600">
                            {entity.contact?.name || '-'}
                          </div>
                          <div className="text-sm text-slate-500">
                            {entity.contact?.primaryPhone || ''}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(entity.totalReceivable)}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(entity.totalPaid)}</TableCell>
                        <TableCell className="text-right font-mono text-orange-600 font-bold">
                          {formatCurrency(entity.totalRemaining)}
                        </TableCell>
                        <TableCell className="font-mono">{outstandingOrders.length}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEntityDetail(entity)}>
                              详情
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
      )}

      {activeTab === 'credits' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>主体信用额度</CardTitle>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await EntityCreditService.batchUpdateAllEntities();
                    toast('信用评分已更新', 'success');
                    loadData();
                  } catch (error) {
                    console.error('[Settlements] 批量更新信用评分失败:', error);
                    toast('更新失败，请重试', 'error');
                  }
                }}
              >
                重新计算信用评分
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>主体名称</TableHead>
                  <TableHead>信用评分</TableHead>
                  <TableHead>信用等级</TableHead>
                  <TableHead>风险等级</TableHead>
                  <TableHead>信用额度</TableHead>
                  <TableHead>已用额度</TableHead>
                  <TableHead>可用额度</TableHead>
                  <TableHead>使用比例</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  entities.map((entity) => {
                    const availableCredit = entity.creditLimit - entity.creditUsed;
                    const usageRatio = entity.creditLimit > 0 ? (entity.creditUsed / entity.creditLimit * 100) : 0;
                    return (
                      <TableRow key={entity.id}>
                        <TableCell className="font-medium">{entity.name}</TableCell>
                        <TableCell>
                          {entity.creditScore !== null && entity.creditScore !== undefined ? (
                            <span className={`font-mono font-bold ${
                              entity.creditScore >= 80 ? 'text-green-600' :
                              entity.creditScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {entity.creditScore.toFixed(0)}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entity.creditLevel ? (
                            <Badge variant={
                              entity.creditLevel === 'excellent' || entity.creditLevel === 'AAA' || entity.creditLevel === 'AA' ? 'default' :
                              entity.creditLevel === 'good' || entity.creditLevel === 'A' || entity.creditLevel === 'BBB' ? 'secondary' : 'destructive'
                            }>
                              {getCreditLevelLabel(entity.creditLevel)}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entity.riskLevel ? (
                            <Badge variant={
                              entity.riskLevel === 'low' ? 'default' :
                              entity.riskLevel === 'medium' ? 'secondary' : 'destructive'
                            }>
                              {getRiskLevelLabel(entity.riskLevel)}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono">{formatCurrency(entity.creditLimit)}</TableCell>
                        <TableCell className="font-mono text-orange-600">{formatCurrency(entity.creditUsed)}</TableCell>
                        <TableCell className={`font-mono font-bold ${availableCredit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(Math.max(0, availableCredit))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${usageRatio > 80 ? 'bg-red-500' : usageRatio > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(100, usageRatio)}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-500">{usageRatio.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await EntityCreditService.updateEntityCredit(entity.id);
                                toast('信用评分已更新', 'success');
                                loadData();
                              } catch (error) {
                                console.error('[Settlements] 更新信用评分失败:', error);
                                toast('更新失败，请重试', 'error');
                              }
                            }}
                          >
                            重新计算
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>记录还款</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-sm text-slate-500">销售单号</div>
                <div className="font-mono">{selectedOrder.invoiceNo || selectedOrder.id.substring(0, 8)}</div>
                <div className="text-sm text-slate-500 mt-2">订单金额: <span className="text-orange-600">{formatCurrency(selectedOrder.totalAmount)}</span></div>
                <div className="text-sm text-slate-500">已付金额: <span className="text-green-600">{formatCurrency(selectedOrder.paidAmount)}</span></div>
                <div className="text-sm text-slate-500">待收金额: <span className="text-red-600 font-bold">{formatCurrency(calculateOrderBalance(selectedOrder))}</span></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">还款金额</label>
                <Input
                  type="number"
                  step="0.01"
                  value={paymentFormData.amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">支付方式</label>
                <Select
                  value={paymentFormData.method}
                  onValueChange={(v) => setPaymentFormData({ ...paymentFormData, method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="现金">现金</SelectItem>
                    <SelectItem value="转账">转账</SelectItem>
                    <SelectItem value="微信">微信</SelectItem>
                    <SelectItem value="支付宝">支付宝</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">备注</label>
                <Input
                  value={paymentFormData.remark}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, remark: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>取消</Button>
            <Button onClick={handleRecordPayment} className="bg-orange-500 hover:bg-orange-600">确认还款</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEntityDetailDialog} onOpenChange={setShowEntityDetailDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>主体详情 - {selectedEntity?.name}</DialogTitle>
          </DialogHeader>
          {selectedEntity && (
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">应付总额</div>
                  <div className="text-xl font-bold text-blue-600">{formatCurrency(selectedEntity.totalReceivable)}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">已付金额</div>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(selectedEntity.totalPaid)}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">待收金额</div>
                  <div className="text-xl font-bold text-orange-600">{formatCurrency(selectedEntity.totalRemaining)}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-slate-500">订单数</div>
                  <div className="text-xl font-bold text-purple-600">{selectedEntity.orders?.length || 0} 笔</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">主体类型:</span>
                      <span>{getEntityTypeBadge(selectedEntity.entityType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">联系人:</span>
                      <span>{selectedEntity.contact?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">联系电话:</span>
                      <span className="text-orange-600">{selectedEntity.contact?.primaryPhone || '-'}</span>
                    </div>
                    {selectedEntity.address && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">地址:</span>
                        <span>{selectedEntity.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">信用信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">信用评分:</span>
                      <span className={`font-mono font-bold ${
                        (selectedEntity.creditScore || 0) >= 80 ? 'text-green-600' :
                        (selectedEntity.creditScore || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {selectedEntity.creditScore !== null && selectedEntity.creditScore !== undefined ? selectedEntity.creditScore.toFixed(0) : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">信用等级:</span>
                      {selectedEntity.creditLevel ? (
                        <Badge variant={
                          selectedEntity.creditLevel === 'excellent' || selectedEntity.creditLevel === 'AAA' || selectedEntity.creditLevel === 'AA' ? 'default' :
                          selectedEntity.creditLevel === 'good' || selectedEntity.creditLevel === 'A' || selectedEntity.creditLevel === 'BBB' ? 'secondary' : 'destructive'
                        }>
                          {getCreditLevelLabel(selectedEntity.creditLevel)}
                        </Badge>
                      ) : <span className="text-slate-400">-</span>}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">风险等级:</span>
                      {selectedEntity.riskLevel ? (
                        <Badge variant={
                          selectedEntity.riskLevel === 'low' ? 'default' :
                          selectedEntity.riskLevel === 'medium' ? 'secondary' : 'destructive'
                        }>
                          {getRiskLevelLabel(selectedEntity.riskLevel)}
                        </Badge>
                      ) : <span className="text-slate-400">-</span>}
                    </div>
                    <div className="border-t border-slate-200 my-2" />
                    <div className="flex justify-between">
                      <span className="text-slate-500">信用额度:</span>
                      <span>{formatCurrency(selectedEntity.creditLimit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">已用额度:</span>
                      <span className="text-orange-600">{formatCurrency(selectedEntity.creditUsed)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">可用额度:</span>
                      <span className="text-green-600">{formatCurrency(Math.max(0, selectedEntity.creditLimit - selectedEntity.creditUsed))}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">项目列表 ({entityProjects.length})</h4>
                {entityProjects.length === 0 && entityOrders.filter(o => !o.projectId).length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                    暂无关联项目或订单
                  </div>
                ) : (
                  <div className="space-y-6">
                    {entityProjects.map((project) => {
                      const projectOrders = getOrdersByProject(project.id);
                      const projectTotal = getProjectTotal(project.id);
                      const projectPaid = getProjectPaid(project.id);

                      return (
                        <div key={project.id} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-4 bg-blue-50 border-b">
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-lg">{project.name}</div>
                              <Badge variant="outline">{project.status}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span>订单: <strong className="text-orange-600">{projectOrders.length}</strong> 笔</span>
                              <span>总金额: <strong>{formatCurrency(projectTotal)}</strong></span>
                              <span>已付: <strong className="text-green-600">{formatCurrency(projectPaid)}</strong></span>
                            </div>
                          </div>

                          {projectOrders.length > 0 && (
                            <div className="p-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>单据号</TableHead>
                                    <TableHead>日期</TableHead>
                                    <TableHead>购货人</TableHead>
                                    <TableHead className="text-right">金额</TableHead>
                                    <TableHead className="text-right">已付</TableHead>
                                    <TableHead className="text-right">待收</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>操作</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {projectOrders.map((order) => {
                                    const remaining = calculateOrderBalance(order);
                                    return (
                                      <TableRow key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => {
                                        setSelectedOrder(order);
                                        setShowOrderDetailDialog(true);
                                      }}>
                                        <TableCell className="font-mono text-sm">
                                          {order.invoiceNo || order.writtenInvoiceNo || order.id.substring(0, 8)}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">
                                          {formatDate(new Date(order.saleDate))}
                                        </TableCell>
                                        <TableCell>{order.buyer?.name || '-'}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(order.totalAmount)}</TableCell>
                                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(order.paidAmount)}</TableCell>
                                        <TableCell className="text-right font-mono text-orange-600 font-bold">
                                          {formatCurrency(remaining)}
                                        </TableCell>
                                        <TableCell>{getOrderStatusBadge(order)}</TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                          {remaining > 0 && (
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setSelectedOrder(order);
                                                  setPaymentFormData({
                                                    amount: remaining.toFixed(2),
                                                    method: '现金',
                                                    remark: '',
                                                  });
                                                  setShowPaymentDialog(true);
                                                }}
                                              >
                                                还款
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600"
                                                onClick={() => handleOpenNegotiatedDialog(order)}
                                              >
                                                协商减免
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600"
                                                onClick={() => handleOpenBadDebtDialog(order)}
                                              >
                                                坏账处理
                                              </Button>
                                            </div>
                                          )}
                                          <Button variant="ghost" size="sm" onClick={() => {
                                            setSelectedOrder(order);
                                            setShowOrderDetailDialog(true);
                                          }}>
                                            查看明细
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {(() => {
                      const unclassifiedOrders = getOrdersByProject(null);
                      if (unclassifiedOrders.length > 0) {
                        const unclassifiedTotal = getProjectTotal(null);
                        const unclassifiedPaid = getProjectPaid(null);

                        return (
                          <div key="unclassified" className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between p-4 bg-slate-50 border-b">
                              <div className="flex items-center gap-3">
                                <div className="font-medium text-lg">未分类订单</div>
                                <Badge variant="secondary">无项目</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span>订单: <strong className="text-orange-600">{unclassifiedOrders.length}</strong> 笔</span>
                                <span>总金额: <strong>{formatCurrency(unclassifiedTotal)}</strong></span>
                                <span>已付: <strong className="text-green-600">{formatCurrency(unclassifiedPaid)}</strong></span>
                              </div>
                            </div>

                            <div className="p-4">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>单据号</TableHead>
                                    <TableHead>日期</TableHead>
                                    <TableHead>购货人</TableHead>
                                    <TableHead className="text-right">金额</TableHead>
                                    <TableHead className="text-right">已付</TableHead>
                                    <TableHead className="text-right">待收</TableHead>
                                    <TableHead>状态</TableHead>
                                    <TableHead>操作</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {unclassifiedOrders.map((order) => {
                                    const remaining = calculateOrderBalance(order);
                                    return (
                                      <TableRow key={order.id} className="cursor-pointer hover:bg-slate-50" onClick={() => {
                                        setSelectedOrder(order);
                                        setShowOrderDetailDialog(true);
                                      }}>
                                        <TableCell className="font-mono text-sm">
                                          {order.invoiceNo || order.writtenInvoiceNo || order.id.substring(0, 8)}
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">
                                          {formatDate(new Date(order.saleDate))}
                                        </TableCell>
                                        <TableCell>{order.buyer?.name || '-'}</TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(order.totalAmount)}</TableCell>
                                        <TableCell className="text-right font-mono text-green-600">{formatCurrency(order.paidAmount)}</TableCell>
                                        <TableCell className="text-right font-mono text-orange-600 font-bold">
                                          {formatCurrency(remaining)}
                                        </TableCell>
                                        <TableCell>{getOrderStatusBadge(order)}</TableCell>
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                          {remaining > 0 && (
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setSelectedOrder(order);
                                                  setPaymentFormData({
                                                    amount: remaining.toFixed(2),
                                                    method: '现金',
                                                    remark: '',
                                                  });
                                                  setShowPaymentDialog(true);
                                                }}
                                              >
                                                还款
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600"
                                                onClick={() => handleOpenNegotiatedDialog(order)}
                                              >
                                                协商减免
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-600"
                                                onClick={() => handleOpenBadDebtDialog(order)}
                                              >
                                                坏账处理
                                              </Button>
                                            </div>
                                          )}
                                          <Button variant="ghost" size="sm" onClick={() => {
                                            setSelectedOrder(order);
                                            setShowOrderDetailDialog(true);
                                          }}>
                                            查看明细
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
              </div>
            </div>
          )}
          <div className="flex-shrink-0 pt-4 border-t">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowEntityDetailDialog(false)}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNegotiatedDialog} onOpenChange={setShowNegotiatedDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>协商减免</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-slate-500">销售单号</div>
                <div className="font-mono">{selectedOrder.invoiceNo || selectedOrder.id.substring(0, 8)}</div>
                <div className="text-sm text-slate-500 mt-2">订单金额: <span className="text-orange-600">{formatCurrency(selectedOrder.totalAmount)}</span></div>
                <div className="text-sm text-slate-500">已付金额: <span className="text-green-600">{formatCurrency(selectedOrder.paidAmount)}</span></div>
                <div className="text-sm text-slate-500">待收金额: <span className="text-red-600 font-bold">{formatCurrency(calculateOrderBalance(selectedOrder))}</span></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">减免金额</label>
                <Input
                  type="number"
                  step="0.01"
                  value={writeOffFormData.amount}
                  onChange={(e) => setWriteOffFormData({ ...writeOffFormData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">协商减免原因 *</label>
                <Textarea
                  value={writeOffFormData.reason}
                  onChange={(e) => setWriteOffFormData({ ...writeOffFormData, reason: e.target.value })}
                  placeholder="请填写协商减免原因，如：客户困难协商减免..."
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">备注说明</label>
                <Textarea
                  value={writeOffFormData.operatorNote}
                  onChange={(e) => setWriteOffFormData({ ...writeOffFormData, operatorNote: e.target.value })}
                  placeholder="可选"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNegotiatedDialog(false)}>取消</Button>
            <Button onClick={handleNegotiatedSettlement} className="bg-blue-600 hover:bg-blue-700">确认协商减免</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showBadDebtDialog} onOpenChange={setShowBadDebtDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>坏账处理申请</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-slate-500">销售单号</div>
                <div className="font-mono">{selectedOrder.invoiceNo || selectedOrder.id.substring(0, 8)}</div>
                <div className="text-sm text-slate-500 mt-2">订单金额: <span className="text-orange-600">{formatCurrency(selectedOrder.totalAmount)}</span></div>
                <div className="text-sm text-slate-500">已付金额: <span className="text-green-600">{formatCurrency(selectedOrder.paidAmount)}</span></div>
                <div className="text-sm text-slate-500">待收金额: <span className="text-red-600 font-bold">{formatCurrency(calculateOrderBalance(selectedOrder))}</span></div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">坏账金额</label>
                <Input
                  type="number"
                  step="0.01"
                  value={writeOffFormData.amount}
                  onChange={(e) => setWriteOffFormData({ ...writeOffFormData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">坏账原因 *</label>
                <Textarea
                  value={writeOffFormData.reason}
                  onChange={(e) => setWriteOffFormData({ ...writeOffFormData, reason: e.target.value })}
                  placeholder="请填写坏账原因，如：客户失联、长期拖欠无法收回..."
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">备注说明</label>
                <Textarea
                  value={writeOffFormData.operatorNote}
                  onChange={(e) => setWriteOffFormData({ ...writeOffFormData, operatorNote: e.target.value })}
                  placeholder="可选"
                  rows={2}
                />
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                ⚠️ 提示：坏账申请提交后需要审批，审批通过后才会正式核销
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBadDebtDialog(false)}>取消</Button>
            <Button onClick={handleBadDebtWriteOff} className="bg-red-600 hover:bg-red-700">提交坏账申请</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showOrderDetailDialog} onOpenChange={setShowOrderDetailDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>订单明细 - {selectedOrder?.invoiceNo || selectedOrder?.id?.substring(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500">订单日期</div>
                  <div className="font-medium">{formatDate(new Date(selectedOrder.saleDate))}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500">购货人</div>
                  <div className="font-medium">{selectedOrder.buyer?.name || '-'}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500">项目</div>
                  <div className="font-medium">{selectedOrder.project?.name || '-'}</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <div className="text-xs text-slate-500">状态</div>
                  <div>{getOrderStatusBadge(selectedOrder)}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">商品明细</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品名称</TableHead>
                      <TableHead className="text-right">数量</TableHead>
                      <TableHead className="text-right">单价</TableHead>
                      <TableHead className="text-right">小计</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.items?.map((item: any, index: number) => (
                      <TableRow key={item.id || index}>
                        <TableCell>{item.product?.name || '-'}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">金额汇总</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">订单金额:</span>
                      <span className="font-mono">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                    {selectedOrder.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">配送费:</span>
                        <span className="font-mono">{formatCurrency(selectedOrder.deliveryFee)}</span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">优惠:</span>
                        <span className="font-mono text-green-600">-{formatCurrency(selectedOrder.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>应付:</span>
                      <span className="font-mono">{formatCurrency(selectedOrder.totalAmount + (selectedOrder.deliveryFee || 0) - (selectedOrder.discount || 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">已付:</span>
                      <span className="font-mono text-green-600">{formatCurrency(selectedOrder.paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>待收:</span>
                      <span className="font-mono font-bold">{formatCurrency(calculateOrderBalance(selectedOrder))}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">照片附件</h4>
                  {selectedOrder.photos && selectedOrder.photos.length > 0 ? (
                    <div>
                      <div className="text-sm text-slate-500 mb-2">
                        共 {selectedOrder.photos.length} 张照片
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {selectedOrder.photos.slice(0, 4).map((photo: any, idx: number) => (
                          <div
                            key={photo.id}
                            className="aspect-square bg-slate-200 rounded cursor-pointer hover:bg-slate-300 flex items-center justify-center overflow-hidden"
                            onClick={() => {
                              setPhotoViewerIndex(idx);
                              setPhotoViewerOpen(true);
                            }}
                          >
                            {photo.photoType === 'signature' ? (
                              <span className="text-lg">✍️</span>
                            ) : (
                              <span className="text-lg">📷</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {selectedOrder.photos.length > 4 && (
                        <div className="text-xs text-slate-400 mt-1">
                          还有 {selectedOrder.photos.length - 4} 张...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400">
                      暂无照片<br/>
                      <span className="text-xs">建议：上传签字单照片，方便年底对账</span>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.photos && selectedOrder.photos.length > 0 && (
                <div className="text-xs text-slate-400">
                  💡 点击照片可查看大图和详情
                </div>
              )}
              </div>
            </div>
          )}
          <div className="flex-shrink-0 pt-4 border-t">
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowOrderDetailDialog(false)}>
                关闭
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PhotoViewer
        photos={selectedOrder?.photos || []}
        open={photoViewerOpen}
        onOpenChange={setPhotoViewerOpen}
        initialIndex={photoViewerIndex}
      />
    </div>
  );
}
