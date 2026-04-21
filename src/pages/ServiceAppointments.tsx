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
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { ServiceAppointmentService } from '@/services/ServiceAppointmentService';
import { ContactService } from '@/services/ContactService';
import { ProjectService } from '@/services/ProjectService';
import { ProductService } from '@/services/ProductService';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';

const SERVICE_TYPES = ['水暖安装', '维修', '其他'];
const INSTALLERS = ['店主', '水电工'];
const STATUS_OPTIONS = ['待上门', '已上门', '待返工', '已完成'];
const STATUS_COLORS: Record<string, 'success' | 'warning' | 'default' | 'destructive' | 'outline' | 'secondary'> = {
  '待上门': 'secondary',
  '已上门': 'success',
  '待返工': 'warning',
  '已完成': 'default',
};

export function ServiceAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [installerFilter, setInstallerFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    contactId: '__none__',
    productId: '__none__',
    appointmentDate: new Date().toISOString().slice(0, 16),
    serviceType: '水暖安装',
    installer: '__none__',
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
      const [contactsData, productsData] = await Promise.all([
        ContactService.getContacts(),
        ProductService.getProducts(),
      ]);
      setContacts(contactsData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load references:', error);
    }
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
      const productId = formData.productId === '__none__' ? undefined : formData.productId;
      const installer = formData.installer === '__none__' ? undefined : formData.installer;

      await ServiceAppointmentService.createAppointment({
        contactId,
        productId,
        appointmentDate: new Date(formData.appointmentDate),
        serviceType: formData.serviceType,
        installer,
        status: formData.status,
        notes: formData.notes || undefined,
        installationFee: formData.installationFee ? parseFloat(formData.installationFee) : undefined,
      });

      setShowAddDialog(false);
      setFormData({
        contactId: '__none__',
        productId: '__none__',
        appointmentDate: new Date().toISOString().slice(0, 16),
        serviceType: '水暖安装',
        installer: '__none__',
        status: '待上门',
        notes: '',
        installationFee: '',
      });
      loadData();
      toast('服务预约添加成功', 'success');
    } catch (error) {
      console.error('Failed to add appointment:', error);
      toast('添加失败，请重试', 'error');
    }
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
    const matchesInstaller =
      installerFilter === 'all' || appt.installer === installerFilter;
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

      {showAddDialog && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>添加服务预约</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">商品（可选）</label>
                <Select
                  value={formData.productId}
                  onValueChange={(value) => setFormData({ ...formData, productId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择商品" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
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
                <label className="text-sm font-medium text-slate-700 mb-1 block">安装人员（可选）</label>
                <Select
                  value={formData.installer}
                  onValueChange={(value) => setFormData({ ...formData, installer: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择安装人员" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">无</SelectItem>
                    {INSTALLERS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">备注</label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                取消
              </Button>
              <Button onClick={handleAddAppointment} className="bg-blue-500 hover:bg-blue-600">
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
            <Select value={installerFilter} onValueChange={setInstallerFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="安装人员" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部人员</SelectItem>
                {INSTALLERS.map((i) => (
                  <SelectItem key={i} value={i}>
                    {i}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setInstallerFilter('__none__');
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
                  className="flex items-center justify-between p-4 rounded-lg border bg-slate-50 border-slate-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(appointment.status)}
                      <span className="font-medium text-slate-800">{appointment.serviceType}</span>
                      {appointment.installer && (
                        <Badge variant="secondary">{appointment.installer}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-slate-500 mt-1">
                      {new Date(appointment.appointmentDate).toLocaleString('zh-CN')}
                      {appointment.contact && ` - ${appointment.contact.name}`}
                      {appointment.product && ` - ${appointment.product.name}`}
                    </div>
                    {appointment.notes && (
                      <div className="text-sm text-slate-500 mt-1">{appointment.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {appointment.installationFee > 0 && (
                      <span className="font-bold text-orange-600">{formatCurrency(appointment.installationFee)}</span>
                    )}
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
