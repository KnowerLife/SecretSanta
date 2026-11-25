import { $ } from './utils.js?v=68';
import { t } from './i18n.js?v=68';
import { toast } from './feedback.js?v=68';
import { updateOfflineUI, flushOfflineQueue } from './offline.js?v=68';

// PWA-установка и сетевые события приложения.
export function initInstall() {
  let installPrompt = null;
  let installDone = false;
  const installBtn = $('#installBtn');
  const installFooterBtn = $('#installFooterBtn');
  const installHint = $('#installHint');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const updateInstallUI = () => {
    if (installHint && !installDone) {
      installHint.textContent = installPrompt ? t('install.ready') : (isIOS ? t('install.ios') : t('install.generic'));
    }
    if (installBtn) installBtn.classList.toggle('hidden', installDone || !installPrompt);
    if (installFooterBtn) {
      installFooterBtn.disabled = installDone;
      installFooterBtn.classList.toggle('hidden', installDone);
      installFooterBtn.textContent = installDone ? t('install.done') : t('footer.install');
    }
  };
  const markInstalled = () => {
    installDone = true;
    installPrompt = null;
    updateInstallUI();
    if (installHint) installHint.textContent = t('install.done');
    toast(t('install.done'));
  };
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); installPrompt = e;
    updateInstallUI();
  });
  window.addEventListener('appinstalled', markInstalled);
  document.addEventListener('secret-santa:lang', updateInstallUI);
  const requestInstall = async () => {
    if (!installPrompt) {
      toast(isIOS ? t('install.ios') : t('install.generic'));
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    installPrompt = null;
    if (outcome === 'accepted') markInstalled();
    else updateInstallUI();
  };
  if (installBtn) installBtn.addEventListener('click', requestInstall);
  if (installFooterBtn) installFooterBtn.addEventListener('click', requestInstall);
  updateInstallUI();
  window.addEventListener('offline', () => { updateOfflineUI(); });
  window.addEventListener('online', async () => {
    const banner = $('#offlineBanner'); const text = $('#offlineBannerText');
    if (banner && text) { text.textContent = t('nav.online'); banner.classList.remove('hidden'); }
    await flushOfflineQueue();
    setTimeout(updateOfflineUI, 2000);
  });
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (e) => {
      if (e.data?.type === 'flush-offline-queue') flushOfflineQueue();
    });
  }
}
