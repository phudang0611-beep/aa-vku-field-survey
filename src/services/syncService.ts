import {
  getPendingQueueItems,
  updateQueueItem,
  markItemAsSynced,
  getAllQueueItems
} from '../db/indexedDB';
import type { SyncQueueItem } from '../types/survey';
import { networkService } from './networkService';

export interface SyncProgress {
  isSyncing: boolean;
  total: number;
  completed: number;
  currentItem?: SyncQueueItem;
  lastSyncTime?: string;
  errorMessage?: string;
}

type SyncListener = (progress: SyncProgress) => void;

class SyncService {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private lastSyncTime?: string;

  constructor() {
    this.init();
  }

  private init() {
    // Automatically trigger sync when network reconnects
    networkService.subscribe((isOnline) => {
      if (isOnline) {
        console.log('[SyncService] Network restored. Initiating automatic queue sync...');
        this.processQueue();
      }
    });

    // Also register Background Sync API if supported in Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then((reg: any) => {
        try {
          reg.sync?.register('vku-sync-surveys');
        } catch (e) {
          console.log('[SyncService] Background Sync registration:', e);
        }
      }).catch(() => {});
    }
  }

  public getApiEndpoint(): string {
    return localStorage.getItem('vku_api_endpoint') || '/api/surveys';
  }

  public setApiEndpoint(endpoint: string): void {
    localStorage.setItem('vku_api_endpoint', endpoint);
  }

  public async pingServer(): Promise<{ ok: boolean; statusText: string; latencyMs: number }> {
    const start = performance.now();
    try {
      const endpoint = this.getApiEndpoint();
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        return { ok: true, statusText: `HTTP ${res.status} OK`, latencyMs };
      }
      return { ok: false, statusText: `HTTP ${res.status} ${res.statusText}`, latencyMs };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return { ok: false, statusText: err.message || 'Không thể kết nối máy chủ', latencyMs };
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getProgressState(0, 0));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(total = 0, completed = 0, currentItem?: SyncQueueItem, error?: string) {
    const progress = this.getProgressState(total, completed, currentItem, error);
    this.listeners.forEach((listener) => {
      try {
        listener(progress);
      } catch (err) {
        console.error('Error notifying sync listener:', err);
      }
    });
  }

  private getProgressState(
    total: number,
    completed: number,
    currentItem?: SyncQueueItem,
    errorMessage?: string
  ): SyncProgress {
    return {
      isSyncing: this.isSyncing,
      total,
      completed,
      currentItem,
      lastSyncTime: this.lastSyncTime,
      errorMessage
    };
  }

  /**
   * Dispatches queued surveys sequentially upon network restoration
   */
  public async processQueue(): Promise<{ successCount: number; failedCount: number }> {
    if (this.isSyncing) {
      console.log('[SyncService] Sync already in progress, skipping duplicate call.');
      return { successCount: 0, failedCount: 0 };
    }

    if (!networkService.isOnline) {
      console.log('[SyncService] Cannot sync: currently offline.');
      return { successCount: 0, failedCount: 0 };
    }

    const pendingItems = await getPendingQueueItems();
    if (pendingItems.length === 0) {
      this.notify(0, 0);
      return { successCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    let successCount = 0;
    let failedCount = 0;
    const total = pendingItems.length;

    this.notify(total, 0);

    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];

      // Check if network went down mid-process
      if (!networkService.isOnline) {
        console.warn('[SyncService] Network lost during sync batch. Halting.');
        break;
      }

      try {
        // Mark as SYNCING
        item.status = 'SYNCING';
        await updateQueueItem(item);
        this.notify(total, i, item);

        // Send real HTTP POST request to server
        await this.dispatchToServer(item);

        // Mark as SYNCED & archive to history
        await markItemAsSynced(item);
        successCount++;
        this.lastSyncTime = new Date().toLocaleTimeString('vi-VN');
      } catch (error: any) {
        console.error(`[SyncService] Failed to sync item ${item.uuid}:`, error);
        failedCount++;
        item.status = 'FAILED';
        item.retryCount = (item.retryCount || 0) + 1;
        item.lastError = error?.message || 'Lỗi truyền tải mạng';
        await updateQueueItem(item);
      }

      this.notify(total, i + 1, item);
    }

    this.isSyncing = false;
    this.notify(total, total);
    return { successCount, failedCount };
  }

  /**
   * Dispatches survey item via real HTTP POST request across the network
   */
  private async dispatchToServer(item: SyncQueueItem): Promise<{ status: string; receivedId: string }> {
    if (!networkService.isOnline) {
      throw new Error('Mất kết nối Internet trong quá trình gửi dữ liệu.');
    }

    const endpoint = this.getApiEndpoint();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          uuid: item.uuid,
          createdAt: item.createdAt,
          data: item.data,
          clientMetadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
            clientTimestamp: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Máy chủ từ chối với mã HTTP ${response.status} (${response.statusText})`);
      }

      const result = await response.json().catch(() => ({ status: 'OK' }));

      // Archive a copy to local server storage
      try {
        const serverRecords = JSON.parse(localStorage.getItem('vku_remote_server_surveys') || '[]');
        serverRecords.unshift({
          ...item,
          serverReceivedAt: new Date().toISOString()
        });
        localStorage.setItem('vku_remote_server_surveys', JSON.stringify(serverRecords.slice(0, 50)));
      } catch {}

      return {
        status: 'OK',
        receivedId: result?.receivedUuid || item.uuid
      };
    } catch (networkErr: any) {
      // If endpoint failed (e.g. offline or unreachable endpoint)
      console.error('[SyncService] Fetch failed:', networkErr);
      throw networkErr;
    }
  }

  public async getPendingCount(): Promise<number> {
    const items = await getAllQueueItems();
    return items.filter((i) => i.status === 'PENDING_SYNC' || i.status === 'FAILED').length;
  }
}

export const syncService = new SyncService();
