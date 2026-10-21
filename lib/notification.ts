// Web Notifications & Background Rest Timer Monitoring Service for IronCoach
// Enables system push-level notifications when rest time between sets is finished,
// even if the tablet or mobile browser is minimized or the screen is locked.

export interface RestNotificationPayload {
  exerciseName: string;
  setNumber: number;
  targetTimeMs: number;
  totalDurationSeconds?: number;
}

class NotificationService {
  private scheduledTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentPayload: RestNotificationPayload | null = null;
  private worker: Worker | null = null;
  private onTickCallback: (() => void) | null = null;

  constructor() {
    this.initBackgroundWorker();
  }

  // Check if Web Notifications are supported in the current environment
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }

  // Get current permission status ('granted', 'denied', 'default', or 'unsupported')
  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  // Request user permission for notifications
  public async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      // In older browsers, requestPermission took a callback instead of returning a Promise
      return new Promise((resolve) => {
        try {
          Notification.requestPermission((result) => {
            resolve(result);
          });
        } catch {
          resolve(Notification.permission);
        }
      });
    }
  }

  // Initialize a lightweight Blob Web Worker that is immune to tab throttling in the background
  private initBackgroundWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;

    try {
      const workerBlob = new Blob(
        [
          `
          let intervalId = null;
          self.onmessage = function(e) {
            if (e.data.action === 'START') {
              if (intervalId) clearInterval(intervalId);
              intervalId = setInterval(function() {
                self.postMessage({ type: 'TICK' });
              }, 400);
            } else if (e.data.action === 'STOP') {
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
            }
          };
        `,
        ],
        { type: 'application/javascript' }
      );

      const workerUrl = URL.createObjectURL(workerBlob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        if (e.data && e.data.type === 'TICK') {
          this.handleWorkerTick();
          if (this.onTickCallback) {
            this.onTickCallback();
          }
        }
      };
    } catch (err) {
      console.warn('Background Web Worker not supported, using standard timers:', err);
    }
  }

  // Start background ticker
  public startBackgroundTicker(onTick?: () => void) {
    if (onTick) this.onTickCallback = onTick;
    if (this.worker) {
      this.worker.postMessage({ action: 'START' });
    }
  }

  // Stop background ticker
  public stopBackgroundTicker() {
    this.onTickCallback = null;
    if (this.worker) {
      this.worker.postMessage({ action: 'STOP' });
    }
  }

  // Schedule notification for when rest timer hits zero
  public async scheduleRestNotification(payload: RestNotificationPayload) {
    this.currentPayload = payload;
    const now = Date.now();
    const delay = Math.max(0, payload.targetTimeMs - now);

    // 1. Clear any prior timeout
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }

    // 2. Start unthrottled Web Worker ticker for continuous monitoring
    this.startBackgroundTicker();

    // 3. Delegate to Service Worker if active (Service Worker survives background suspension)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.active) {
          registration.active.postMessage({
            type: 'SCHEDULE_REST_NOTIFICATION',
            targetTime: payload.targetTimeMs,
            exerciseName: payload.exerciseName,
            setNumber: payload.setNumber,
          });
        }
      } catch (err) {
        console.warn('Could not post to Service Worker:', err);
      }
    }

    // 4. Client-side timeout backup
    this.scheduledTimeout = setTimeout(() => {
      this.triggerRestNotificationNow(payload.exerciseName, payload.setNumber);
      this.stopBackgroundTicker();
    }, delay);
  }

  // Handle worker tick to detect target time crossing even if backgrounded
  private handleWorkerTick() {
    if (!this.currentPayload) return;

    if (Date.now() >= this.currentPayload.targetTimeMs) {
      const { exerciseName, setNumber } = this.currentPayload;
      this.cancelRestNotification();
      this.triggerRestNotificationNow(exerciseName, setNumber);
    }
  }

  // Cancel any scheduled notification
  public async cancelRestNotification() {
    if (this.scheduledTimeout) {
      clearTimeout(this.scheduledTimeout);
      this.scheduledTimeout = null;
    }
    this.currentPayload = null;
    this.stopBackgroundTicker();

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.active) {
          registration.active.postMessage({
            type: 'CANCEL_REST_NOTIFICATION',
          });
        }
      } catch {}
    }
  }

  // Trigger the notification immediately
  public async triggerRestNotificationNow(exerciseName: string, setNumber: number) {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return;
    }

    const title = '⏱️ Tempo de Descanso Concluído!';
    const body = `Hora da Série #${setNumber} de ${exerciseName}. Bora pra cima!`;
    const options: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'ironcoach-rest-complete',
      renotify: true,
      requireInteraction: true,
      vibrate: [250, 100, 250, 100, 400],
      data: {
        url: '/',
        exerciseName,
        setNumber,
        timestamp: Date.now(),
      },
    };

    // Prefer service worker showNotification (works reliably in background / lock screen)
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(title, options);
          return;
        }
      } catch (e) {
        console.warn('ServiceWorker showNotification failed, trying standard Notification:', e);
      }
    }

    // Standard Notification constructor fallback
    try {
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon,
        tag: options.tag,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (err) {
      console.warn('Standard Notification failed:', err);
    }
  }
}

export const notificationService = new NotificationService();
