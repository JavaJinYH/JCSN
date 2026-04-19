import { db } from '@/lib/db';

export const PhotoService = {
  async getSalePhotos(include?: any) {
    return db.salePhoto.findMany({
      include: include?.sale 
        ? { sale: { include: { customer: true } } }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getPurchasePhotos(include?: any) {
    return db.purchasePhoto.findMany({
      include: include?.purchase
        ? { purchase: { include: { product: true } } }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  },
};
