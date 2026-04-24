import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/Toast';
import { MobileApiService, PendingDocument } from '@/services/MobileApiService';

export function MobilePendingDocuments() {
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'purchase'>('all');
  const [apiUrl, setApiUrl] = useState(MobileApiService.getBaseUrl() || '');
  const [error, setError] = useState('');
  const [isCached, setIsCached] = useState(false);

  const loadDocuments = async (): Promise<void> => {
    if (!apiUrl) {
      setError('请先设置 API 地址');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await MobileApiService.getPendingDocuments();
      if (data.success) {
        setDocuments(data.data || []);
        setIsCached(data.isCached || false);
        if (data.isCached) {
          toast('显示缓存数据，请连接WiFi查看最新', 'info');
        }
        setError('');
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
    loadDocuments();
  }, [apiUrl]);

  const handleSaveApiUrl = (): void => {
    MobileApiService.setBaseUrl(apiUrl);
    setError('');
    loadDocuments();
  };

  const handleRefresh = (): void => {
    loadDocuments();
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesSearch = !searchTerm ||
      doc.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    return matchesType && matchesSearch;
  });

  // 网络状态显示
  const isOnline = MobileApiService.isOnline();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  if (!apiUrl) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">设置 API 地址</h2>
          <p className="text-slate-500 text-sm mt-1">请输入主电脑的局域网地址</p>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="例如: http://192.168.1.100:3456"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
          />
          <Button onClick={handleSaveApiUrl}>保存</Button>
        </div>
        {error && <div className="text-red-500">{error}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">待拍照单据</h2>
          <p className="text-slate-500 text-sm mt-1">选择单据进行拍照上传</p>
        </div>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <Badge className="bg-amber-100 text-amber-700">📴 离线模式</Badge>
          )}
          {isCached && (
            <Badge className="bg-blue-100 text-blue-700">💾 缓存数据</Badge>
          )}
        </div>
      </div>

      {/* API 地址管理 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">API 地址</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Input
              placeholder="例如: http://192.168.1.100:3456"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleSaveApiUrl} size="sm">保存</Button>
              <Button onClick={handleRefresh} variant="outline" size="sm">🔄 刷新</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <div className="text-red-500">{error}</div>}

      {/* 搜索和筛选 */}
      <div className="space-y-2">
        <Input
          placeholder="搜索客户/供应商/单号..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:w-80"
        />
        <div className="flex gap-2">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            全部
          </Button>
          <Button
            variant={filterType === 'sale' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('sale')}
          >
            销售单
          </Button>
          <Button
            variant={filterType === 'purchase' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('purchase')}
          >
            进货单
          </Button>
        </div>
      </div>

      {/* 单据列表 */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 text-slate-500">暂无待拍照单据</div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map(doc => (
            <Link key={doc.id} to={`/mobile/document/${doc.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={doc.type === 'sale' ? 'default' : 'secondary'}>
                        {doc.type === 'sale' ? '销售单' : '进货单'}
                      </Badge>
                      {doc.invoiceNo && (
                        <span className="text-sm text-slate-500">{doc.invoiceNo}</span>
                      )}
                    </div>
                    {doc.hasPhotos ? (
                      <Badge className="text-green-700 border-green-300 bg-green-100">
                        已拍照 ({doc.photoCount})
                      </Badge>
                    ) : (
                      <Badge className="text-orange-700 border-orange-300 bg-orange-100">
                        待拍照
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-slate-800">{doc.partyName}</div>
                      <div className="text-xs text-slate-500 mt-1">{new Date(doc.date).toLocaleDateString('zh-CN')}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-orange-600">¥{doc.amount.toLocaleString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
