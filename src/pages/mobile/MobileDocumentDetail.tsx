import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/Toast';

// 从 localStorage 获取 API 基础 URL
const getApiBaseUrl = () => {
  return localStorage.getItem('mobile_api_base_url') || '';
};

interface DocumentPhoto {
  id: string;
  preview: string;
  remark?: string;
  type: string;
  isUploaded: boolean;
}

interface DocumentItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface DocumentDetail {
  id: string;
  type: 'sale' | 'purchase';
  invoiceNo?: string | null;
  date: string;
  partyName: string;
  amount: number;
  items: DocumentItem[];
}

export function MobileDocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<DocumentPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [error, setError] = useState('');
  const [remark, setRemark] = useState('');

  const loadDocument = async () => {
    if (!apiUrl || !id) {
      setError('请先设置 API 地址');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/api/document/${id}`);
      const data = await res.json();
      if (data.success) {
        setDoc(data.data);
      } else {
        setError(data.error || '加载失败');
      }
    } catch (e) {
      setError('连接 API 失败，请检查网络');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [apiUrl, id]);

  const handleSelectPhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newPhotos: DocumentPhoto[] = files.map(file => {
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
        // 将图片转换为 Base64
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

        // 上传
        const res = await fetch(`${apiUrl}/api/document/${id}/upload-photo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: base64Data,
            photoType: 'receipt',
            remark,
          }),
        });

        const data = await res.json();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">单据不存在</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* 顶部导航 */}
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          ← 返回
        </Button>
        <h2 className="text-xl font-bold text-slate-800">单据详情</h2>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {/* 单据基本信息 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {doc.type === 'sale' ? '销售单' : '进货单'}
            </CardTitle>
            <Badge variant={doc.type === 'sale' ? 'default' : 'secondary'}>
              {doc.type === 'sale' ? '销售单' : '进货单'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {doc.invoiceNo && (
            <div className="flex justify-between">
              <span className="text-slate-500 text-sm">单号</span>
              <span className="text-slate-800">{doc.invoiceNo}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500 text-sm">{doc.type === 'sale' ? '客户' : '供应商'}</span>
            <span className="text-slate-800">{doc.partyName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-sm">日期</span>
            <span className="text-slate-800">{new Date(doc.date).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100">
            <span className="text-slate-800 font-medium">总金额</span>
            <span className="text-orange-600 font-bold text-xl">¥{doc.amount.toLocaleString()}</span>
          </div>
        </CardContent>
      </Card>

      {/* 商品明细 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">商品明细</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {doc.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div>
                  <div className="text-slate-800 text-sm">{item.productName}</div>
                  <div className="text-xs text-slate-500">{item.quantity} × ¥{item.unitPrice}</div>
                </div>
                <div className="text-slate-800 font-medium text-sm">¥{item.subtotal}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 照片区域 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">照片</CardTitle>
            <Button
              size="sm"
              className="gap-1"
              onClick={handleSelectPhoto}
            >
              📷 添加照片
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              暂无照片，点击上方按钮添加
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map(photo => (
                <div key={photo.id} className="relative">
                  <img src={photo.preview} alt="照片" className="w-full h-24 object-cover rounded" />
                  <button
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    onClick={() => handleRemovePhoto(photo.id)}
                  >
                    ×
                  </button>
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

      {/* 备注 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">备注</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            placeholder="添加备注..."
            className="resize-none"
            rows={3}
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* 上传按钮 */}
      {photos.some(p => !p.isUploaded) && (
        <Button
          className="w-full"
          onClick={handleUpload}
          disabled={uploading}
        >
          {uploading ? '上传中...' : '上传照片'}
        </Button>
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
