import { Network, type ConnectionStatus } from '@capacitor/network';

type NetworkChangeListener = (isOnline: boolean) => void;

class NetworkService {
  private listeners: Set<NetworkChangeListener> = new Set();
  private isSimulatedOffline: boolean = false;
  private realOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    this.init();
  }

  private async init() {
    // 1. Listen to Capacitor Network if native / supported
    try {
      Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
        this.realOnlineStatus = status.connected;
        this.notifyListeners();
      });

      const initialStatus = await Network.getStatus();
      this.realOnlineStatus = initialStatus.connected;
    } catch {
      // Fallback for pure web browsers without native plugin
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
          this.realOnlineStatus = true;
          this.notifyListeners();
        });
        window.addEventListener('offline', () => {
          this.realOnlineStatus = false;
          this.notifyListeners();
        });
      }
    }
  }

  public get isOnline(): boolean {
    if (this.isSimulatedOffline) {
      return false;
    }
    return this.realOnlineStatus;
  }

  public get simulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  public setSimulatedOffline(simulated: boolean) {
    this.isSimulatedOffline = simulated;
    this.notifyListeners();
  }

  public subscribe(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial status
    listener(this.isOnline);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const online = this.isOnline;
    this.listeners.forEach((listener) => {
      try {
        listener(online);
      } catch (err) {
        console.error('Error in network listener:', err);
      }
    });
  }
}

export const networkService = new NetworkService();
