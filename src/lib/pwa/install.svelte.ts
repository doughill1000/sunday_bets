// Shared runes store for beforeinstallprompt — registers at module load so the
// event is captured even before any component mounts.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function createInstallStore() {
  let canInstall = $state(false);
  let deferredPrompt = $state<BeforeInstallPromptEvent | null>(null);

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      canInstall = true;
    });
    window.addEventListener('appinstalled', () => {
      canInstall = false;
      deferredPrompt = null;
    });
  }

  return {
    get canInstall() {
      return canInstall;
    },
    get deferredPrompt() {
      return deferredPrompt;
    },
    async promptInstall(): Promise<boolean> {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      canInstall = false;
      return outcome === 'accepted';
    }
  };
}

export const installStore = createInstallStore();
