import { Capacitor } from '@capacitor/core';
import { save } from '@/lib/statement-export';

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Hands a file to the user the way their device expects: the share sheet on
 * a phone (WhatsApp, Gmail with it attached, Files…), a download on a computer.
 * Resolves 'cancelled' when the user closes the share sheet.
 */
export async function shareOrSaveFile(blob: Blob, name: string, title: string): Promise<'shared' | 'saved' | 'cancelled'> {
  if (Capacitor.isNativePlatform()) {
    // The app's web view can't download: write it to the cache, then share that file
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
    const { uri } = await Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: Directory.Cache });
    try {
      await Share.share({ title, files: [uri] });
      return 'shared';
    } catch {
      return 'cancelled'; // the plugin rejects when the sheet is closed
    }
  }

  const file = new File([blob], name, { type: blob.type });
  const phone = window.matchMedia('(pointer: coarse)').matches;
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ title, files: [file] });
      return 'shared';
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return 'cancelled';
      // sharing refused: fall back to a download
    }
  }
  save(blob, name);
  return 'saved';
}
