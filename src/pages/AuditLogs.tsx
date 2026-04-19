import { useEffect, useState } from 'react';
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
import { AuditLogService } from '@/services/AuditLogService';
import { toast } from '@/components/Toast';
import type { AuditLog } from '@/lib/types';

const ACTION_TYPE_MAP: Record<string, { label: string; color: string }> = {
  CREATE: { label: '创建', color: 'bg-green-100 text-green-800' },
  UPDATE: { label: '更新', color: 'bg-blue-100 text-blue-800' },
  DELETE: { label: '删除', color: 'bg-red-100 text-red-800' },
  LOGIN: { label: '登录', color: 'bg-purple-100 text-purple-800' },
  LOGOUT: { label: '登出', color: 'bg-gray-100 text-gray-800' },
};

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    try {
      setLoading(true);

      let startDate: Date | undefined;
      const now = new Date();

      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      }

      const whereClause: any = {};
      if (startDate) {
        whereClause.timestamp = { gte: startDate };
      }

      const data = await AuditLogService.getAuditLogs(whereClause);

      setLogs(data);
    } catch (error) {
      console.error('[AuditLogs] 加载失败:', error);
      toast('数据加载失败，请刷新页面重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (entityFilter !== 'all' && log.entityType !== entityFilter) return false;
    if (actionFilter !== 'all' && log.actionType !== actionFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.entityType.toLowerCase().includes(term) ||
        log.entityId.toLowerCase().includes(term) ||
        log.actionType.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const getEntityTypes = () => {
    const types = new Set(logs.map((l) => l.entityType));
    return Array.from(types);
  };

  const formatTimestamp = (ts: Date) => {
    const date = new Date(ts);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActionInfo = (actionType: string) => {
    return ACTION_TYPE_MAP[actionType.toUpperCase()] || { label: actionType, color: 'bg-gray-100 text-gray-800' };
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
          <h2 className="text-2xl font-bold text-slate-800">操作日志</h2>
          <p className="text-slate-500 mt-1">查看系统操作记录</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>刷新</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-4 items-center">
            <Input
              placeholder="搜索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48"
            />

            <select
              className="h-9 w-32 border rounded px-2 text-sm"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
            >
              <option value="all">全部实体</option>
              {getEntityTypes().map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            <select
              className="h-9 w-28 border rounded px-2 text-sm"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="all">全部操作</option>
              <option value="CREATE">创建</option>
              <option value="UPDATE">更新</option>
              <option value="DELETE">删除</option>
            </select>

            <div className="flex gap-1 ml-auto">
              <Button
                size="sm"
                variant={dateRange === 'today' ? 'default' : 'outline'}
                onClick={() => setDateRange('today')}
              >
                今天
              </Button>
              <Button
                size="sm"
                variant={dateRange === 'week' ? 'default' : 'outline'}
                onClick={() => setDateRange('week')}
              >
                近7天
              </Button>
              <Button
                size="sm"
                variant={dateRange === 'month' ? 'default' : 'outline'}
                onClick={() => setDateRange('month')}
              >
                近30天
              </Button>
              <Button
                size="sm"
                variant={dateRange === 'all' ? 'default' : 'outline'}
                onClick={() => setDateRange('all')}
              >
                全部
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>操作类型</TableHead>
                <TableHead>实体类型</TableHead>
                <TableHead>实体ID</TableHead>
                <TableHead>操作详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    暂无日志数据
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const actionInfo = getActionInfo(log.actionType);
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-slate-500">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge className={actionInfo.color}>
                          {actionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{log.entityType}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entityId.slice(0, 12)}...
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {log.oldValue && log.newValue ? (
                          <div className="text-xs">
                            <span className="text-red-500 line-through mr-1">{log.oldValue}</span>
                            <span className="text-slate-400 mx-1">→</span>
                            <span className="text-green-500">{log.newValue}</span>
                          </div>
                        ) : log.newValue ? (
                          <span className="text-green-600">{log.newValue}</span>
                        ) : log.oldValue ? (
                          <span className="text-red-600">{log.oldValue}</span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}