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
import { db } from '@/lib/db';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { DeliveryFee, SaleOrder, Purchase } from '@/lib/types';
import { toast } from '@/components/Toast';
import { DeliveryService } from '@/services/DeliveryService';
import { PurchaseService } from '@/services/PurchaseService';

interface DeliveryRecordDisplay {
  id: string;
  saleId: string | null;
  saleOrder?: SaleOrder | null;
  projectId: string | null;
  zoneName: string;
  recipientName: string;
  recipientPhone: string | null;
  deliveryAddress: string;
  distance: number;
  weight: number;
  baseFee: number;
  distanceFee: number;
  weightFee: number;
  totalFee: number;
  deliveryStatus: string;
  deliveryDate: Date | null;
  driverName: string | null;
  driverPhone: string | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PurchaseDeliveryDisplay {
  id: string;
  productName: string;
  supplierName: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  needDelivery: boolean;
  deliveryStatus: string;
  driverName: string | null;
  driverPhone: string | null;
  estimatedDeliveryDate: Date | null;
  sentDate: Date | null;
  deliveredDate: Date | null;
  status: string;
  createdAt: Date;
}

const deliveryStatusLabels: Record<string, { label: string; variant: 'secondary' | 'warning' | 'default' | 'outline' }> = {
  not_needed: { label: '无需配送', variant: 'outline' },
  pending: { label: '待发货', variant: 'warning' },
  shipped: { label: '已发货', variant: 'default' },
  in_transit: { label: '配送中', variant: 'default' },
  delivered: { label: '已到货', variant: 'outline' },
};

export function Deliveries() {
  const [deliveryFees, setDeliveryFees] = useState<DeliveryFee[]>([]);
  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecordDisplay[]>([]);
  const [purchaseDeliveries, setPurchaseDeliveries] = useState<PurchaseDeliveryDisplay[]>([]);
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'fees' | 'sale_records' | 'purchase_records'>('fees');
  const [purchaseFilter, setPurchaseFilter] = useState<string>('all');
  const [showAddFeeDialog, setShowAddFeeDialog] = useState(false);
  const [showAddRecordDialog, setShowAddRecordDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [feeFormData, setFeeFormData] = useState({
    zoneName: '',
    baseFee: '',
    perKgFee: '',
    perKmFee: '',
    minWeight: '',
    remark: '',
  });
  const [recordFormData, setRecordFormData] = useState({
    saleOrderId: '',
    zoneName: '',
    recipientName: '',
    recipientPhone: '',
    deliveryAddress: '',
    distance: '',
    weight: '',
    driverName: '',
    driverPhone: '',
    remark: '',
  });

  useEffect(() => {
    if (!showAddRecordDialog) {
      setRecordFormData({
        saleOrderId: '',
        zoneName: '',
        recipientName: '',
        recipientPhone: '',
        deliveryAddress: '',
        distance: '',
        weight: '',
        driverName: '',
        driverPhone: '',
        remark: '',
      });
    }
  }, [showAddRecordDialog]);

  useEffect(() => {
    if (!showAddFeeDialog) {
      setFeeFormData({
        zoneName: '',
        baseFee: '',
        perKgFee: '',
        perKmFee: '',
        minWeight: '',
        remark: '',
      });
    }
  }, [showAddFeeDialog]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [feesData, recordsData, ordersData, purchasesData] = await Promise.all([
        DeliveryService.getDeliveryFees(),
        DeliveryService.getDeliveryRecords(),
        DeliveryService.getSaleOrders({ needDelivery: true }),
        DeliveryService.getPurchases({ needDelivery: true }),
      ]);
      setDeliveryFees(feesData);
      setDeliveryRecords(recordsData as DeliveryRecordDisplay[]);
      setSaleOrders(ordersData);

      const purchaseDeliveriesData: PurchaseDeliveryDisplay[] = purchasesData.map((p: any) => ({
        id: p.id,
        productName: p.product?.name || '-',
        supplierName: p.supplier?.name || p.supplierName || '-',
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        totalAmount: p.totalAmount,
        needDelivery: p.needDelivery,
        deliveryStatus: p.deliveryStatus,
        driverName: p.driverName,
        driverPhone: p.driverPhone,
        estimatedDeliveryDate: p.estimatedDeliveryDate,
        sentDate: p.sentDate,
        deliveredDate: p.deliveredDate,
        status: p.status,
        createdAt: p.createdAt,
      }));
      setPurchaseDeliveries(purchaseDeliveriesData);
    } catch (error) {
      console.error('[Deliveries] 加载数据失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddFee = async () => {
    if (!feeFormData.zoneName.trim()) {
      toast('请输入区域名称', 'warning');
      return;
    }

    try {
      await DeliveryService.createDeliveryFee({
        zoneName: feeFormData.zoneName.trim(),
        baseFee: parseFloat(feeFormData.baseFee) || 0,
        perKgFee: parseFloat(feeFormData.perKgFee) || 0,
        perKmFee: parseFloat(feeFormData.perKmFee) || 0,
        minWeight: parseFloat(feeFormData.minWeight) || 0,
        maxWeight: 100,
        remark: feeFormData.remark.trim() || undefined,
      });

      setShowAddFeeDialog(false);
      setFeeFormData({ zoneName: '', baseFee: '', perKgFee: '', perKmFee: '', minWeight: '', remark: '' });
      loadData();
      toast('配送费用标准添加成功', 'success');
    } catch (error) {
      console.error('[Deliveries] 添加配送费用失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleAddRecord = async () => {
    if (!recordFormData.recipientName.trim()) {
      toast('请输入收货人姓名', 'warning');
      return;
    }
    if (!recordFormData.deliveryAddress.trim()) {
      toast('请输入配送地址', 'warning');
      return;
    }

    const weight = parseFloat(recordFormData.weight) || 0;
    const distance = parseFloat(recordFormData.distance) || 0;
    const zoneName = recordFormData.zoneName || '默认';
    const selectedFee = deliveryFees.find(f => f.zoneName === zoneName);
    const chargeableWeight = Math.max(weight, selectedFee?.minWeight || 0);
    const weightFee = chargeableWeight * (selectedFee?.perKgFee || 0);
    const distanceFee = distance * (selectedFee?.perKmFee || 0);
    const totalFee = (selectedFee?.baseFee || 0) + weightFee + distanceFee;

    try {
      await DeliveryService.createDeliveryRecord({
        saleId: recordFormData.saleOrderId || null,
        zoneName: zoneName,
        recipientName: recordFormData.recipientName.trim(),
        recipientPhone: recordFormData.recipientPhone.trim() || null,
        deliveryAddress: recordFormData.deliveryAddress.trim(),
        distance: distance,
        weight: weight,
        baseFee: selectedFee?.baseFee || 0,
        distanceFee: distanceFee,
        weightFee: weightFee,
        totalFee: totalFee,
        deliveryStatus: 'pending',
        driverName: recordFormData.driverName.trim() || null,
        driverPhone: recordFormData.driverPhone.trim() || null,
        remark: recordFormData.remark.trim() || null,
      });

      setShowAddRecordDialog(false);
      setRecordFormData({
        saleOrderId: '', zoneName: '', recipientName: '', recipientPhone: '',
        deliveryAddress: '', distance: '', weight: '', driverName: '', driverPhone: '', remark: ''
      });
      setActiveTab('sale_records');
      loadData();
      toast('配送记录添加成功', 'success');
    } catch (error) {
      console.error('[Deliveries] 添加配送记录失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleDeleteFee = async (id: string) => {
    try {
      await DeliveryService.deleteDeliveryFee(id);
      loadData();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('[Deliveries] 删除配送费用失败:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const handleUpdateRecordStatus = async (id: string, status: string) => {
    try {
      await DeliveryService.updateDeliveryRecord(id, {
        deliveryStatus: status,
        deliveryDate: status === 'delivered' ? new Date() : undefined,
      });
      loadData();
      toast('状态更新成功', 'success');
    } catch (error) {
      console.error('[Deliveries] 更新配送状态失败:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleUpdatePurchaseDeliveryStatus = async (id: string, newStatus: string) => {
    try {
      const updateData: any = { deliveryStatus: newStatus };
      if (newStatus === 'shipped') {
      } else if (newStatus === 'in_transit') {
      } else if (newStatus === 'delivered') {
        updateData.deliveredDate = new Date();
        updateData.status = 'delivered';
      }
      await PurchaseService.updatePurchase(id, updateData);
      loadData();
      toast('状态更新成功', 'success');
    } catch (error) {
      console.error('[Deliveries] 更新进货配送状态失败:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const totalDeliveryFee = deliveryRecords.reduce((sum, r) => sum + r.totalFee, 0);
  const pendingCount = deliveryRecords.filter(r => r.deliveryStatus === 'pending').length;

  const filteredRecords = deliveryRecords.filter((r) => {
    const matchesSearch =
      !searchTerm ||
      r.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.deliveryAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.zoneName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.deliveryStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPurchaseDeliveries = purchaseDeliveries.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = purchaseFilter === 'all' || p.deliveryStatus === purchaseFilter;
    return matchesSearch && matchesStatus;
  });

  const purchasePendingCount = purchaseDeliveries.filter(p =>
    p.status === 'sent' && p.deliveryStatus !== 'delivered'
  ).length;

  const tableProps = useDataTable<DeliveryRecordDisplay>({
    data: filteredRecords,
    defaultPageSize: 20,
  });

  const purchaseTableProps = useDataTable<PurchaseDeliveryDisplay>({
    data: filteredPurchaseDeliveries,
    defaultPageSize: 20,
  });

  const statusLabels: Record<string, string> = {
    pending: '待配送',
    delivering: '配送中',
    delivered: '已完成',
    cancelled: '已取消',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">配送管理</h2>
          <p className="text-slate-500 mt-1">管理配送费用标准与配送记录</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowAddFeeDialog(true)} variant="outline">
            + 费用标准
          </Button>
          {activeTab === 'sale_records' && (
            <Button onClick={() => setShowAddRecordDialog(true)} className="bg-orange-500 hover:bg-orange-600">
              + 添加配送
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">配送总费用</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(totalDeliveryFee)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">销售待配送</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">进货待配送</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{purchasePendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">配送区域</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{deliveryFees.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button
          variant={activeTab === 'fees' ? 'default' : 'outline'}
          onClick={() => setActiveTab('fees')}
        >
          费用标准
        </Button>
        <Button
          variant={activeTab === 'sale_records' ? 'default' : 'outline'}
          onClick={() => setActiveTab('sale_records')}
        >
          销售配送
        </Button>
        <Button
          variant={activeTab === 'purchase_records' ? 'default' : 'outline'}
          onClick={() => setActiveTab('purchase_records')}
        >
          进货配送
        </Button>
      </div>

      {activeTab === 'fees' && (
        <>
          {showAddFeeDialog && (
            <Dialog open={showAddFeeDialog} onOpenChange={setShowAddFeeDialog}>
              <DialogContent aria-describedby="fee-dialog-description">
                <DialogHeader>
                  <DialogTitle>添加配送费用标准</DialogTitle>
                  <p id="fee-dialog-description" className="text-sm text-slate-500">设置配送区域的基础费用、重量费和距离费</p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">区域名称 <span className="text-red-500">*</span></label>
                    <Input
                      value={feeFormData.zoneName}
                      onChange={(e) => setFeeFormData({ ...feeFormData, zoneName: e.target.value })}
                      placeholder="如：市区、近郊、远郊"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">基础费用</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={feeFormData.baseFee}
                      onChange={(e) => setFeeFormData({ ...feeFormData, baseFee: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">每公斤费用</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={feeFormData.perKgFee}
                      onChange={(e) => setFeeFormData({ ...feeFormData, perKgFee: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">每公里费用</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={feeFormData.perKmFee}
                      onChange={(e) => setFeeFormData({ ...feeFormData, perKmFee: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">最低计费重量(kg)</label>
                    <Input
                      type="number"
                      value={feeFormData.minWeight}
                      onChange={(e) => setFeeFormData({ ...feeFormData, minWeight: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">备注</label>
                    <Input
                      value={feeFormData.remark}
                      onChange={(e) => setFeeFormData({ ...feeFormData, remark: e.target.value })}
                      placeholder="可选"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddFeeDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddFee} className="bg-orange-500 hover:bg-orange-600">
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Card>
            <CardHeader>
              <CardTitle>配送费用标准</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-slate-500">加载中...</div>
              ) : deliveryFees.length === 0 ? (
                <div className="text-center py-8 text-slate-500">暂无费用标准</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deliveryFees.map((fee) => (
                    <div key={fee.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-slate-800">{fee.zoneName}</span>
                        <Badge variant={fee.isActive ? 'success' : 'secondary'}>
                          {fee.isActive ? '启用' : '停用'}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>基础费: {formatCurrency(fee.baseFee)}</div>
                        <div>重量费: {formatCurrency(fee.perKgFee)}/kg</div>
                        <div>距离费: {formatCurrency(fee.perKmFee)}/km</div>
                        <div>最低重量: {fee.minWeight}kg</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFee(fee.id)}
                        className="text-red-500 hover:text-red-700 mt-2"
                      >
                        删除
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'sale_records' && (
        <>
          {showAddRecordDialog && (
            <Dialog open={showAddRecordDialog} onOpenChange={setShowAddRecordDialog}>
              <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby="record-dialog-description">
                <DialogHeader>
                  <DialogTitle>添加配送记录</DialogTitle>
                  <p id="record-dialog-description" className="text-sm text-slate-500">填写收货人信息和配送详情</p>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">关联销售订单（可选）</label>
                    <Select
                      value={recordFormData.saleOrderId || '__none__'}
                      onValueChange={(v) => setRecordFormData({ ...recordFormData, saleOrderId: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="不关联销售订单" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">不关联销售订单</SelectItem>
                        {saleOrders.map((order) => (
                          <SelectItem key={order.id} value={order.id}>
                            {order.invoiceNo || order.writtenInvoiceNo || order.id.slice(-8)} - {order.buyer?.name || '散客'} - {formatCurrency(order.totalAmount)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">收货人姓名 <span className="text-red-500">*</span></label>
                    <Input
                      value={recordFormData.recipientName}
                      onChange={(e) => setRecordFormData({ ...recordFormData, recipientName: e.target.value })}
                      placeholder="请输入收货人姓名"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">联系电话</label>
                    <Input
                      value={recordFormData.recipientPhone}
                      onChange={(e) => setRecordFormData({ ...recordFormData, recipientPhone: e.target.value })}
                      placeholder="请输入联系电话"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">配送地址 <span className="text-red-500">*</span></label>
                    <Input
                      value={recordFormData.deliveryAddress}
                      onChange={(e) => setRecordFormData({ ...recordFormData, deliveryAddress: e.target.value })}
                      placeholder="请输入详细配送地址"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">配送区域</label>
                    <Select
                      value={recordFormData.zoneName || '__none__'}
                      onValueChange={(v) => setRecordFormData({ ...recordFormData, zoneName: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="默认区域" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">默认区域</SelectItem>
                        {deliveryFees.map((fee) => (
                          <SelectItem key={fee.id} value={fee.zoneName}>
                            {fee.zoneName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">重量 (kg)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={recordFormData.weight}
                      onChange={(e) => setRecordFormData({ ...recordFormData, weight: e.target.value })}
                      placeholder="货物重量"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">配送距离 (km)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={recordFormData.distance}
                      onChange={(e) => setRecordFormData({ ...recordFormData, distance: e.target.value })}
                      placeholder="配送距离"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">司机姓名</label>
                    <Input
                      value={recordFormData.driverName}
                      onChange={(e) => setRecordFormData({ ...recordFormData, driverName: e.target.value })}
                      placeholder="可选"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">司机电话</label>
                    <Input
                      value={recordFormData.driverPhone}
                      onChange={(e) => setRecordFormData({ ...recordFormData, driverPhone: e.target.value })}
                      placeholder="可选"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">备注</label>
                    <Input
                      value={recordFormData.remark}
                      onChange={(e) => setRecordFormData({ ...recordFormData, remark: e.target.value })}
                      placeholder="可选"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddRecordDialog(false)}>
                    取消
                  </Button>
                  <Button onClick={handleAddRecord} className="bg-orange-500 hover:bg-orange-600">
                    保存
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  placeholder="搜索收货人、地址..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48 h-8"
                />

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-28 h-8">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="pending">待配送</SelectItem>
                    <SelectItem value="delivering">配送中</SelectItem>
                    <SelectItem value="delivered">已完成</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
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
                <div className="text-center py-8 text-slate-500">暂无配送记录</div>
              ) : (
                <div className="space-y-3">
                  {tableProps.data.map((record) => (
                    <div key={record.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{record.recipientName}</span>
                            <Badge variant={
                              record.deliveryStatus === 'delivered' ? 'success' :
                              record.deliveryStatus === 'delivering' ? 'default' :
                              record.deliveryStatus === 'cancelled' ? 'destructive' : 'warning'
                            }>
                              {statusLabels[record.deliveryStatus] || record.deliveryStatus}
                            </Badge>
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            {record.deliveryAddress} | {record.zoneName}
                          </div>
                          {record.saleId && (
                            <div className="text-sm text-slate-500 mt-1">
                              关联订单ID: {record.saleId.slice(-8)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-slate-800">{formatCurrency(record.totalFee)}</div>
                          <div className="text-sm text-slate-500">
                            {record.weight}kg | {record.distance}km
                          </div>
                          <div className="flex gap-1 mt-2">
                            {record.deliveryStatus === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateRecordStatus(record.id, 'delivering')}
                                >
                                  开始配送
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUpdateRecordStatus(record.id, 'cancelled')}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  取消
                                </Button>
                              </>
                            )}
                            {record.deliveryStatus === 'delivering' && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleUpdateRecordStatus(record.id, 'delivered')}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                完成配送
                              </Button>
                            )}
                          </div>
                        </div>
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
        </>
      )}

      {activeTab === 'purchase_records' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 flex-wrap">
              <Input
                placeholder="搜索商品、供应商..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 h-8"
              />

              <Select value={purchaseFilter} onValueChange={setPurchaseFilter}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="配送状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="pending">待发货</SelectItem>
                  <SelectItem value="shipped">已发货</SelectItem>
                  <SelectItem value="in_transit">配送中</SelectItem>
                  <SelectItem value="delivered">已到货</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setPurchaseFilter('all');
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
            ) : purchaseTableProps.total === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无进货配送记录</div>
            ) : (
              <div className="space-y-3">
                {purchaseTableProps.data.map((record) => {
                  const statusInfo = deliveryStatusLabels[record.deliveryStatus] || { label: record.deliveryStatus, variant: 'secondary' as const };
                  return (
                    <div key={record.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{record.productName}</span>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            供应商: {record.supplierName} | 数量: {record.quantity}
                          </div>
                          {record.driverName && (
                            <div className="text-sm text-slate-500 mt-1">
                              司机: {record.driverName} {record.driverPhone && `(${record.driverPhone})`}
                            </div>
                          )}
                          {record.sentDate && (
                            <div className="text-xs text-blue-600 mt-1">
                              发送时间: {formatDateTime(record.sentDate)}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-slate-800">{formatCurrency(record.totalAmount)}</div>
                          {record.estimatedDeliveryDate && (
                            <div className="text-sm text-slate-500">
                              预计: {formatDateTime(record.estimatedDeliveryDate)}
                            </div>
                          )}
                          <div className="flex gap-1 mt-2">
                            {record.status !== 'completed' && record.deliveryStatus !== 'delivered' && (
                              <>
                                {(record.deliveryStatus === 'pending' || record.deliveryStatus === 'shipped') && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdatePurchaseDeliveryStatus(record.id, 'shipped')}
                                  >
                                    标记已发货
                                  </Button>
                                )}
                                {record.deliveryStatus === 'shipped' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdatePurchaseDeliveryStatus(record.id, 'in_transit')}
                                  >
                                    标记配送中
                                  </Button>
                                )}
                                {record.deliveryStatus !== 'pending' && record.deliveryStatus !== 'shipped' && record.deliveryStatus !== 'in_transit' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdatePurchaseDeliveryStatus(record.id, 'pending')}
                                  >
                                    标记待发货
                                  </Button>
                                )}
                              </>
                            )}
                            {record.deliveryStatus !== 'delivered' && record.status !== 'completed' && (
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => handleUpdatePurchaseDeliveryStatus(record.id, 'delivered')}
                              >
                                确认到货
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <DataTablePagination
              pagination={{
                page: purchaseTableProps.page,
                pageSize: purchaseTableProps.pageSize,
                total: purchaseTableProps.total,
              }}
              onPageChange={purchaseTableProps.setPage}
              onPageSizeChange={purchaseTableProps.setPageSize}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}