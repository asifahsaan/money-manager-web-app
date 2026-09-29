import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { TransactionAttachment } from '@/types';

export const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,image/gif';

interface Props {
  /** Already uploaded (edit mode) */
  saved: TransactionAttachment[];
  onRemoveSaved: (id: number) => void;
  /** Picked but not uploaded yet (new transaction) */
  pending: File[];
  onRemovePending: (index: number) => void;
}

// Thumbnail strip — renders nothing until there is at least one photo.
export function AttachmentThumbs({ saved, onRemoveSaved, pending, onRemovePending }: Props) {
  const previews = useMemo(() => pending.map((f) => URL.createObjectURL(f)), [pending]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  if (!saved.length && !pending.length) return null;

  const thumb = (key: string, src: string, alt: string, onRemove: () => void) => (
    <div key={key} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-line">
      <img src={src} alt={alt} className="h-full w-full object-cover" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
      >
        <X size={11} />
      </button>
    </div>
  );

  return (
    <div className="flex flex-wrap gap-2 pt-2">
      {saved.map((a) => thumb(`s${a.id}`, a.fileUrl, a.fileName, () => onRemoveSaved(a.id)))}
      {previews.map((src, i) => thumb(`p${i}`, src, pending[i]?.name ?? 'Photo', () => onRemovePending(i)))}
    </div>
  );
}
