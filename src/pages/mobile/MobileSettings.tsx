import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MobileApiService } from '@/services/MobileApiService';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

export function MobileSettings() {
  const navigate = useNavigate();
  const [cacheSize, setCacheSize] = useState<string>('计算中...');
  const [isClearing, setIsClearing] = useState(false);

  // 计算缓存大小
  useEffect(() => {
    const size = MobileApiService.getCacheSize();
    setCacheSize(MobileApiService.formatFileSize(size));
  }, []);

  // 清除缓存
  const handleClearCache = async () => {
    if (confirm('确定要清除所有缓存吗？')) {
      setIsClearing(true);
      try {
        MobileApiService.clearCache();
        // 重新计算缓存大小
        const newSize = MobileApiService.getCacheSize();
        setCacheSize(MobileApiService.formatFileSize(newSize));
        alert('缓存已清除！');
      } catch (e) {
        console.error('清除缓存失败', e);
        alert('清除缓存失败，请重试！');
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <MobilePageHeader title="设置" />

      <div className="px-4 py-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">缓存管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">当前缓存大小</span>
              <span className="font-medium">{cacheSize}</span>
            </div>
            <Button
              className="w-full"
              variant="destructive"
              onClick={handleClearCache}
              disabled={isClearing}
            >
              {isClearing ? '清除中...' : '清除所有缓存'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">API 设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              当前 API 地址：
            </p>
            <p className="text-sm font-medium break-all">
              {MobileApiService.getBaseUrl() || '未设置'}
            </p>
            <Link to="/mobile/pending-documents">
              <Button className="w-full" variant="outline">
                设置 API 地址
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">关于</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-slate-600">折柳建材管理系统</p>
            <p className="text-xs text-slate-400">移动端版本</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
