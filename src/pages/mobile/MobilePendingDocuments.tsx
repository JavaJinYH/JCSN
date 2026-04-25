import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/Toast';
import { MobileApiService, useMobileApi } from '@/services/MobileApiService';

export function MobilePendingDocuments() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sale' | 'purchase'>('all');
  
  // API 输入状态 - 用户正在输入的
  const [apiInput, setApiInput] = useState('');
  // 使用 useMobileApi hook 获取最新状态
  const { apiUrl, setApiUrl, isOnline } = useMobileApi();
  
  const [error, setError] = useState('');
  const [isCached, setIsCached] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  const testAndSaveApi = async () => {
    if (!apiInput) {
      setError('请先输入 API 地址');
      return;
    }
    setTestingConnection(true);
    try {
      // 先临时设置一下用于测试
      MobileApiService.setBaseUrl(apiInput);
      const res = await MobileApiService.checkHealth();
      
      if (res.success) {
        setError('');
        toast('✅ 连接成功！', 'success');
        // 使用 hook 中的 setApiUrl，这样会触发状态更新
        setApiUrl(apiInput);
        // 加载数据
        loadDocuments();
      } else {
        setError(res.error || '连接失败');
        // 测试失败回滚
        if (!apiUrl) {
          MobileApiService.clearBaseUrl();
        }
      }
    } catch (e) {
      setError('无法连接到服务器，请检查：\n1. 桌面端应用是否正在运行\n2. 手机和电脑是否在同一 WiFi\n3. IP 地址是否正确');
      // 测试失败回滚
      if (!apiUrl) {
        MobileApiService.clearBaseUrl();
      }
    } finally {
      setTestingConnection(false);
    }
  };

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

  // 页面初始化时
  useEffect(() => {
    // 如果有保存的地址，先加载数据
    if (apiUrl) {
      setApiInput(apiUrl);
      loadDocuments();
    } else {
      setLoading(false);
    }
  }, [apiUrl]);

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

  // 还没有保存 API 地址时，显示设置界面
  if (!apiUrl) {
    return (
      <div className="space-y-6 p-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">📱 移动端设置</h2>
          <p className="text-slate-500 text-sm mt-1">请输入主电脑的局域网地址</p>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">📋 使用步骤</h4>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>确保电脑和手机连接同一 WiFi</li>
            <li>在桌面端查看系统设置获取 IP 地址</li>
            <li>输入地址后点击"测试并连接"</li>
          </ol>
        </div>
        
        <div className="space-y-2">
          <Input
            placeholder="例如: http://192.168.1.100:3456"
            value={apiInput}
            onChange={(e) => setApiInput(e.target.value)}
          />
          <Button 
            onClick={testAndSaveApi} 
            className="w-full"
            disabled={testingConnection}
          >
            {testingConnection ? '🔄 测试连接中...' : '✅ 测试并连接'}
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-600 text-sm whitespace-pre-line">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // 已经保存 API 地址，显示单据列表
  return (
    <div className="space-y-6 p-4 pb-20">
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
          {/* 重新设置按钮 */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              // 使用 hook 中的 setApiUrl 清空
              setApiUrl('');
              setApiInput('');
              setDocuments([]);
            }}
          >
            ⚙️ 重设
          </Button>
        </div>
      </div>

      {/* API 地址管理 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">⚙️ API 地址</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <Input
              placeholder="例如: http://192.168.1.100:3456"
              value={apiInput}
              onChange={(e) => setApiInput(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={testAndSaveApi} size="sm" disabled={testingConnection}>
                {testingConnection ? '🔄 测试中...' : '✅ 测试连接'}
              </Button>
              <Button onClick={handleRefresh} variant="outline" size="sm">
                🔄 刷新
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && !isCached && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      
      {isCached && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
          <p className="text-amber-600 text-sm">⚠️ {error}</p>
        </div>
      )}

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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-500">加载中...</div>
        </div>
      ) : (
        /* 单据列表 */
        filteredDocuments.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-2">📭</div>
            <div>暂无待拍照单据</div>
          </div>
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
        )
      )}
    </div>
  );
}
