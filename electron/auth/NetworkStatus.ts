import { EventEmitter } from "events";

/**
 * NetworkStatus monitors network connectivity
 * Emits events when online/offline status changes
 */
export class NetworkStatus extends EventEmitter {
  private _isOnline: boolean = true;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly pingUrl = "https://dummyjson.com";

  constructor() {
    super();
    this.startMonitoring();
  }

  /**
   * Check if network is currently online
   */
  async isOnline(): Promise<boolean> {
    try {
      // Try to make a simple HEAD request to DummyJSON
      const response = await fetch(this.pingUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(3000), // 3 second timeout
      });

      const online = response.ok;
      this.updateStatus(online);
      return online;
    } catch (error) {
      this.updateStatus(false);
      return false;
    }
  }

  /**
   * Get current online status (from cache, doesn't ping)
   */
  getStatus(): boolean {
    return this._isOnline;
  }

  /**
   * Start monitoring network status
   */
  private startMonitoring(): void {
    // Check immediately
    this.isOnline();

    // Check every 30 seconds
    this.checkInterval = setInterval(() => {
      this.isOnline();
    }, 30000);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Update status and emit event if changed
   */
  private updateStatus(online: boolean): void {
    if (this._isOnline !== online) {
      this._isOnline = online;
      this.emit("status-changed", online);

      if (online) {
        this.emit("online");
      } else {
        this.emit("offline");
      }
    }
  }
}
