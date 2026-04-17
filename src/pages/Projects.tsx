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
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { toast } from '@/components/Toast';
import { useNavigate } from 'react-router-dom';
import type { Project, Customer, Sale, SaleItem, Payment } from '@/lib/types';

type ProjectWithRelations = Project & {
  customer: Customer | null;
  sales?: SaleWithDetails[];
};

type SaleWithDetails = Sale & {
  customer: Customer | null;
  project: Project | null;
  items: (SaleItem & { product: any })[];
  payments: Payment[];
};

interface ProjectStats {
  total: number;
  paid: number;
  count: number;
}

const statusOptions = [
  { value: '进行中', label: '进行中' },
  { value: '已完成', label: '已完成' },
  { value: '已暂停', label: '已暂停' },
  { value: '已取消', label: '已取消' },
];

const filters = [
  { key: 'status', label: '状态', type: 'select' as const, options: statusOptions },
  { key: 'search', label: '关键词', type: 'text' as const, placeholder: '项目名称/客户/地址...' },
];

export function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectWithRelations[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithRelations | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [projectSales, setProjectSales] = useState<SaleWithDetails[]>([]);
  const [projectStats, setProjectStats] = useState<Record<string, ProjectStats>>({});
  const [viewLoading, setViewLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    name: '',
    customerId: '' as string | undefined,
    address: '',
    status: '进行中',
    startDate: '',
    endDate: '',
    remark: '',
  });

  useEffect(() => {
    loadCustomers();
    loadData();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      loadCustomers();
    }
  }, [showAddDialog]);

  const loadCustomers = async () => {
    try {
      const customersData = await db.customer.findMany({
        orderBy: { name: 'asc' },
      });
      setCustomers(customersData);
    } catch (error) {
      console.error('[Projects] 加载客户失败:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const projectsData = await db.project.findMany({
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      });

      const stats: Record<string, ProjectStats> = {};
      for (const project of projectsData) {
        const sales = await db.sale.findMany({
          where: { projectId: project.id },
          select: { totalAmount: true, paidAmount: true },
        });
        stats[project.id] = {
          total: sales.reduce((sum, s) => sum + s.totalAmount, 0),
          paid: sales.reduce((sum, s) => sum + s.paidAmount, 0),
          count: sales.length,
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
        const matchCustomer = project.customer?.name.toLowerCase().includes(search);
        const matchAddress = project.address?.toLowerCase().includes(search);
        if (!matchName && !matchCustomer && !matchAddress) {
          return false;
        }
      }
      return true;
    });
  }, [projects, filterValues]);

  const tableProps = useDataTable<ProjectWithRelations>({
    data: filteredProjects,
    defaultPageSize: 20,
  });

  const handleViewProject = async (project: ProjectWithRelations) => {
    setViewLoading(true);
    setSelectedProject(project);
    try {
      const salesData = await db.sale.findMany({
        where: { projectId: project.id },
        include: {
          customer: true,
          project: true,
          items: { include: { product: true } },
          payments: true,
        },
        orderBy: { saleDate: 'desc' },
      });
      setProjectSales(salesData);
      setShowDetailDialog(true);
    } catch (error) {
      console.error('[Projects] 加载项目详情失败:', error);
      toast('加载项目详情失败，请重试', 'error');
    } finally {
      setViewLoading(false);
    }
  };

  const handleViewSale = (saleId: string) => {
    setShowDetailDialog(false);
    navigate(`/sales?saleId=${saleId}`);
  };

  const handleAddProject = async () => {
    if (!formData.name || !formData.customerId) {
      toast('请填写必填项（项目名称、关联客户）', 'warning');
      return;
    }

    try {
      await db.project.create({
        data: {
          name: formData.name,
          customerId: formData.customerId,
          address: formData.address || null,
          status: formData.status,
          startDate: formData.startDate ? new Date(formData.startDate) : null,
          endDate: formData.endDate ? new Date(formData.endDate) : null,
          remark: formData.remark || null,
        },
      });

      setShowAddDialog(false);
      setFormData({
        name: '',
        customerId: undefined,
        address: '',
        status: '进行中',
        startDate: '',
        endDate: '',
        remark: '',
      });
      loadData();
      toast('项目添加成功', 'success');

      await db.auditLog.create({
        data: {
          actionType: 'CREATE',
          entityType: 'Project',
          entityId: 'new',
          newValue: JSON.stringify({ name: formData.name }),
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('[Projects] 添加项目失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleUpdateProjectStatus = async (projectId: string, newStatus: string) => {
    try {
      await db.project.update({
        where: { id: projectId },
        data: { status: newStatus },
      });
      loadData();
      toast('状态更新成功', 'success');
    } catch (error) {
      console.error('[Projects] 更新状态失败:', error);
      toast('更新失败，请重试', 'error');
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
          <p className="text-slate-500 mt-1">管理客户项目及项目关联的销售订单</p>
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
                <TableHead>关联客户</TableHead>
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
                    <TableCell>{project.customer?.name || '-'}</TableCell>
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
                      <Button variant="ghost" size="sm" onClick={() => handleViewProject(project)}>
                        详情
                      </Button>
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
                placeholder="例如: 阳光小区水管改造"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                关联客户 <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.customerId || '__none__'}
                onValueChange={(v) => setFormData({ ...formData, customerId: v === '__none__' ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择客户" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">请选择客户</SelectItem>
                  {customers.length === 0 ? (
                    <div className="p-2 text-sm text-slate-500">暂无客户，请先添加客户</div>
                  ) : (
                    customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </SelectItem>
                    ))
                  )}
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
                      <span className="text-slate-500">关联客户:</span>
                      <span>{selectedProject.customer?.name || '-'}</span>
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
                <h4 className="font-medium mb-3">关联销售订单 ({projectSales.length})</h4>
                {projectSales.length === 0 ? (
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
                          <TableHead>客户</TableHead>
                          <TableHead className="text-right">金额</TableHead>
                          <TableHead className="text-right">已付</TableHead>
                          <TableHead>状态</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectSales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-mono text-sm">
                              {sale.invoiceNo || sale.writtenInvoiceNo || sale.id.substring(0, 8)}
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm">
                              {formatDate(sale.saleDate)}
                            </TableCell>
                            <TableCell>{sale.customer?.name || '-'}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(sale.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-600">
                              {formatCurrency(sale.paidAmount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={sale.status === 'completed' ? 'default' : 'secondary'}>
                                {sale.status === 'completed' ? '已完成' : sale.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewSale(sale.id)}
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
    </div>
  );
}