import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/Toast';
import { MobileApiService, useMobileApi } from '@/services/MobileApiService';
import { MobilePageHeader, MobileLoadingState, MobileEmptyState, MobileSectionTitle } from '@/components/mobile/MobilePageHeader';

const formatCurrency = (amount: number) => {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface PurchaseItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  product?: {
    name: string;
    specification?: string;
  };
}

interface PurchasePhoto {
  id: string;
  photoPath: string;
  photoType?: string;
  photoRemark?: string;
}

interface PurchaseOrder {
  id: string;
  internalSeq?: number;
  invoiceNo?: string;
  supplierId?: string;
  supplierName?: string;
  purchaseDate: string;
  totalAmount: number;
  itemCount?: number;
  paidAmount?: number;
  status?: string;
  remark?: string;
  supplier?: {
    name: string;
    phone?: string;
  };
  items: PurchaseItem[];
  photos?: PurchasePhoto[];
}

interface PhotoItem {
  id: string;
  preview: string;
  remark?: string;
  type: string;
  isUploaded: boolean;
  isExisting?: boolean;
}

export function MobilePurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [purchase, setPurchase] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [remark, setRemark] = useState('');
  const { apiUrl } = useMobileApi();

  const loadData = async () => {
    if (!apiUrl || !id) {
      setError('请先在"待拍照"页面设置 API 地址');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await MobileApiService.getPurchaseById(id, false);
      if (res.success && res.data) {
        setPurchase(res.data);
        setIsCached(res.isCached || false);
        if (res.isCached) {
          setError('显示缓存数据，请连接 WiFi 查看最新');
        } else {
          setError('');
        }
        // 加载已有照片
        if (res.data.photos && res.data.photos.length > 0) {
          setPhotos(res.data.photos.map((p: PurchasePhoto) => ({
            id: p.id,
            preview: MobileApiService.getPhotoUrl(p.photoPath),
            type: p.photoType || 'receipt',
            remark: p.photoRemark,
            isUploaded: true,
            isExisting: true,
          })));
        }
      } else {
        setError(res.error || '进货单不存在');
        setPurchase(null);
      }
    } catch (e) {
      setError('连接 API 失败，请检查网络');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiUrl && id) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [apiUrl, id]);

  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos: PhotoItem[] = files.map(file => {
      const preview = URL.createObjectURL(file);
      return {
        id: `temp_${Date.now()}_${Math.random()}`,
        preview,
        type: 'receipt',
        isUploaded: false,
      };
    });

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleRemovePhoto = (photoId: string) => {
    const photo = photos.find(p => p.id === photoId);
    if (photo?.isExisting) {
      toast('已有照片无法删除', 'warning');
      return;
    }
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  const handleUpload = async () => {
    if (!apiUrl || !id) {
      toast('请先设置 API 地址', 'warning');
      return;
    }

    const toUpload = photos.filter(p => !p.isUploaded);
    if (toUpload.length === 0) {
      toast('没有新照片需要上传', 'warning');
      return;
    }

    setUploading(true);
    let successCount = 0;

    try {
      for (const photo of toUpload) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          const img = new Image();
          img.src = photo.preview;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('无法处理图片'));
              return;
            }
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve(dataUrl);
          };
          img.onerror = () => reject(new Error('图片加载失败'));
        });

        const data = await MobileApiService.uploadPhoto(id, base64Data, 'receipt', remark);
        if (data.success) {
          successCount++;
        } else {
          toast(`上传失败: ${data.error}`, 'error');
        }
      }

      if (successCount > 0) {
        toast(`成功上传 ${successCount} 张照片`, 'success');
        setPhotos(prev => prev.map(p => ({ ...p, isUploaded: true })));
      }
    } catch (e) {
      toast('上传失败，请检查网络', 'error');
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  if (!apiUrl) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="进货详情" subtitle="查看进货记录（只读）" />
        <div className="p-4 space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">📱 请先设置 API</h3>
            <p className="text-xs text-blue-700 mb-3">请先在"待拍照"页面设置 API 地址，才能查看数据</p>
            <Button className="w-full" onClick={() => navigate('/mobile/pending-documents')}>
              去设置
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="进货详情" subtitle="查看进货记录（只读）" />
        <MobileLoadingState />
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MobilePageHeader title="进货详情" subtitle="查看进货记录（只读）" />
        <MobileEmptyState message="进货单不存在" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <MobilePageHeader
        title="进货详情"
        subtitle="查看进货记录"
        onRefresh={loadData}
      />

      {error && !isCached && (
        <div className="px-4 -mt-2">
          <div className="text-red-500 text-sm p-2 bg-red-50 rounded">{error}</div>
        </div>
      )}
      {isCached && (
        <div className="px-4 -mt-2">
          <div className="text-amber-600 text-sm p-2 bg-amber-50 rounded">⚠️ {error}</div>
        </div>
      )}

      {/* 基本信息卡片 */}
      <div className="p-4">
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold text-lg">{purchase.supplier?.name || purchase.supplierName || '供应商'}</div>
                <div className="text-sm text-slate-500">
                  {new Date(purchase.purchaseDate).toLocaleDateString('zh-CN')}
                </div>
                {purchase.internalSeq && (
                  <div className="text-xs text-slate-400 mt-1">
                    进货单号: #{purchase.internalSeq}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(purchase.totalAmount || 0)}
                </div>
              </div>
            </div>

            {purchase.status && (
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-100 text-green-700">
                  {purchase.status === 'completed' ? '已完成' : purchase.status}
                </Badge>
                {purchase.itemCount && (
                  <Badge variant="outline">
                    {purchase.itemCount} 种商品
                  </Badge>
                )}
              </div>
            )}

            {purchase.remark && (
              <div className="text-sm text-slate-600 p-2 bg-slate-50 rounded">
                备注：{purchase.remark}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 商品明细 */}
      {purchase.items && purchase.items.length > 0 && (
        <div className="px-4">
          <MobileSectionTitle>商品明细（{purchase.items.length} 种）</MobileSectionTitle>
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {purchase.items.map((item, index) => (
                  <div key={item.id || index} className="flex justify-between items-start border-b border-slate-200 pb-3 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <div className="font-medium">{item.product?.name || '商品'}</div>
                      {item.product?.specification && (
                        <div className="text-xs text-slate-500 mt-0.5">
                          规格：{item.product.specification}
                        </div>
                      )}
                      <div className="text-sm text-slate-500 mt-1">
                        数量: {item.quantity} × {formatCurrency(item.unitPrice)}
                      </div>
                    </div>
                    <div className="font-bold text-blue-600">
                      {formatCurrency(item.totalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 照片区域 - 添加拍照功能 */}
      <div className="px-4 pt-4">
        <MobileSectionTitle>照片（{photos.length} 张）</MobileSectionTitle>
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-end mb-3">
              <Button size="sm" className="gap-1" onClick={handleSelectPhoto}>
                📷 添加照片
              </Button>
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                暂无照片，点击上方按钮添加
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map(photo => (
                  <div key={photo.id} className="relative">
                    <img src={photo.preview} alt="照片" className="w-full h-24 object-cover rounded" />
                    {!photo.isExisting && (
                      <button
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        onClick={() => handleRemovePhoto(photo.id)}
                      >
                        ×
                      </button>
                    )}
                    {!photo.isUploaded && (
                      <Badge className="absolute bottom-1 right-1 bg-orange-500 text-white text-xs">
                        待上传
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 备注 */}
      <div className="px-4 pt-4">
        <Card>
          <CardContent className="pt-4">
            <Textarea
              placeholder="添加备注..."
              className="resize-none"
              rows={2}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* 上传按钮 */}
      {photos.some(p => !p.isUploaded) && (
        <div className="fixed bottom-20 left-4 right-4">
          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? '上传中...' : `上传 ${photos.filter(p => !p.isUploaded).length} 张照片`}
          </Button>
        </div>
      )}

      {/* 隐藏的 file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
