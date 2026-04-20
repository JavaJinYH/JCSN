import { db } from './db';
import type { SalePhoto, PurchasePhoto } from './types';

const PHOTO_UPLOAD_DIR = 'photos';
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function savePhoto(
  file: File,
  type: 'sale' | 'purchase',
  relatedId: string
): Promise<SalePhoto | PurchasePhoto> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('不支持的图片格式，请上传 JPEG、PNG 或 WebP 格式');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('图片大小不能超过 5MB');
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${type}_${relatedId}_${timestamp}_${randomStr}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fs = await import('fs');
  const path = await import('path');

  const uploadDir = path.join(process.cwd(), PHOTO_UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const filePath = path.join(uploadDir, fileName);
  fs.writeFileSync(filePath, buffer);

  const relativePath = `${PHOTO_UPLOAD_DIR}/${fileName}`;

  if (type === 'sale') {
    return await db.SaleOrderPhoto.create({
      data: {
        saleOrderId: relatedId,
        photoPath: relativePath,
        photoType: 'handwritten',
      },
    });
  } else {
    return await db.PurchasePhoto.create({
      data: {
        purchaseId: relatedId,
        photoPath: relativePath,
        photoType: 'delivery',
      },
    });
  }
}

export async function deletePhoto(photoId: string, type: 'sale' | 'purchase'): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');

  let photoPath: string;

  if (type === 'sale') {
    const photo = await db.SaleOrderPhoto.findUnique({ where: { id: photoId } });
    photoPath = photo?.photoPath || '';
  } else {
    const photo = await db.PurchasePhoto.findUnique({ where: { id: photoId } });
    photoPath = photo?.photoPath || '';
  }

  if (photoPath) {
    const fullPath = path.join(process.cwd(), photoPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  if (type === 'sale') {
    await db.SaleOrderPhoto.delete({ where: { id: photoId } });
  } else {
    await db.PurchasePhoto.delete({ where: { id: photoId } });
  }
}

export async function getPhotos(type: 'sale' | 'purchase', relatedId: string) {
  if (type === 'sale') {
    return await db.SaleOrderPhoto.findMany({
      where: { saleOrderId: relatedId },
      orderBy: { createdAt: 'asc' },
    });
  } else {
    return await db.PurchasePhoto.findMany({
      where: { purchaseId: relatedId },
      orderBy: { createdAt: 'asc' },
    });
  }
}

export async function updatePhotoRemark(
  photoId: string,
  remark: string,
  type: 'sale' | 'purchase'
) {
  if (type === 'sale') {
    return await db.SaleOrderPhoto.update({
      where: { id: photoId },
      data: { photoRemark: remark },
    });
  } else {
    return await db.PurchasePhoto.update({
      where: { id: photoId },
      data: { photoRemark: remark },
    });
  }
}