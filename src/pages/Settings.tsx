import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';
import { SettingsService } from '@/services/SettingsService';
import type { SystemSetting } from '@/lib/types';
import * as XLSX from 'xlsx';

export function Settings() {
  const [settings, setSettings] = useState<SystemSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showBackupDialog, setShowBackupDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);
  const [rebuildingIndex, setRebuildingIndex] = useState(false);
  const [indexReport, setIndexReport] = useState<{
    totalFiles: number;
    totalDbRecords: number;
    missing: number;
    orphans: number;
  } | null>(null);
  const [idleTimeoutMinutes, setIdleTimeoutMinutes] = useState(5);
  const [lockPassword, setLockPassword] = useState('123456');
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [shopForm, setShopForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    loadData();
    loadApiUrl();
  }, []);

  const loadApiUrl = async () => {
    try {
      const result = await (window as any).electronAPI.api.getUrl();
      if (result.success) {
        setApiUrl(result.data.url);
      }
    } catch (error) {
      console.error('Failed to load API URL:', error);
    }
  };

  const loadData = async () => {
    try {
      const data = await SettingsService.getSettings();

      if (data) {
        setSettings(data);
        setShopForm({
          shopName: data.shopName,
          ownerName: data.ownerName || '',
          phone: data.phone || '',
          address: data.address || '',
        });
        setIdleTimeoutMinutes((data as any).idleTimeoutMinutes ?? 5);
        setLockPassword((data as any).lockPassword ?? '123456');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShopInfo = async () => {
    setSaving(true);
    try {
      await SettingsService.upsertSettings({
        shopName: shopForm.shopName,
        ownerName: shopForm.ownerName,
        phone: shopForm.phone,
        address: shopForm.address,
      });

      toast('店铺信息保存成功！', 'success');
      loadData();
    } catch (error) {
      console.error('Failed to save shop info:', error);
      toast('保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupData = async () => {
    setBackupLoading(true);
    try {
      const exportData = await SettingsService.backupData();

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `折柳建材数据备份_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupLoading(false);
      setShowBackupDialog(false);
      toast('数据备份成功！请保存好备份文件', 'success');
    } catch (error) {
      setBackupLoading(false);
      console.error('Failed to backup data:', error);
      toast('备份失败，请重试', 'error');
    }
  };

  const handleRestoreData = async (file: File) => {
    setRestoreLoading(true);
    try {
      const text = await file.text();
      const importData = JSON.parse(text);

      if (!importData.version || !importData.data) {
        throw new Error('无效的备份文件格式');
      }

      const confirmRestore = window.confirm(
        `即将恢复 ${new Date(importData.exportTime).toLocaleString()} 的备份数据。\n\n` +
        `是否确认恢复？这将覆盖当前所有数据！\n\n` +
        `提示：照片需要手动备份到 photos 文件夹`
      );

      if (!confirmRestore) {
        setRestoreLoading(false);
        return;
      }

      const data = importData.data;
      await SettingsService.restoreData(data);

      setRestoreLoading(false);
      setShowRestoreDialog(false);
      toast('数据恢复成功！请刷新页面查看数据', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      setRestoreLoading(false);
      console.error('Failed to restore data:', error);
      toast(`恢复失败: ${error.message}`, 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleRestoreData(file);
    }
  };

  const handleRebuildPhotoIndex = async () => {
    setRebuildingIndex(true);
    setIndexReport(null);
    try {
      const [scanResult, dbResult] = await Promise.all([
        (window as any).electronAPI.photo.scan(),
        (window as any).electronAPI.photo.getDbPaths(),
      ]);

      if (!scanResult.success || !dbResult.success) {
        throw new Error(scanResult.error || dbResult.error || '扫描失败');
      }

      const files = scanResult.data || [];
      const dbRecords: { id: string; photoPath: string }[] = [];

      const dbData = dbResult.data || {};
      for (const table of Object.keys(dbData)) {
        dbRecords.push(...dbData[table]);
      }

      const dbPathsSet = new Set<string>(dbRecords.map(r => r.photoPath));
      const filePathsSet = new Set<string>(files.map(f => f.relativePath as string));

      let missing = 0;
      let orphans = 0;

      for (const path of dbPathsSet) {
        if (!filePathsSet.has(path)) {
          missing++;
        }
      }

      for (const path of filePathsSet) {
        if (!dbPathsSet.has(path)) {
          orphans++;
        }
      }

      setIndexReport({
        totalFiles: files.length,
        totalDbRecords: dbRecords.length,
        missing,
        orphans,
      });

      if (missing === 0 && orphans === 0) {
        toast('照片索引完整，无需修复', 'success');
      } else if (missing > 0) {
        toast(`发现 ${missing} 条数据库记录缺少对应文件，请检查照片文件夹`, 'warning');
      } else {
        toast(`发现 ${orphans} 个孤立的照片文件，数据库无对应记录`, 'info');
      }
    } catch (error: any) {
      console.error('Failed to rebuild photo index:', error);
      toast(`扫描失败: ${error.message}`, 'error');
    } finally {
      setRebuildingIndex(false);
    }
  };

  const handleIdleTimeoutChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseInt(e.target.value);
    setIdleTimeoutMinutes(value);
    try {
      await SettingsService.updateIdleTimeout(value);
      if (value === 0) {
        toast('息屏锁定已关闭', 'success');
      } else {
        toast(`息屏锁定已设置为 ${value} 分钟`, 'success');
      }
    } catch (error) {
      console.error('Failed to save idle timeout:', error);
      toast('保存设置失败', 'error');
    }
  };

  const handlePasswordChange = async (newPassword: string) => {
    if (!newPassword.trim()) {
      toast('密码不能为空', 'warning');
      return;
    }
    setLockPassword(newPassword);
    try {
      await SettingsService.updateLockPassword(newPassword);
      toast('解锁密码已更新', 'success');
    } catch (error) {
      console.error('Failed to save password:', error);
      toast('保存密码失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-50">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-80">系统设置</h2>
        <p className="text-slate-500 mt-1">管理店铺信息和系统配置</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🏪 店铺信息</CardTitle>
          <CardDescription>设置店铺基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">店铺名称</label>
              <Input
                value={shopForm.shopName}
                onChange={(e) => setShopForm({ ...shopForm, shopName: e.target.value })}
                placeholder="请输入店铺名称"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">店主姓名</label>
              <Input
                value={shopForm.ownerName}
                onChange={(e) => setShopForm({ ...shopForm, ownerName: e.target.value })}
                placeholder="请输入店主姓名"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">联系电话</label>
              <Input
                value={shopForm.phone}
                onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                placeholder="请输入联系电话"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">店铺地址</label>
              <Input
                value={shopForm.address}
                onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                placeholder="请输入店铺地址"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleSaveShopInfo}
              disabled={saving}
            >
              {saving ? '保存中...' : '💾 保存设置'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>💾 数据管理</CardTitle>
          <CardDescription>备份和恢复数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium">一键备份</div>
              <div className="text-sm text-slate-500">导出所有数据为 JSON 文件</div>
            </div>
            <Button variant="outline" onClick={() => setShowBackupDialog(true)}>
              📥 备份数据
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium">一键恢复</div>
              <div className="text-sm text-slate-500">从 JSON 备份文件恢复数据</div>
            </div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              📤 恢复数据
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              style={{ display: 'none' }}
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-sm text-amber-800">
              <strong>💡 提示：</strong>照片文件需要单独备份到 photos 文件夹，恢复时请手动放回。
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium">重建照片索引</div>
              <div className="text-sm text-slate-500">扫描照片文件夹并检查数据库记录匹配情况</div>
            </div>
            <Button
              variant="outline"
              onClick={handleRebuildPhotoIndex}
              disabled={rebuildingIndex}
            >
              {rebuildingIndex ? '扫描中...' : '🔍 扫描'}
            </Button>
          </div>

          {indexReport && (
            <div className={`p-4 rounded-lg ${indexReport.missing === 0 && indexReport.orphans === 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="font-medium mb-2">📋 扫描报告</div>
              <div className="text-sm space-y-1">
                <div>📁 文件系统中照片: <strong>{indexReport.totalFiles}</strong> 张</div>
                <div>💾 数据库记录: <strong>{indexReport.totalDbRecords}</strong> 条</div>
                <div className="border-t pt-1 mt-1">
                  <div className={indexReport.missing > 0 ? 'text-red-600' : 'text-green-600'}>
                    ⚠️ 数据库有记录但文件缺失: <strong>{indexReport.missing}</strong> 条
                  </div>
                  <div className={indexReport.orphans > 0 ? 'text-orange-600' : 'text-green-600'}>
                    📤 文件存在但无数据库记录: <strong>{indexReport.orphans}</strong> 个
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium">数据库位置</div>
              <div className="text-sm text-slate-500 font-mono">prisma/dev.db</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🔒 安全设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium">息屏锁定</div>
              <div className="text-sm text-slate-500">无操作多少分钟后自动锁定屏幕</div>
            </div>
            <select
              value={idleTimeoutMinutes}
              onChange={handleIdleTimeoutChange}
              className="px-3 py-2 border rounded-lg bg-white text-sm"
            >
              <option value={1}>1 分钟</option>
              <option value={3}>3 分钟</option>
              <option value={5}>5 分钟</option>
              <option value={10}>10 分钟</option>
              <option value={15}>15 分钟</option>
              <option value={30}>30 分钟</option>
              <option value={0}>关闭</option>
            </select>
          </div>
          <p className="text-xs text-slate-400">
            启用后，系统将在指定时间无操作后自动锁定屏幕，需要输入密码解锁。
          </p>
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <div className="font-medium">解锁密码</div>
              <div className="text-sm text-slate-500">息屏后解锁需要输入的密码</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={lockPassword}
                onChange={(e) => setLockPassword(e.target.value)}
                onBlur={(e) => handlePasswordChange(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white text-sm w-32"
                placeholder="请输入密码"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📱 移动端访问</CardTitle>
          <CardDescription>局域网内手机访问设置</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-medium text-green-800 mb-1">🏠 局域网服务地址</div>
              {apiUrl ? (
                <div>
                  <div className="font-mono text-lg text-green-700 break-all">{apiUrl}</div>
                  <p className="text-xs text-green-600 mt-2">
                    💡 提示：请确保手机和电脑在同一 WiFi 下，手机浏览器访问此地址
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => navigator.clipboard.writeText(apiUrl)}
                  >
                    📋 复制地址
                  </Button>
                </div>
              ) : (
                <div className="text-slate-500">加载中...</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ℹ️ 系统信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">系统版本</span>
              <Badge>v1.0.0</Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">数据库</span>
              <Badge variant="secondary">SQLite</Badge>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-500">开发框架</span>
              <Badge variant="secondary">Electron + React</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认数据备份</DialogTitle>
            <DialogDescription>
              将导出所有数据到 JSON 文件
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              备份将包含：商品、客户、销售单、进货单、付款记录等所有数据。
            </p>
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ 注意：照片文件需要单独备份 photos 文件夹
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBackupDialog(false)}>
              取消
            </Button>
            <Button onClick={handleBackupData} disabled={backupLoading}>
              {backupLoading ? '备份中...' : '确认备份'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
