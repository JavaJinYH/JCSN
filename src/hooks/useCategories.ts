import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import { sortByFrequency } from '@/lib/frequency';
import type { Category } from '@/lib/types';

interface UseCategoriesOptions {
  sortByFreq?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { sortByFreq = true } = options;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await db.category.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      setCategories(sortByFreq ? sortByFrequency(data, 'category') : data);
    } catch (error) {
      console.error('[useCategories] 加载分类失败:', error);
    } finally {
      setLoading(false);
    }
  }, [sortByFreq]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return { categories, loading, refresh: loadCategories };
}
