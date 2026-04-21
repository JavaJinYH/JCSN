import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTablePagination, useDataTable } from '@/components/DataTable';
import { DailyExpenseService } from '@/services/DailyExpenseService';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/Toast';

const EXPENSE_CATEGORIES = ['房租', '水电费', '工资', '杂费', '其他'];

export function DailyExpenses() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '其他',
    amount: '',
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await DailyExpenseService.getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast('请输入金额', 'warning');
      return;
    }
    if (!formData.category) {
      toast('请选择类别', 'warning');
      return;
    }

    try {
      await DailyExpenseService.createExpense({
        date: new Date(formData.date),
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
      });

      setShowAddDialog(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: '其他',
        amount: '',
        description: '',
      });
      loadData();
      toast('日常支出记录添加成功', 'success');
    } catch (error) {
      console.error('Failed to add expense:', error);
      toast('添加失败，请重试', 'error');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('确定要删除这条支出记录吗？')) return;
    try {
      await DailyExpenseService.deleteExpense(id);
      loadData();
      toast('删除成功', 'success');
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast('删除失败，请重试', 'error');
    }
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    let matchesDate = true;
    if (startDate && endDate) {
      const expenseDate = new Date(expense.date);
      const start = new Date(startDate);
      const end = new Date(endDate);
      matchesDate = expenseDate >= start && expenseDate <= end;
    }
    return matchesCategory && matchesDate;
  });

  const tableProps = useDataTable<any>({
    data: filteredExpenses,
    defaultPageSize: 20,
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryTotals: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">日常支出管理</h2>
          <p className="text-slate-500 mt-1">记录房租、水电费、工资、杂费等支出</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-orange-500 hover:bg-orange-600">
          + 添加支出
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">总支出</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</div>
          </CardContent>
        </Card>
        {Object.entries(categoryTotals).slice(0, 3).map(([category, total]) => (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">{category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-700">{formatCurrency(total)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showAddDialog && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle>添加支出记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">日期</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">类别</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">金额</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">说明</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                取消
              </Button>
              <Button onClick={handleAddExpense} className="bg-orange-500 hover:bg-orange-600">
                保存
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32 h-8">
                <SelectValue placeholder="类别筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类别</SelectItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">日期范围：</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-36 h-8"
              />
              <span className="text-slate-400">至</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-36 h-8"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategoryFilter('all');
                setStartDate('');
                setEndDate('');
              }}
              className="h-8 text-slate-500"
            >
              🔄 重置筛选
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">加载中...</div>
          ) : tableProps.total === 0 ? (
            <div className="text-center py-8 text-slate-500">暂无支出记录</div>
          ) : (
            <div className="space-y-3">
              {tableProps.data.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-slate-50 border-slate-200"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800">{expense.category}</span>
                      <span className="text-sm text-slate-500">
                        {new Date(expense.date).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    {expense.description && (
                      <div className="text-sm text-slate-500 mt-1">{expense.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-orange-600">{formatCurrency(expense.amount)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DataTablePagination
            pagination={{
              page: tableProps.page,
              pageSize: tableProps.pageSize,
              total: tableProps.total,
            }}
            onPageChange={tableProps.setPage}
            onPageSizeChange={tableProps.setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}
