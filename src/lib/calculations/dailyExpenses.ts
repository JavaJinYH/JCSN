/**
 * 日常支出相关计算
 */

interface DailyExpense {
  category: string;
  amount: number;
}

interface DailyExpenseStats {
  totalExpenses: number;
  categoryTotals: Map<string, number>;
}

/**
 * 计算日常支出统计
 */
export function calculateDailyExpenseStats(expenses: DailyExpense[]): DailyExpenseStats {
  let totalExpenses = 0;
  const categoryTotals = new Map<string, number>();

  expenses.forEach(expense => {
    totalExpenses += expense.amount;
    const current = categoryTotals.get(expense.category) || 0;
    categoryTotals.set(expense.category, current + expense.amount);
  });

  return {
    totalExpenses,
    categoryTotals,
  };
}
