import { db } from '@/lib/db';

export const PhotoService = {
  async getSalePhotos(include?: any) {
    return db.SaleOrderPhoto.findMany({
      include: include?.sale
        ? { saleOrder: { include: { buyer: true } } }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getPurchasePhotos(include?: any) {
    return db.PurchasePhoto.findMany({
      include: include?.purchase
        ? { purchase: { include: { product: true } } }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  },
};
