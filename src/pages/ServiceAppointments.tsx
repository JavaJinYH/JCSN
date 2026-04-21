import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ServiceAppointmentService } from '@/services/ServiceAppointmentService';
import { ContactService } from '@/services/ContactService';
import { ProjectService } from '@/services/ProjectService';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { toast } from '@/components/Toast';

const SERVICE_TYPES = ['水暖安装', '维修', '其他'];
const INSTALLER_TYPES = ['无', '店主', '水电工', '第三方'];
const STATUS_OPTIONS = ['待上门', '已上门', '待返工', '已完成'];
const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default' | 'destructive' | 'outline' | 'secondary'> = {
  '待上门': 'secondary',
  '已上门': 'success',
  '待返工': 'warning',
  '已完成': 'default',
};

interface SelectedItem {
  orderId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  maxQuantity: number;
  remark?: string;
}

export function ServiceAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [projectOrders, setProjectOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [installerTypeFilter, setInstallerTypeFilter] = useState<string>('all');

  const [selectedProjectId, setSelectedProjectId] = useState<string>('__none__');
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const [formData, setFormData] = useState({
    contactId: '__none__',
    projectId: '__none__',
    appointmentDate: new Date().toISOString().slice(0, 16),
    serviceType: '水暖安装',
    installerType: '__none__',
    installerContactId: '__none__',
    status: '待上门',
    notes: '',
    installationFee: '',
  });

  useEffect(() => {
    loadData();
    loadReferences();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await ServiceAppointmentService.getAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferences = async () => {
    try {
      const [contactsData, projectsData] = await Promise.all([
        ContactService.getContacts(),
        ProjectService.getProjects(),
      ]);
      setContacts(contactsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to load references:', error);
    }
  };

  const handleProjectChange = async (projectId: string) => {
    setFormData({ ...formData, projectId });
    setSelectedProjectId(projectId);
    setSelectedItems([]);
    
    if (projectId !== '__none__') {
      try {
        const orders = await ServiceAppointmentService.getProjectOrdersWithItems(projectId);
        setProjectOrders(orders);
      } catch (error) {
        console.error('Failed to load project orders:', error);
        toast('加载项目订单失败', 'error');
      }
    } else {
      setProjectOrders([]);
    }
  };

  const toggleItemSelection = (orderId: string, orderItemId: string, productId: string, productName: string, maxQuantity: number) => {
    setSelectedItems(prev => {
      const existing = prev.find(item => item.orderId === orderId && item.orderItemId === orderItemId);
      if (existing) {
        return prev.filter(item => !(item.orderId === orderId && item.orderItemId === orderItemId));
      } else {
        return [...prev, {
          orderId,
          orderItemId,
          productId,
          productName,
          quantity: 1,
          maxQuantity,
        }];
      }
    });
  };

  const updateItemQuantity = (orderId: string, orderItemId: string, quantity: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.orderId === orderId && item.orderItemId === orderItemId) {
        return { ...item, quantity: Math.max(1, Math.min(quantity, item.maxQuantity)) };
      }
      return item;
    }));
  };

  const handleAddAppointment = async () => {
    if (!formData.appointmentDate) {
      toast('请选择预约时间', 'warning');
      return;
    }
    if (!formData.serviceType) {
      toast('请选择服务类型', 'warning');
      return;
    }

    try {
      const contactId = formData.contactId === '__none__' ? undefined : formData.contactId;
      const projectId = formData.projectId === '__none__' ? undefined : formData.projectId;
      const installerType = formData.installerType === '__none__' ? undefined : formData.installerType;
      const installerContactId = formData.installerType === '水电工' && formData.installerContactId !== '__none__' ? formData.installerContactId : undefined;

      const items = selectedItems.map(item => ({
        orderId: item.orderId,
        orderItemId: item.orderItemId,
        productId: item.productId,
        quantity: item.quantity,
        remark: item.remark,
      }));

      await ServiceAppointmentService.createAppointment({
        contactId,
        projectId,
        appointmentDate: new Date(formData.appointmentDate),
        serviceType: formData.serviceType,
        installerType,
        installerContactId,
        status: formData.status,
        notes: formData.notes || undefined,
        installationFee: formData.installationFee ? parseFloat(formData.installationFee) : undefined,
        items: items.length > 0 ? items : undefined,
      });

      setShowAddDialog(false);
      resetForm();
      loadData();
      toast('服务预约添加成功', 'success');
    } catch (error) {
      console.error('Failed to add appointment:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      contactId: '__none__',
      projectId: '__none__',
      appointmentDate: new Date().toISOString().slice(0, 16),
      serviceType: '水暖安装',
      installerType: '__none__',
      installerContactId: '__none__',
      status: '待上门',
      notes: '',
      installationFee: '',
    });
    setSelectedProjectId('__none__');
    setSelectedItems([]);
    setProjectOrders([]);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await ServiceAppointmentService.updateAppointment(id, {
        status: newStatus,
      });
      loadData();
      toast('状态更新成功', 'success');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('确定要删除这条预约记录吗？')) return;
    try {
      await ServiceAppointmentService.deleteAppointment(id);
      loadData();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const filteredAppointments = appointments.filter((appt) => {
    const matchesStatus = statusFilter === 'all' || appt.status === statusFilter;
    const matchesInstaller = installerTypeFilter === 'all' || appt.installerType === installerTypeFilter;
    return matchesStatus && matchesInstaller;
  });

  const tableProps = useDataTable<any>({
    data: filteredAppointments,
    defaultPageSize: 20,
  });

  const totalInstallationFees = filteredAppointments.reduce(
    (sum, a) => sum + (a.installationFee || 0),
    0
  );

  const getInstallerDisplay = (appt: any) => {
    if (appt.installerType === '水电工' && appt.installerContact) {
      return `水电工 - ${appt.installerContact.name}`;
    }
    return appt.installerType || '-';
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={STATUS_COLORS[status] || 'default'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">服务预约管理</h2>
          <p className="text-slate-500 mt-1">水暖安装、维修等预约管理</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-blue-500 hover:bg-blue-600">
          + 添加预约
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">总安装费</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalInstallationFees)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">待上门</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {filteredAppointments.filter((a) => a.status === '待上门').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredAppointments.filter((a) => a.status === '已完成').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>添加服务预约</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">联系人（可选）</label>
                <Select
                  value={formData.contactId}
                  onValueChange={(value) => setFormData({ ...formData, contactId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择联系人" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.primaryPhone ? `(${c.primaryPhone})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">项目（可选）</label>
                <Select
                  value={formData.projectId}
                  onValueChange={handleProjectChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择项目" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.entity?.name ? `(${p.entity.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">预约时间</label>
                <Input
                  type="datetime-local"
                  value={formData.appointmentDate}
                  onChange={(e) => setFormData({ ...formData, appointmentDate: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">服务类型</label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value) => setFormData({ ...formData, serviceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">安装人员</label>
                <Select
                  value={formData.installerType}
                  onValueChange={(value) => setFormData({ ...formData, installerType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择安装人员" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    {INSTALLER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.installerType === '水电工' && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">选择水电工</label>
                  <Select
                    value={formData.installerContactId}
                    onValueChange={(value) => setFormData({ ...formData, installerContactId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择水电工" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">无</SelectItem>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.primaryPhone ? `(${c.primaryPhone})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">状态</label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">安装费（可选）</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.installationFee}
                  onChange={(e) => setFormData({ ...formData, installationFee: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* 选择安装商品 */}
            {selectedProjectId !== '__none__' && (
              <div className="border rounded-lg p-4 bg-slate-50">
                <h4 className="font-medium text-slate-700 mb-3">选择要安装的商品（可多选）</h4>
                {projectOrders.length === 0 ? (
                  <p className="text-slate-500">该项目暂无订单</p>
                ) : (
                  <div className="space-y-4">
                    {projectOrders.map((order) => (
                      <div key={order.id} className="border rounded p-3 bg-white">
                        <div className="text-sm font-medium text-slate-700 mb-2">
                          订单号：{order.invoiceNo || order.writtenInvoiceNo || order.id.slice(0, 8)} 
                          <span className="text-slate-500 ml-2">{formatDate(order.saleDate)}</span>
                        </div>
                        <div className="space-y-2">
                          {order.items.map((item: any) => {
                            const isSelected = selectedItems.some(i => i.orderId === order.id && i.orderItemId === item.id);
                            const selectedItem = selectedItems.find(i => i.orderId === order.id && i.orderItemId === item.id);
                            return (
                              <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                                <div className="flex items-center gap-3">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleItemSelection(
                                      order.id,
                                      item.id,
                                      item.productId,
                                      item.product.name,
                                      item.quantity
                                    )}
                                  />
                                  <div>
                                    <div className="font-medium">{item.product.name}</div>
                                    <div className="text-sm text-slate-500">
                                      规格：{item.product.specification || '-'} 
                                      <span className="ml-2">购买数量：{item.quantity}</span>
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-500">安装数量：</span>
                                    <Input
                                      type="number"
                                      min={1}
                                      max={item.quantity}
                                      value={selectedItem?.quantity || 1}
                                      onChange={(e) => updateItemQuantity(order.id, item.id, parseInt(e.target.value) || 1)}
                                      className="w-20"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">备注</label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="可选"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddAppointment} className="bg-blue-500 hover:bg-blue-600">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="状态筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={installerTypeFilter} onValueChange={setInstallerTypeFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="安装人员" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部人员</SelectItem>
                {INSTALLER_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setInstallerTypeFilter('all');
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
            <div className="text-center py-8 text-slate-500">暂无预约记录</div>
          ) : (
            <div className="space-y-3">
              {tableProps.data.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 rounded-lg border bg-slate-50 border-slate-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appointment.status)}
                      <span className="font-medium text-slate-800">{appointment.serviceType}</span>
                      {appointment.installerType && (
                        <Badge variant="secondary">{getInstallerDisplay(appointment)}</Badge>
                      )}
                    </div>
                    {appointment.installationFee > 0 && (
                      <span className="font-bold text-orange-600">{formatCurrency(appointment.installationFee)}</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500">
                    {formatDateTime(appointment.appointmentDate)}
                    {appointment.contact && ` - ${appointment.contact.name}`}
                    {appointment.project && ` - ${appointment.project.name}`}
                  </div>
                  {appointment.items && appointment.items.length > 0 && (
                    <div className="mt-2 p-2 bg-white rounded border text-sm">
                      <div className="font-medium text-slate-700 mb-1">安装商品：</div>
                      <div className="text-slate-600">
                        {appointment.items.map((item: any, idx: number) => (
                          <span key={idx} className="mr-3">
                            {item.product.name} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {appointment.notes && (
                    <div className="text-sm text-slate-500 mt-1">备注：{appointment.notes}</div>
                  )}
                  <div className="flex items-center justify-end gap-2 mt-3">
                    {/* 状态快速切换 */}
                    {appointment.status === '待上门' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(appointment.id, '已上门')}
                        className="text-green-600 hover:text-green-800"
                      >
                        已上门
                      </Button>
                    )}
                    {appointment.status === '已上门' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(appointment.id, '已完成')}
                        className="text-green-600 hover:text-green-800"
                      >
                        完成
                      </Button>
                    )}
                    {appointment.status === '待返工' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleUpdateStatus(appointment.id, '已完成')}
                        className="text-green-600 hover:text-green-800"
                      >
                        完成
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAppointment(appointment.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      删除
                    </Button>
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
    </div>
  );
}
