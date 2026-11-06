import { Capacitor } from '@capacitor/core';
import { save } from '@/lib/statement-export';

const native = Capacitor.isNativePlatform();

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** In the APK a file can only leave the app through the share sheet (which includes "Save to Files"). */
async function nativeShare(blob: Blob, name: string, title: string) {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([import('@capacitor/filesystem'), import('@capacitor/share')]);
  const { uri } = await Filesystem.writeFile({ path: name, data: await toBase64(blob), directory: Directory.Cache });
  try {
    await Share.share({ title, files: [uri] });
    return true;
  } catch {
    return false; // the sheet was closed
  }
}

/** Whether this device can hand a file to other apps (WhatsApp, Gmail…). */
export function canShareFiles(blob: Blob, name: string) {
  if (native) return true;
  return !!navigator.canShare?.({ files: [new File([blob], name, { type: blob.type })] });
}

/** Opens the share sheet with the file. False when the user closed it. */
export async function shareFile(blob: Blob, name: string, title: string): Promise<boolean> {
  if (native) return nativeShare(blob, name, title);
  try {
    await navigator.share({ title, files: [new File([blob], name, { type: blob.type })] });
    return true;
  } catch {
    return false;
  }
}

/** Saves the file: a download in a browser, the share sheet in the app. */
export async function saveFile(blob: Blob, name: string, title: string): Promise<boolean> {
  if (native) return nativeShare(blob, name, title);
  save(blob, name);
  return true;
}
