import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/Combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContactService } from '@/services/ContactService';
import { toast } from '@/components/Toast';
import { recordFrequency } from '@/lib/frequency';
import type { Contact } from '@/lib/types';

interface SaleContactSelectProps {
  contacts: Contact[];
  entities: { id: string; name: string }[];
  selectedBuyer: string;
  selectedIntroducer: string;
  pickerName: string;
  pickerPhone: string;
  onSelectedBuyerChange: (value: string) => void;
  onSelectedIntroducerChange: (value: string) => void;
  onPickerNameChange: (value: string) => void;
  onPickerPhoneChange: (value: string) => void;
  onContactsChange: (contacts: Contact[]) => void;
}

export function SaleContactSelect({
  contacts,
  entities,
  selectedBuyer,
  selectedIntroducer,
  pickerName,
  pickerPhone,
  onSelectedBuyerChange,
  onSelectedIntroducerChange,
  onPickerNameChange,
  onPickerPhoneChange,
  onContactsChange,
}: SaleContactSelectProps) {
  const [showBuyerDialog, setShowBuyerDialog] = useState(false);
  const [newBuyer, setNewBuyer] = useState({
    name: '',
    primaryPhone: '',
    address: '',
    remark: '',
    contactType: 'customer',
  });

  const contactOptions = contacts.map(c => ({
    value: c.id,
    label: `${c.name} (${c.primaryPhone || '无电话'})`,
  }));

  const entityOptions = entities.map(e => ({
    value: e.id,
    label: e.name,
  }));

  const handleAddBuyer = async () => {
    if (!newBuyer.name.trim()) {
      toast('请输入联系人姓名', 'warning');
      return;
    }
    if (!newBuyer.primaryPhone.trim()) {
      toast('请输入手机号', 'warning');
      return;
    }

    try {
      const existing = await ContactService.findContactByPhone(newBuyer.primaryPhone.trim());
      if (existing) {
        toast('该手机号已被使用', 'warning');
        return;
      }

      const contactCount = await ContactService.countContacts();
      const newCode = `C${String(contactCount + 1).padStart(3, '0')}`;

      const contact = await ContactService.createContact({
        name: newBuyer.name.trim(),
        primaryPhone: newBuyer.primaryPhone.trim(),
        address: newBuyer.address.trim() || undefined,
        remark: newBuyer.remark.trim() || undefined,
        contactType: newBuyer.contactType,
        code: newCode,
      });

      onContactsChange([...contacts, contact]);
      onSelectedBuyerChange(contact.id);
      setShowBuyerDialog(false);
      setNewBuyer({ name: '', primaryPhone: '', address: '', remark: '', contactType: 'customer' });
      toast('添加成功', 'success');
    } catch (error) {
      console.error('[SaleContactSelect] 添加联系人失败:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">联系人信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Combobox
                value={selectedBuyer === '__none__' ? '' : selectedBuyer}
                onValueChange={(v) => {
                  onSelectedBuyerChange(v || '__none__');
                  if (v) recordFrequency('contact', v);
                }}
                options={contactOptions}
                placeholder="选择联系人（散客可跳过）"
                emptyText="没有找到匹配的联系人"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowBuyerDialog(true)}
            >
              + 新联系人
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-slate-600 mb-3">销售单角色（可选）</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">介绍人</label>
                <Combobox
                  value={selectedIntroducer === '__none__' ? '' : selectedIntroducer}
                  onValueChange={(v) => onSelectedIntroducerChange(v || '__none__')}
                  options={contactOptions}
                  placeholder="选择介绍人（可不选）"
                  emptyText="没有找到匹配的联系人"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">提货人姓名</label>
                <Input
                  placeholder="提货人姓名"
                  value={pickerName}
                  onChange={(e) => onPickerNameChange(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">提货人电话</label>
                <Input
                  placeholder="提货人电话"
                  value={pickerPhone}
                  onChange={(e) => onPickerPhoneChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showBuyerDialog} onOpenChange={setShowBuyerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新联系人</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                姓名 <span className="text-red-500">*</span>
              </label>
              <Input
                value={newBuyer.name}
                onChange={(e) => setNewBuyer({ ...newBuyer, name: e.target.value })}
                placeholder="输入联系人姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                手机号 <span className="text-red-500">*</span>
              </label>
              <Input
                value={newBuyer.primaryPhone}
                onChange={(e) => setNewBuyer({ ...newBuyer, primaryPhone: e.target.value })}
                placeholder="输入手机号（唯一标识）"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">联系人类型</label>
              <Select value={newBuyer.contactType} onValueChange={(v) => setNewBuyer({ ...newBuyer, contactType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">客户</SelectItem>
                  <SelectItem value="plumber">水电工</SelectItem>
                  <SelectItem value="company">装修公司</SelectItem>
                  <SelectItem value="other">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">地址</label>
              <Input
                value={newBuyer.address}
                onChange={(e) => setNewBuyer({ ...newBuyer, address: e.target.value })}
                placeholder="输入地址（可选）"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">备注</label>
              <Input
                value={newBuyer.remark}
                onChange={(e) => setNewBuyer({ ...newBuyer, remark: e.target.value })}
                placeholder="输入备注（可选）"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowBuyerDialog(false)}
              >
                取消
              </Button>
              <Button onClick={handleAddBuyer}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
