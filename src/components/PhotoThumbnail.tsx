import { useState, useEffect } from 'react';

interface PhotoItem {
  id: string;
  photoPath: string;
  photoRemark?: string | null;
  photoType?: string | null;
}

interface PhotoThumbnailProps {
  photo: PhotoItem;
  onClick: () => void;
}

export function PhotoThumbnail({ photo, onClick }: PhotoThumbnailProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      try {
        const result = await (window as any).electronAPI.photo.read(photo.photoPath);
        if (result.success && result.data?.dataUrl) {
          setImageSrc(result.data.dataUrl);
        }
      } catch (error) {
        console.error('Failed to load thumbnail:', photo.photoPath, error);
      } finally {
        setLoading(false);
      }
    };
    loadImage();
  }, [photo.photoPath]);

  const photoTypeLabels: Record<string, string> = {
    handwritten: '📝 手写单',
    signed: '✅ 签字单',
    scene: '📷 现场照',
    delivery: '📦 送货单',
  };

  return (
    <div
      className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-slate-200 hover:border-orange-400 transition-colors"
      onClick={onClick}
    >
      <div className="aspect-square bg-slate-100 flex items-center justify-center">
        {loading ? (
          <div className="text-2xl animate-pulse">📷</div>
        ) : imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-2xl">📷</div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate">
        {photoTypeLabels[photo.photoType || ''] || photo.photoType || '照片'}
      </div>
    </div>
  );
}