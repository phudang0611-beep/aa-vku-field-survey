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

        // Send to remote API / mock endpoint
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
        item.lastError = error?.message || 'Lỗi truyền tải dữ liệu';
        await updateQueueItem(item);
      }

      this.notify(total, i + 1, item);
    }

    this.isSyncing = false;
    this.notify(total, total);
    return { successCount, failedCount };
  }

  /**
   * Simulated API server dispatch with realistic network latency
   */
  private async dispatchToServer(item: SyncQueueItem): Promise<{ status: string; receivedId: string }> {
    // In production, this would be: await fetch('/api/surveys', { method: 'POST', body: ... })
    // We simulate realistic network roundtrip
    await new Promise((resolve) => setTimeout(resolve, 800));

    // If simulated offline was activated during transmission
    if (!networkService.isOnline) {
      throw new Error('Mất kết nối trong quá trình gửi dữ liệu.');
    }

    // Save copy to local server storage simulation
    try {
      const serverRecords = JSON.parse(localStorage.getItem('vku_remote_server_surveys') || '[]');
      serverRecords.unshift({
        ...item,
        serverReceivedAt: new Date().toISOString()
      });
      localStorage.setItem('vku_remote_server_surveys', JSON.stringify(serverRecords));
    } catch {
      // ignore storage quota in mock
    }

    return {
      status: 'OK',
      receivedId: item.uuid
    };
  }

  public async getPendingCount(): Promise<number> {
    const items = await getAllQueueItems();
    return items.filter((i) => i.status === 'PENDING_SYNC' || i.status === 'FAILED').length;
  }
}

export const syncService = new SyncService();
