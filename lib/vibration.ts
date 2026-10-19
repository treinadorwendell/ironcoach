// Navigator.vibrate API Helper for Tactile & Haptic Feedback in IronCoach PWA
// Provides responsive mobile feedback when interacting with timers and logging sets

export class VibrationEffects {
  /**
   * Checks if the Vibration API is supported in the current device/browser
   */
  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'vibrate' in navigator &&
      typeof navigator.vibrate === 'function'
    );
  }

  /**
   * Triggers a vibration pattern safely with error handling
   */
  public trigger(pattern: number | number[]): boolean {
    if (!this.isSupported()) return false;
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  /**
   * Light tactile tap (e.g. adjust timer +/- 15s/30s, toggle pause, open/close timer)
   * ~30ms crisp pulse
   */
  public lightTap(): boolean {
    return this.trigger(30);
  }

  /**
   * Medium pulse for stopwatch start/resume/pause interactions
   * ~50ms solid pulse
   */
  public mediumPulse(): boolean {
    return this.trigger(50);
  }

  /**
   * Double-pulse rewarding feedback when a set is completed
   * Pattern: 55ms buzz, 45ms pause, 70ms buzz
   */
  public setCompleted(): boolean {
    return this.trigger([55, 45, 70]);
  }

  /**
   * Short crisp pulse when unchecking / unmarking a completed set
   * ~25ms subtle tick
   */
  public setUnmarked(): boolean {
    return this.trigger(25);
  }

  /**
   * Distinct countdown finished alert pattern (Time's Up)
   * Pattern: 130ms buzz, 70ms pause, 130ms buzz, 70ms pause, 220ms buzz
   * Ensures the trainer feels the end of the rest interval even if phone is in pocket
   */
  public timerFinished(): boolean {
    return this.trigger([130, 70, 130, 70, 220]);
  }

  /**
   * Cancel ongoing vibration
   */
  public cancel(): boolean {
    if (!this.isSupported()) return false;
    try {
      return navigator.vibrate(0);
    } catch {
      return false;
    }
  }
}

export const vibration = new VibrationEffects();
