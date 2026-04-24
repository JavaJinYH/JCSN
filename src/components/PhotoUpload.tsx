import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PhotoItem {
  id: string;
  file?: File;
  preview: string;
  remark: string;
  type: string;
}

interface PhotoUploadProps {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
  maxPhotos?: number;
}

export function PhotoUpload({ photos, onChange, maxPhotos = 3 }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = maxPhotos - photos.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    const newPhotos: PhotoItem[] = [];
    let processed = 0;

    filesToAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        newPhotos.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file,
          preview,
          remark: '',
          type: 'handwritten',
        });

        processed++;
        if (processed === filesToAdd.length) {
          onChange([...photos, ...newPhotos]);
        }
      };
      reader.onerror = () => {
        processed++;
        if (processed === filesToAdd.length) {
          onChange([...photos, ...newPhotos]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removePhoto = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  const updateRemark = (id: string, remark: string) => {
    onChange(photos.map((p) => (p.id === id ? { ...p, remark } : p)));
  };

  const updateType = (id: string, type: string) => {
    onChange(photos.map((p) => (p.id === id ? { ...p, type } : p)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium">单据照片（建议上传签字单，方便年底对账）</label>
          <p className="text-xs text-slate-400">最多 {maxPhotos} 张，非必填</p>
        </div>
        {photos.length < maxPhotos && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            📷 上传照片
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group border rounded-lg overflow-hidden">
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                <img
                  src={photo.preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
              <div className="p-2 space-y-2">
                <select
                  className="w-full text-xs border rounded px-1 py-1"
                  value={photo.type}
                  onChange={(e) => updateType(photo.id, e.target.value)}
                >
                  <option value="handwritten">📝 手写单</option>
                  <option value="signature">✍️ 签字单</option>
                  <option value="scene">📷 现场照</option>
                  <option value="delivery">📦 送货单</option>
                  <option value="signed">✅ 签收单</option>
                </select>
                <Input
                  placeholder="备注(≤200字)"
                  value={photo.remark}
                  onChange={(e) => updateRemark(photo.id, e.target.value.slice(0, 200))}
                  className="text-xs h-7"
                  maxLength={200}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div
          className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center cursor-pointer hover:border-slate-300 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <div className="text-3xl mb-2 text-slate-400">📷</div>
          <p className="text-sm text-slate-500">点击上传单据照片</p>
          <p className="text-xs text-slate-400 mt-1">支持 JPG、PNG 格式</p>
        </div>
      )}
    </div>
  );
}