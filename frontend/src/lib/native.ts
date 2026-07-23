import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * One-time native setup: status bar styling, hardware back-button navigation,
 * and splash screen dismissal. Only called when running inside the Capacitor
 * Android shell (see App.tsx `isNative` check).
 */
export async function setupNativeApp() {
  document.documentElement.classList.add('native-app');

  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#f97316' });
  } catch {
    // StatusBar plugin unavailable (e.g. web) — ignore
  }

  // Hardware back button: go back in history, or exit app at the root
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back();
    } else {
      CapacitorApp.exitApp();
    }
  });

  try {
    await SplashScreen.hide();
  } catch {
    // ignore
  }
}
