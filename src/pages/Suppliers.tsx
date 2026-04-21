import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatCurrency } from '@/lib/utils';
import { db } from '@/lib/db';
import { toast } from '@/components/Toast';
import type { Supplier, Contact } from '@/lib/types';

type SupplierWithRelations = Supplier & {
  supplierContact: Contact | null;
};

const filters = [
  { key: 'search', label: '关键词', type: 'text' as const, placeholder: '供应商名称/联系人/电话/地址...' },
];

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<SupplierWithRelations[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierWithRelations | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    contactId: '',
    phone: '',
    address: '',
    remark: '',
  });

  const [editFormData, setEditFormData] = useState({
    code: '',
    name: '',
    contactId: '',
    phone: '',
    address: '',
    remark: '',
  });

  useEffect(() => {
    loadContacts();
    loadData();
  }, []);

  useEffect(() => {
    if (showAddDialog) {
      loadContacts();
    }
  }, [showAddDialog]);

  useEffect(() => {
    if (showEditDialog) {
      loadContacts();
    }
  }, [showEditDialog]);

  useEffect(() => {
    if (!showAddDialog) {
      setFormData({
        code: '',
        name: '',
        contactId: '',
        phone: '',
        address: '',
        remark: '',
      });
    }
  }, [showAddDialog]);

  const loadContacts = async () => {
    try {
      const contactsData = await db.contact.findMany();
      setContacts(contactsData);
    } catch (error) {
      console.error('[Suppliers] 加载联系人失败:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const suppliersData = await db.supplier.findMany({
        include: {
          supplierContact: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      setSuppliers(suppliersData);
    } catch (error) {
      console.error('[Suppliers] 加载供应商失败:', error);
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

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      if (filterValues.search) {
        const search = filterValues.search.toLowerCase();
        const matchName = supplier.name.toLowerCase().includes(search);
        const matchCode = supplier.code.toLowerCase().includes(search);
        const matchContact = supplier.supplierContact?.name.toLowerCase().includes(search);
        const matchPhone = supplier.phone?.toLowerCase().includes(search);
        const matchAddress = supplier.address?.toLowerCase().includes(search);
        if (!matchName && !matchCode && !matchContact && !matchPhone && !matchAddress) {
          return false;
        }
      }
      return true;
    });
  }, [suppliers, filterValues]);

  const tableProps = useDataTable<SupplierWithRelations>({
    data: filteredSuppliers,
    defaultPageSize: 20,
  });

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast('请填写供应商名称', 'warning');
      return;
    }
    if (!formData.code.trim()) {
      toast('请填写供应商编码', 'warning');
      return;
    }

    try {
      const existing = await db.supplier.findFirst({
        where: { code: formData.code },
      });
      if (existing) {
        toast('供应商编码已存在', 'warning');
        return;
      }

      await db.supplier.create({
        data: {
          code: formData.code,
          name: formData.name,
          contactId: formData.contactId || null,
          phone: formData.phone || null,
          address: formData.address || null,
          remark: formData.remark || null,
        },
      });

      setShowAddDialog(false);
      loadData();
      toast('供应商创建成功', 'success');
    } catch (error) {
      console.error('[Suppliers] 创建供应商失败:', error);
      toast('操作失败，请重试', 'error');
    }
  };

  const handleOpenEdit = (supplier: SupplierWithRelations) => {
    setSelectedSupplier(supplier);
    setEditFormData({
      code: supplier.code,
      name: supplier.name,
      contactId: supplier.contactId || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      remark: supplier.remark || '',
    });
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!selectedSupplier) return;
    if (!editFormData.name.trim()) {
      toast('请填写供应商名称', 'warning');
      return;
    }

    try {
      const existing = await db.supplier.findFirst({
        where: {
          code: editFormData.code,
          NOT: { id: selectedSupplier.id },
        },
      });
      if (existing) {
        toast('供应商编码已存在', 'warning');
        return;
      }

      await db.supplier.update({
        where: { id: selectedSupplier.id },
        data: {
          code: editFormData.code,
          name: editFormData.name,
          contactId: editFormData.contactId || null,
          phone: editFormData.phone || null,
          address: editFormData.address || null,
          remark: editFormData.remark || null,
        },
      });

      setShowEditDialog(false);
      loadData();
      toast('供应商更新成功', 'success');
    } catch (error) {
      console.error('[Suppliers] 更新供应商失败:', error);
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
          <h2 className="text-2xl font-bold text-slate-800">供应商管理</h2>
          <p className="text-slate-500 mt-1">管理进货供应商信息</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          + 添加供应商
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
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>编码</TableHead>
                <TableHead>供应商名称</TableHead>
                <TableHead>联系人</TableHead>
                <TableHead>联系电话</TableHead>
                <TableHead>地址</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableProps.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    暂无供应商数据
                  </TableCell>
                </TableRow>
              ) : (
                tableProps.data.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-mono">{supplier.code}</TableCell>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.supplierContact?.name || '-'}</TableCell>
                    <TableCell>{supplier.phone || '-'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={supplier.address || ''}>
                      {supplier.address || '-'}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={supplier.remark || ''}>
                      {supplier.remark || '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(supplier)}>
                        编辑
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <div className="mt-4">
            <DataTablePagination
              pagination={{
                page: tableProps.page,
                pageSize: tableProps.pageSize,
                total: tableProps.total,
              }}
              onPageChange={tableProps.setPage}
              onPageSizeChange={tableProps.setPageSize}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>添加供应商</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">供应商编码 *</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="例如：GYS001"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">供应商名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入供应商名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">关联联系人</label>
              <Select value={formData.contactId || '__none__'} onValueChange={(v) => setFormData({ ...formData, contactId: v === '__none__' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择联系人（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} ({contact.primaryPhone || '无电话'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">联系电话</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入联系电话"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">地址</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="请输入地址"
              />
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
            <Button onClick={handleAdd}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑供应商</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">供应商编码 *</label>
              <Input
                value={editFormData.code}
                onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })}
                placeholder="例如：GYS001"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">供应商名称 *</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="请输入供应商名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">关联联系人</label>
              <Select value={editFormData.contactId || '__none__'} onValueChange={(v) => setEditFormData({ ...editFormData, contactId: v === '__none__' ? '' : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="选择联系人（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} ({contact.primaryPhone || '无电话'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">联系电话</label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                placeholder="请输入联系电话"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">地址</label>
              <Input
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                placeholder="请输入地址"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">备注</label>
              <Input
                value={editFormData.remark}
                onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })}
                placeholder="可选"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>取消</Button>
            <Button onClick={handleEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
