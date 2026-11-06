import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { Download, FileText, Loader2, Share2, X } from 'lucide-react';
import { canShareFiles, saveFile, shareFile } from '@/lib/share-file';
import { cn } from '@/lib/utils';

/**
 * Shows a PDF before it is saved or shared. Pages are drawn with pdf.js, so
 * it looks the same on a computer, a phone browser and in the app, where
 * the built-in PDF viewer isn't available.
 */
export function PdfPreviewModal({ blob, fileName, title, onClose }: {
  blob: Blob;
  fileName: string;
  /** Used as the share-sheet title */
  title: string;
  onClose: () => void;
}) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [rendering, setRendering] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [busy, setBusy] = useState<'save' | 'share' | null>(null);
  const native = Capacitor.isNativePlatform();
  const sharable = canShareFiles(blob, fileName);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Loaded on demand: the viewer is only needed here
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
        const doc = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        if (cancelled) return;
        setPageCount(doc.numPages);
        const box = pagesRef.current;
        if (!box) return;
        box.replaceChildren();
        const width = box.clientWidth;
        for (let n = 1; n <= doc.numPages; n++) {
          const page = await doc.getPage(n);
          if (cancelled) return;
          const fit = page.getViewport({ scale: 1 });
          // Sharp on high-density phone screens
          const scale = (width / fit.width) * Math.min(window.devicePixelRatio || 1, 2);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = '100%';
          canvas.className = 'block rounded-sm bg-white shadow-md';
          canvas.setAttribute('aria-label', `Page ${n}`);
          box.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;
        }
      } catch (err) {
        console.error('PDF preview failed', err);
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function run(kind: 'save' | 'share') {
    setBusy(kind);
    try {
      const done = kind === 'save' ? await saveFile(blob, fileName, title) : await shareFile(blob, fileName, title);
      if (done && kind === 'save' && !native) toast.success('PDF downloaded — attach it to the email or send it on WhatsApp', { duration: 5000 });
    } catch (err) {
      console.error('Saving the PDF failed', err);
      toast.error('Could not save the PDF');
    } finally {
      setBusy(null);
    }
  }

  const btn = 'flex h-10 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="PDF preview" className="relative flex h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-surface-raised shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <FileText size={17} className="text-primary-600" /> PDF preview
            </h2>
            <p className="mt-0.5 truncate text-xs text-ink-muted">
              {fileName}{pageCount ? ` · ${pageCount} page${pageCount === 1 ? '' : 's'}` : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-gray-100"><X size={18} className="text-ink-muted" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-100 px-3 py-4 sm:px-6">
          {rendering && (
            <div className="flex h-40 items-center justify-center text-sm text-ink-muted"><Loader2 size={16} className="mr-2 animate-spin" /> Preparing preview…</div>
          )}
          {failed && (
            <p className="rounded-lg bg-surface px-3 py-6 text-center text-sm text-ink-muted">The preview couldn't load, but the PDF is ready. You can still download or share it.</p>
          )}
          <div ref={pagesRef} className={cn('mx-auto max-w-2xl space-y-4', rendering && 'invisible h-0')} />
        </div>

        <div className="flex gap-2 border-t border-line px-4 py-3 sm:px-5" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <button type="button" onClick={onClose} className={cn(btn, 'max-w-[110px] border border-line bg-surface text-ink')}>Back</button>
          {sharable && !native && (
            <button type="button" onClick={() => void run('share')} disabled={!!busy} className={cn(btn, 'text-white')} style={{ background: '#25D366' }}>
              {busy === 'share' ? <Loader2 size={15} className="animate-spin" /> : <Share2 size={15} />} Share
            </button>
          )}
          <button type="button" onClick={() => void run('save')} disabled={!!busy} className={cn(btn, 'text-white')} style={{ background: 'rgb(var(--c-brand-600))' }}>
            {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : native ? <Share2 size={15} /> : <Download size={15} />}
            {native ? 'Save or share' : 'Download'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
