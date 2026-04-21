import { db } from '@/lib/db';

export const PhotoService = {
  async getSalePhotos(include?: any) {
    return db.saleOrderPhoto.findMany({
      include: include?.sale
        ? { saleOrder: { include: { buyer: true } } }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getPurchasePhotos(include?: any) {
    return db.purchasePhoto.findMany({
      include: include?.purchase
        ? { purchase: { include: { product: true, supplier: true } } }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  },
};
