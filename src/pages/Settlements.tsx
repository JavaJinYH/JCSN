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
import { DataTableFilters, DataTablePagination, useDataTable } from '@/components/DataTable';
import { db } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { Entity, SaleOrder, Contact } from '@/lib/types';

type EntityWithStats = Entity & {
  contact?: Contact | null;
  orders?: SaleOrder[];
  totalReceivable: number;
  totalPaid: number;
  totalRemaining: number;
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
    { value: 'personal', label: '个人' },
    { value: 'company', label: '公司' },
    { value: 'government', label: '政府' },
  ]},
  { key: 'search', label: '关键词', type: 'text' as const, placeholder: '主体名称/联系人电话...' },
];

export function Settlements() {
  const [entities, setEntities] = useState<EntityWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'receivables' | 'credits'>('receivables');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEntityDetailDialog, setShowEntityDetailDialog] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityWithStats | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);

  const [paymentFormData, setPaymentFormData] = useState({
    amount: '',
    method: '现金',
    remark: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const entitiesData = await db.entity.findMany({
        include: { contact: true },
        orderBy: { name: 'asc' },
      });

      const entitiesWithStats: EntityWithStats[] = await Promise.all(
        entitiesData.map(async (entity) => {
          const orders = await db.saleOrder.findMany({
            where: { paymentEntityId: entity.id },
            include: {
              buyer: true,
              project: true,
              payments: true,
            },
            orderBy: { saleDate: 'desc' },
          });

          const totalReceivable = orders.reduce((sum, o) => sum + o.totalAmount, 0);
          const totalPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
          const totalRemaining = totalReceivable - totalPaid;

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

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilterValues({});
  };

  const filteredEntities = useMemo(() => {
    return entities.filter((entity) => {
      if (filterValues.status && filterValues.status !== 'all') {
        if (filterValues.status === 'overdue') {
          if (!entity.orders?.some(o => {
            const remaining = o.totalAmount - o.paidAmount;
            return remaining > 0 && o.saleDate && new Date() > new Date(new Date(o.saleDate).getTime() + 30 * 24 * 60 * 60 * 1000);
          })) return false;
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

  const tableProps = useDataTable<EntityWithStats>({
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
    return entities.filter(e => {
      return e.orders?.some(o => {
        const remaining = o.totalAmount - o.paidAmount;
        return remaining > 0 && o.saleDate && new Date() > new Date(new Date(o.saleDate).getTime() + 30 * 24 * 60 * 60 * 1000);
      });
    }).length;
  }, [entities]);

  const highCreditUsedCount = useMemo(() => {
    return entities.filter(e => e.creditLimit > 0 && (e.creditUsed / e.creditLimit) > 0.8).length;
  }, [entities]);

  const handleOpenPaymentDialog = (order: SaleOrder) => {
    setSelectedOrder(order);
    const remaining = order.totalAmount - order.paidAmount;
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
      const remaining = selectedOrder.totalAmount - newPaidAmount;

      await db.saleOrder.update({
        where: { id: selectedOrder.id },
        data: {
          paidAmount: newPaidAmount,
          status: remaining <= 0 ? 'completed' : 'partial',
        },
      });

      await db.orderPayment.create({
        data: {
          orderId: selectedOrder.id,
          amount,
          method: paymentFormData.method,
          payerName: selectedOrder.payer?.name || null,
          paidAt: new Date(),
          remark: paymentFormData.remark || '客户还款',
        },
      });

      await db.entity.update({
        where: { id: selectedOrder.paymentEntityId },
        data: {
          creditUsed: Math.max(0, (selectedEntity?.creditUsed || 0) - amount),
        },
      });

      setShowPaymentDialog(false);
      loadData();
      toast('还款记录成功', 'success');
    } catch (error) {
      console.error('[Settlements] 记录还款失败:', error);
      toast('操作失败，请重试', 'error');
    }
  };

  const handleOpenEntityDetail = (entity: EntityWithStats) => {
    setSelectedEntity(entity);
    setShowEntityDetailDialog(true);
  };

  const getEntityTypeBadge = (type: string) => {
    switch (type) {
      case 'personal':
        return <Badge className="bg-blue-500">个人</Badge>;
      case 'company':
        return <Badge className="bg-purple-500">公司</Badge>;
      case 'government':
        return <Badge className="bg-green-500">政府</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getOrderStatusBadge = (order: SaleOrder) => {
    const remaining = order.totalAmount - order.paidAmount;
    const isOverdue = order.saleDate && new Date() > new Date(new Date(order.saleDate).getTime() + 30 * 24 * 60 * 60 * 1000);

    if (remaining <= 0) {
      return <Badge className="bg-green-500">已结清</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive">已逾期</Badge>;
    }
    if (order.paidAmount > 0) {
      return <Badge variant="warning">部分还款</Badge>;
    }
    return <Badge variant="secondary">待收款</Badge>;
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
          <h2 className="text-2xl font-bold text-slate-800">结账对账管理</h2>
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
            <DataTableFilters
              filters={filters}
              values={filterValues}
              onChange={handleFilterChange}
              onReset={handleResetFilters}
            />
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
                {tableProps.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                      暂无应收账款数据
                    </TableCell>
                  </TableRow>
                ) : (
                  tableProps.data.map((entity) => {
                    const outstandingOrders = entity.orders?.filter(o => (o.totalAmount - o.paidAmount) > 0) || [];
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
            <CardTitle>主体信用额度</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>主体名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>联系人</TableHead>
                  <TableHead>信用额度</TableHead>
                  <TableHead>已用额度</TableHead>
                  <TableHead>可用额度</TableHead>
                  <TableHead>使用比例</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entities.filter(e => e.creditLimit > 0).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                      暂无设置信用额度的主体
                    </TableCell>
                  </TableRow>
                ) : (
                  entities.filter(e => e.creditLimit > 0).map((entity) => {
                    const availableCredit = entity.creditLimit - entity.creditUsed;
                    const usageRatio = entity.creditLimit > 0 ? (entity.creditUsed / entity.creditLimit * 100) : 0;
                    return (
                      <TableRow key={entity.id}>
                        <TableCell className="font-medium">{entity.name}</TableCell>
                        <TableCell>{getEntityTypeBadge(entity.entityType)}</TableCell>
                        <TableCell>
                          <div>{entity.contact?.name || '-'}</div>
                          <div className="text-sm text-slate-500">{entity.contact?.primaryPhone || ''}</div>
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
                <div className="text-sm text-slate-500">待收金额: <span className="text-red-600 font-bold">{formatCurrency(selectedOrder.totalAmount - selectedOrder.paidAmount)}</span></div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>主体详情 - {selectedEntity?.name}</DialogTitle>
          </DialogHeader>
          {selectedEntity && (
            <div className="space-y-6">
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
                <h4 className="font-medium mb-3">订单明细</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>单号</TableHead>
                      <TableHead>日期</TableHead>
                      <TableHead>购货人</TableHead>
                      <TableHead>项目</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead className="text-right">订单金额</TableHead>
                      <TableHead className="text-right">已付</TableHead>
                      <TableHead className="text-right">待收</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedEntity.orders?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-4 text-slate-500">
                          暂无订单
                        </TableCell>
                      </TableRow>
                    ) : (
                      selectedEntity.orders?.map((order) => {
                        const remaining = order.totalAmount - order.paidAmount;
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.invoiceNo || order.id.substring(0, 8)}
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {new Date(order.saleDate).toLocaleDateString('zh-CN')}
                            </TableCell>
                            <TableCell>{order.buyer?.name || '-'}</TableCell>
                            <TableCell className="text-slate-500">
                              {order.project?.name || '-'}
                            </TableCell>
                            <TableCell>{getOrderStatusBadge(order)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(order.totalAmount)}</TableCell>
                            <TableCell className="text-right font-mono text-green-600">{formatCurrency(order.paidAmount)}</TableCell>
                            <TableCell className="text-right font-mono text-orange-600 font-bold">
                              {formatCurrency(remaining)}
                            </TableCell>
                            <TableCell>
                              {remaining > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    const rem = order.totalAmount - order.paidAmount;
                                    setPaymentFormData({
                                      amount: rem.toFixed(2),
                                      method: '现金',
                                      remark: '',
                                    });
                                    setShowPaymentDialog(true);
                                  }}
                                >
                                  还款
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowEntityDetailDialog(false)}>
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