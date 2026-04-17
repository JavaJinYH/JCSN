import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useCallback } from 'react';

interface PhotoItem {
  id: string;
  photoPath: string;
  photoRemark?: string | null;
  photoType?: string | null;
}

interface PhotoViewerProps {
  photos: PhotoItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
}

export function PhotoViewer({ photos, open, onOpenChange, initialIndex = 0 }: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loadedImages, setLoadedImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setScale(1);
    setRotation(0);
  }, [initialIndex, open]);

  const loadPhoto = useCallback(async (photoPath: string) => {
    if (loadedImages[photoPath]) return;
    try {
      const result = await (window as any).electronAPI.photo.read(photoPath);
      if (result.success && result.data?.dataUrl) {
        setLoadedImages(prev => ({ ...prev, [photoPath]: result.data.dataUrl }));
      }
    } catch (error) {
      console.error('Failed to load photo:', photoPath, error);
    }
  }, [loadedImages]);

  useEffect(() => {
    if (!open || photos.length === 0) return;
    const currentPhoto = photos[currentIndex];
    if (currentPhoto) {
      loadPhoto(currentPhoto.photoPath);
    }
  }, [open, currentIndex, photos, loadPhoto]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onOpenChange(false);
          break;
        case '+':
        case '=':
          setScale(s => Math.min(s + 0.25, 3));
          break;
        case '-':
          setScale(s => Math.max(s - 0.25, 0.5));
          break;
        case 'r':
        case 'R':
          setRotation(r => (r + 90) % 360);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setScale(1);
    setRotation(0);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setScale(1);
    setRotation(0);
  };

  const resetTransform = () => {
    setScale(1);
    setRotation(0);
  };

  if (photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];
  const currentImageSrc = loadedImages[currentPhoto.photoPath] || currentPhoto.photoPath;

  const photoTypeLabels: Record<string, string> = {
    handwritten: '📝 手写单',
    signed: '✅ 签字确认单',
    scene: '📷 现场照片',
    delivery: '📦 送货单',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black/95">
        <div className="relative flex flex-col h-full">
          <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={resetTransform}
              className="bg-black/50 hover:bg-black/70 text-white h-8 w-8"
              title="重置 (R)"
            >
              ⟳
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRotation(r => (r - 90) % 360)}
              className="bg-black/50 hover:bg-black/70 text-white h-8 w-8"
              title="左旋转"
            >
              ↺
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRotation(r => (r + 90) % 360)}
              className="bg-black/50 hover:bg-black/70 text-white h-8 w-8"
              title="右旋转"
            >
              ↻
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
              className="bg-black/50 hover:bg-black/70 text-white h-8 w-8"
              title="缩小 (-)"
            >
              −
            </Button>
            <span className="text-white text-sm bg-black/50 px-2 py-1 rounded">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScale(s => Math.min(s + 0.25, 3))}
              className="bg-black/50 hover:bg-black/70 text-white h-8 w-8"
              title="放大 (+)"
            >
              +
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="bg-black/50 hover:bg-black/70 text-white h-8 w-8 ml-2"
            >
              ✕
            </Button>
          </div>

          {photos.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors"
              >
                ◀
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/50 hover:bg-black/70 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors"
              >
                ▶
              </button>
            </>
          )}

          <div
            className="flex-1 flex items-center justify-center overflow-auto p-4"
            style={{ cursor: scale > 1 ? 'grab' : 'default' }}
          >
            {loading ? (
              <div className="flex items-center justify-center text-white">
                <div className="animate-spin text-4xl">⏳</div>
              </div>
            ) : (
              <img
                src={currentImageSrc}
                alt=""
                className="max-w-full max-h-[75vh] object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                }}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
              />
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white">
            <div className="flex items-center gap-4">
              {currentPhoto.photoType && (
                <span className="text-sm">
                  {photoTypeLabels[currentPhoto.photoType] || currentPhoto.photoType}
                </span>
              )}
              {currentPhoto.photoRemark && (
                <span className="text-sm text-slate-300 truncate max-w-md">
                  {currentPhoto.photoRemark}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">
                {currentIndex + 1} / {photos.length}
              </span>
              <span className="text-xs text-slate-500 ml-4">
                ←→ 切换 | +/- 缩放 | R 旋转 | Esc 关闭
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 py-2 bg-slate-800">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => {
                  setCurrentIndex(index);
                  setScale(1);
                  setRotation(0);
                }}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-orange-500' : 'bg-slate-500 hover:bg-slate-400'
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}