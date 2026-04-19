import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import type { Product, Category } from '@/lib/types';

interface UseProductsOptions {
  includeCategory?: boolean;
  includeSpecs?: boolean;
  categoryId?: string;
}

interface ProductWithCategory extends Product {
  category: Category;
}

export function useProducts(options: UseProductsOptions = {}) {
  const { includeCategory = true, includeSpecs = false, categoryId } = options;
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const where: any = {};
      if (categoryId) {
        where.categoryId = categoryId;
      }

      const include: any = {};
      if (includeCategory) include.category = true;
      if (includeSpecs) include.productSpecs = { include: { brand: true } };

      const data = await db.product.findMany({
        where,
        include,
        orderBy: { name: 'asc' },
      });
      setProducts(data as ProductWithCategory[]);
    } catch (error) {
      console.error('[useProducts] 加载商品失败:', error);
    } finally {
      setLoading(false);
    }
  }, [categoryId, includeCategory, includeSpecs]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return { products, loading, refresh: loadProducts };
}
