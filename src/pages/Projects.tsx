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
import { ProjectService } from '@/services/ProjectService';
import { SaleDetail } from '@/components/sale-list/SaleDetail';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from '@/components/Toast';
import type { Entity, BizProject, SaleOrder } from '@/lib/types';

type BizProjectWithRelations = BizProject & {
  entity: Entity | null;
  orders?: SaleOrder[];
};

const statusOptions = [
  { value: '进行中', label: '进行中' },
  { value: '已完成', label: '已完成' },
  { value: '已暂停', label: '已暂停' },
  { value: '已取消', label: '已取消' },
];

const filters = [
  { key: 'status', label: '状态', type: 'select' as const, options: statusOptions },
  { key: 'search', label: '关键词', type: 'text' as const, placeholder: '项目名称/挂靠主体/地址...' },
];

export function Projects() {
  const [projects, setProjects] = useState<BizProjectWithRelations[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<BizProjectWithRelations | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [projectOrders, setProjectOrders] = useState<SaleOrder[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, { total: number; paid: number; count: number }>>({});
  const [viewLoading, setViewLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [showSaleDetail, setShowSaleDetail] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    entityId: '',
    address: '',
    status: '进行中',
    startDate: '',
    endDate: '',
    remark: '',
  });

  useEffect(() => {
    loadEntities();
    loadData();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      loadEntities();
    }
  }, [showAddDialog]);

  useEffect(() => {
    if (!showAddDialog) {
      setFormData({
        name: '',
        entityId: '',
        address: '',
        status: '进行中',
        startDate: '',
        endDate: '',
        remark: '',
      });
    }
  }, [showAddDialog]);

  const loadEntities = async () => {
    try {
      const entitiesData = await ProjectService.getEntities();
      setEntities(entitiesData);
    } catch (error) {
      console.error('[Projects] 加载主体失败:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const projectsData = await ProjectService.getProjects(undefined, { entity: true });

      const stats: Record<string, { total: number; paid: number; count: number }> = {};
      for (const project of projectsData) {
        const orders = await ProjectService.getOrdersByEntity(project.id);
        stats[project.id] = {
          total: orders.reduce((sum, o) => sum + o.totalAmount, 0),
          paid: orders.reduce((sum, o) => sum + o.paidAmount, 0),
          count: orders.length,
        };
      }

      setProjects(projectsData);
      setProjectStats(stats);
    } catch (error) {
      console.error('[Projects] 加载项目失败:', error);
      toast('加载数据失败，请刷新页面重试', 'error');
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

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (filterValues.status && project.status !== filterValues.status) {
        return false;
      }
      if (filterValues.search) {
        const search = filterValues.search.toLowerCase();
        const matchName = project.name.toLowerCase().includes(search);
        const matchEntity = project.entity?.name.toLowerCase().includes(search);
        const matchAddress = project.address?.toLowerCase().includes(search);
        if (!matchName && !matchEntity && !matchAddress) {
          return false;
        }
      }
      return true;
    });
  }, [projects, filterValues]);

  const tableProps = useDataTable<BizProjectWithRelations>({
    data: filteredProjects,
    defaultPageSize: 20,
  });

  const handleViewProject = async (project: BizProjectWithRelations) => {
    setViewLoading(true);
    setSelectedProject(project);
    try {
      const ordersData = await ProjectService.getOrdersByProject(project.id);
      setProjectOrders(ordersData);
      setShowDetailDialog(true);
    } catch (error) {
      console.error('[Projects] 加载项目详情失败:', error);
      toast('加载项目详情失败，请重试', 'error');
    } finally {
      setViewLoading(false);
    }
  };

  const handleViewOrder = (orderId: string) => {
    setShowDetailDialog(false);
    setSelectedSaleId(orderId);
    setShowSaleDetail(true);
  };

  const handleSaleDetailSuccess = () => {
    setShowSaleDetail(false);
    // 重新加载项目数据以更新统计
    loadData();
  };

  const handleAddProject = async () => {
    if (!formData.name || !formData.entityId) {
      toast('请填写必填项（项目名称、挂靠主体）', 'warning');
      return;
    }

    try {
      await ProjectService.createProject({
        name: formData.name,
        entityId: formData.entityId,
        address: formData.address || undefined,
        status: formData.status,
        startDate: formData.startDate ? new Date(formData.startDate) : undefined,
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        remark: formData.remark || undefined,
      });

      setShowAddDialog(false);
      setFormData({
        name: '',
        entityId: '',
        address: '',
        status: '进行中',
        startDate: '',
        endDate: '',
        remark: '',
      });
      loadData();
      toast('项目添加成功', 'success');

      await ProjectService.createAuditLog({
        actionType: 'CREATE',
        entityType: 'BizProject',
        entityId: 'new',
        newValue: JSON.stringify({ name: formData.name }),
      });
    } catch (error) {
      console.error('[Projects] 添加项目失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      await ProjectService.updateProject(projectId, { status: newStatus });
      loadData();
      toast('状态更新成功', 'success');
    } catch (error) {
      console.error('[Projects] 更新状态失败:', error);
      toast('更新失败，请重试', 'error');
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const stats = projectStats[projectId];
      if (stats && stats.count > 0) {
        toast(`该项目已关联 ${stats.count} 笔销售订单，无法删除`, 'warning');
        return;
      }

      const confirmed = window.confirm('确定要删除该项目吗？此操作不可恢复。');
      if (!confirmed) {
        return;
      }

      await ProjectService.deleteProject(projectId);
      loadData();
      toast('项目删除成功', 'success');
    } catch (error) {
      console.error('[Projects] 删除项目失败:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case '进行中':
        return <Badge className="bg-blue-500 hover:bg-blue-600">进行中</Badge>;
      case '已完成':
        return <Badge className="bg-green-500 hover:bg-green-600">已完成</Badge>;
      case '已暂停':
        return <Badge variant="destructive">已暂停</Badge>;
      case '已取消':
        return <Badge variant="secondary">已取消</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getOrderStatusDisplay = (order: SaleOrder) => {
    if (order.paidAmount >= order.totalAmount) {
      return { label: '已付款', variant: 'default' as const };
    } else if (order.paidAmount > 0) {
      return { label: '部分付款', variant: 'secondary' as const };
    } else {
      return { label: '未付款', variant: 'destructive' as const };
    }
  };

  const totalProjectAmount = filteredProjects.reduce((sum, p) => sum + (projectStats[p.id]?.total || 0), 0);
  const totalPaidAmount = filteredProjects.reduce((sum, p) => sum + (projectStats[p.id]?.paid || 0), 0);

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
          <h2 className="text-2xl font-bold text-slate-800">项目管理</h2>
          <p className="text-slate-500 mt-1">管理项目及项目关联的销售订单</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={() => setShowAddDialog(true)}>
          + 添加项目
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-slate-800">{filteredProjects.length}</div>
            <div className="text-sm text-slate-500">项目总数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {filteredProjects.filter((p) => p.status === '进行中').length}
            </div>
            <div className="text-sm text-slate-500">进行中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {filteredProjects.filter((p) => p.status === '已完成').length}
            </div>
            <div className="text-sm text-slate-500">已完成</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalProjectAmount)}</div>
            <div className="text-sm text-slate-500">项目总金额</div>
          </CardContent>
        </Card>
      </div>

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
                <TableHead>项目名称</TableHead>
                <TableHead>挂靠主体</TableHead>
                <TableHead>项目地址</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>开始日期</TableHead>
                <TableHead>订单数</TableHead>
                <TableHead className="text-right">项目金额</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-slate-500">
                    暂无项目数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((project) => (
                  <TableRow key={project.id} className="cursor-pointer hover:bg-slate-50" onClick={() => handleViewProject(project)}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>{project.entity?.name || '-'}</TableCell>
                    <TableCell className="text-slate-500 max-w-[150px] truncate">{project.address || '-'}</TableCell>
                    <TableCell>{getStatusBadge(project.status)}</TableCell>
                    <TableCell className="text-slate-500">
                      {project.startDate ? formatDate(project.startDate) : '-'}
                    </TableCell>
                    <TableCell className="font-mono">{projectStats[project.id]?.count || 0}</TableCell>
                    <TableCell className="text-right font-mono text-orange-600">
                      {formatCurrency(projectStats[project.id]?.total || 0)}
                    </TableCell>
                    <TableCell className="text-slate-500 max-w-[100px] truncate">{project.remark || '-'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleViewProject(project)}>
                          详情
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteProject(project.id)}
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

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加项目</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                项目名称 <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 龙湖天街水电工程"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                挂靠主体 <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.entityId || '__none__'}
                onValueChange={(v) => setFormData({ ...formData, entityId: v === '__none__' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择挂靠主体" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无</SelectItem>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name} ({entity.entityType === 'company' ? '公司' : entity.entityType === 'government' ? '政府' : '个人'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">项目地址</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="例如: XX市XX区XX路XX号"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">状态</label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">开始日期</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">结束日期</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">备注</label>
              <Input
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="可选"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddProject} className="bg-orange-500 hover:bg-orange-600">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>项目详情</DialogTitle>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">基本信息</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">项目名称:</span>
                      <span className="font-medium">{selectedProject.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">挂靠主体:</span>
                      <span>{selectedProject.entity?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">项目地址:</span>
                      <span>{selectedProject.address || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">项目状态:</span>
                      <span>{getStatusBadge(selectedProject.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">开始日期:</span>
                      <span>{selectedProject.startDate ? formatDate(selectedProject.startDate) : '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">结束日期:</span>
                      <span>{selectedProject.endDate ? formatDate(selectedProject.endDate) : '-'}</span>
                    </div>
                    {selectedProject.remark && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">备注:</span>
                        <span>{selectedProject.remark}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg">
                  <h4 className="font-medium mb-3">项目统计</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">关联订单:</span>
                      <span className="font-bold text-orange-600">{projectStats[selectedProject.id]?.count || 0} 笔</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">项目总额:</span>
                      <span className="font-bold">{formatCurrency(projectStats[selectedProject.id]?.total || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">已收款:</span>
                      <span className="text-green-600">{formatCurrency(projectStats[selectedProject.id]?.paid || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">待收款:</span>
                      <span className="text-red-600 font-bold">
                        {formatCurrency((projectStats[selectedProject.id]?.total || 0) - (projectStats[selectedProject.id]?.paid || 0))}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">快速操作</label>
                    <Select
                      value={selectedProject.status}
                      onValueChange={(v) => handleUpdateProjectStatus(selectedProject.id, v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">关联销售订单 ({projectOrders.length})</h4>
                {projectOrders.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                    暂无关联销售订单
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>单据号</TableHead>
                          <TableHead>日期</TableHead>
                          <TableHead>购货人</TableHead>
                          <TableHead>挂靠主体</TableHead>
                          <TableHead className="text-right">金额</TableHead>
                          <TableHead className="text-right">已付</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.invoiceNo || order.writtenInvoiceNo || order.id.substring(0, 8)}
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {formatDate(order.saleDate)}
                            </TableCell>
                            <TableCell>{order.buyer?.name || '-'}</TableCell>
                            <TableCell>{order.paymentEntity?.name || '-'}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(order.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {formatCurrency(order.paidAmount)}
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const statusDisplay = getOrderStatusDisplay(order);
                                return (
                                  <Badge variant={statusDisplay.variant}>
                                    {statusDisplay.label}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewOrder(order.id)}
                              >
                                查看详情
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {viewLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg">
            <div className="text-slate-500">加载中...</div>
          </div>
        </div>
      )}

      {/* 销售订单详情对话框 */}
      <Dialog open={showSaleDetail} onOpenChange={setShowSaleDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>销售订单详情</DialogTitle>
          </DialogHeader>
          <SaleDetail
            saleId={selectedSaleId}
            open={showSaleDetail}
            onOpenChange={setShowSaleDetail}
            onSuccess={handleSaleDetailSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}