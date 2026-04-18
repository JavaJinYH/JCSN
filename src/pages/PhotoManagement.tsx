import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PhotoViewer } from '@/components/PhotoViewer';
import { PhotoThumbnail } from '@/components/PhotoThumbnail';
import { db } from '@/lib/db';
import { toast } from '@/components/Toast';
import dayjs from 'dayjs';

interface SalePhotoItem {
  id: string;
  photoPath: string;
  photoType: string | null;
  photoRemark: string | null;
  createdAt: string;
  _type: 'sale';
  sale?: {
    invoiceNo: string | null;
    saleDate: string;
    customer?: { name: string } | null;
  };
}

interface PurchasePhotoItem {
  id: string;
  photoPath: string;
  photoType: string | null;
  photoRemark: string | null;
  createdAt: string;
  _type: 'purchase';
  purchase?: {
    purchaseDate: string;
    supplier: string | null;
    product?: { name: string } | null;
  };
}

type PhotoItem = SalePhotoItem | PurchasePhotoItem;

export function PhotoManagement() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });
  const [photoType, setPhotoType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const [salePhotos, purchasePhotos] = await Promise.all([
        db.salePhoto.findMany({
          include: { sale: { include: { customer: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        db.purchasePhoto.findMany({
          include: { purchase: { include: { product: true } } },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const allPhotos: PhotoItem[] = [
        ...salePhotos.map((p) => ({ ...p, _type: 'sale' as const })),
        ...purchasePhotos.map((p) => ({ ...p, _type: 'purchase' as const })),
      ];

      setPhotos(allPhotos);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPhotos = photos.filter((photo) => {
    const matchesDateStart =
      !dateRange.start || dayjs(photo.createdAt).isAfter(dayjs(dateRange.start).subtract(1, 'day'));
    const matchesDateEnd =
      !dateRange.end || dayjs(photo.createdAt).isBefore(dayjs(dateRange.end).add(1, 'day'));

    const matchesType = photoType === 'all' || photo._type === photoType;

    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      (photo as any).sale?.invoiceNo?.toLowerCase().includes(searchLower) ||
      (photo as any).purchase?.supplier?.toLowerCase().includes(searchLower) ||
      photo.photoRemark?.toLowerCase().includes(searchLower);

    return matchesDateStart && matchesDateEnd && matchesType && matchesSearch;
  });

  const toggleSelectPhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const selectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  const handleExport = async () => {
    if (selectedPhotos.size === 0) {
      toast('请先选择要导出的照片', 'warning');
      return;
    }

    try {
      setExporting(true);
      const photosToExport = filteredPhotos.filter((p) => selectedPhotos.has(p.id));
      const dateStr = dayjs().format('YYYYMMDD');
      const result = await (window as any).electronAPI.photo.export(
        photosToExport.map((p) => ({
          photoPath: p.photoPath,
          photoRemark: p.photoRemark,
          photoType: p.photoType,
        })),
        `photos_export_${dateStr}.zip`
      );

      if (result.success) {
        toast(`导出成功！共导出 ${result.data.count} 张照片`, 'success');
      } else {
        toast(`导出失败: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast('导出失败，请重试', 'error');
    } finally {
      setExporting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
      <div>
        <h2 className="text-2xl font-bold text-slate-800">照片管理</h2>
        <p className="text-slate-500 mt-1">管理所有业务单据照片，支持批量导出</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">筛选条件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm text-slate-500 mb-1 block">开始日期</label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">结束日期</label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">单据类型</label>
              <select
                className="w-full h-10 px-3 border rounded-md bg-white"
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value)}
              >
                <option value="all">全部</option>
                <option value="sale">销售单</option>
                <option value="purchase">进货单</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-500 mb-1 block">搜索备注</label>
              <Input
                placeholder="搜索备注..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDateRange({ start: '', end: '' });
                  setPhotoType('all');
                  setSearchTerm('');
                }}
              >
                重置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-500">
            共 {filteredPhotos.length} 张照片，已选择 {selectedPhotos.size} 张
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={selectAll}>
            {selectedPhotos.size === filteredPhotos.length ? '取消全选' : '全选'}
          </Button>
          <Button onClick={handleExport} disabled={selectedPhotos.size === 0 || exporting}>
            {exporting ? '导出中...' : `导出照片 (${selectedPhotos.size})`}
          </Button>
        </div>
      </div>

      {filteredPhotos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-slate-500">暂无照片</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredPhotos.map((photo, index) => (
            <div key={photo.id} className="relative">
              <PhotoThumbnail
                photo={photo}
                onClick={() => {
                  setViewerIndex(index);
                  setViewerOpen(true);
                }}
              />
              <div
                className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  selectedPhotos.has(photo.id)
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/80 text-slate-400 hover:bg-orange-100'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelectPhoto(photo.id);
                }}
              >
                {selectedPhotos.has(photo.id) ? '✓' : ''}
              </div>
              <div className="mt-1">
                <Badge variant={photo._type === 'sale' ? 'default' : 'secondary'} className="text-xs">
                  {photo._type === 'sale' ? '销售单' : '进货单'}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1 truncate">
                {dayjs(photo.createdAt).format('YYYY-MM-DD')}
              </p>
            </div>
          ))}
        </div>
      )}

      {filteredPhotos.length > 0 && (
        <PhotoViewer
          photos={filteredPhotos as any}
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          initialIndex={viewerIndex}
        />
      )}
    </div>
  );
}