import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import type { SurveyFormData, SyncQueueItem, SurveyDraft } from '../types/survey';

const DB_NAME = 'vku_field_survey_db';
const DB_VERSION = 1;

interface VKUSurveyDB extends DBSchema {
  drafts: {
    key: string;
    value: SurveyDraft;
  };
  sync_queue: {
    key: number;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-uuid': string;
      'by-created': string;
    };
  };
  synced_history: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-synced-time': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<VKUSurveyDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<VKUSurveyDB>> {
  if (!dbPromise) {
    dbPromise = openDB<VKUSurveyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // 1. Store for real-time draft persistence
        if (!db.objectStoreNames.contains('drafts')) {
          db.createObjectStore('drafts', { keyPath: 'key' });
        }

        // 2. Store for offline queue (PENDING_SYNC)
        if (!db.objectStoreNames.contains('sync_queue')) {
          const queueStore = db.createObjectStore('sync_queue', {
            keyPath: 'id',
            autoIncrement: true
          });
          queueStore.createIndex('by-status', 'status');
          queueStore.createIndex('by-uuid', 'uuid', { unique: true });
          queueStore.createIndex('by-created', 'createdAt');
        }

        // 3. Store for synced history archive
        if (!db.objectStoreNames.contains('synced_history')) {
          const historyStore = db.createObjectStore('synced_history', {
            keyPath: 'uuid'
          });
          historyStore.createIndex('by-synced-time', 'syncedAt');
        }
      }
    });
  }
  return dbPromise;
}

// -------------------------------------------------------------
// DRAFT OPERATIONS (Real-time persistence across browser refresh)
// -------------------------------------------------------------

export async function saveDraft(data: Partial<SurveyFormData>, currentStep: number = 1): Promise<void> {
  const db = await getDB();
  const draft: SurveyDraft = {
    key: 'current_draft',
    data,
    currentStep,
    updatedAt: new Date().toISOString()
  };
  await db.put('drafts', draft);
}

export async function getDraft(): Promise<SurveyDraft | undefined> {
  const db = await getDB();
  return db.get('drafts', 'current_draft');
}

export async function clearDraft(): Promise<void> {
  const db = await getDB();
  await db.delete('drafts', 'current_draft');
}

// -------------------------------------------------------------
// SYNC QUEUE OPERATIONS (Offline Queue & UUID Tagging)
// -------------------------------------------------------------

export async function enqueueSurvey(formData: SurveyFormData): Promise<SyncQueueItem> {
  const db = await getDB();
  const newItem: SyncQueueItem = {
    uuid: uuidv4(),
    createdAt: new Date().toISOString(),
    status: 'PENDING_SYNC',
    data: formData,
    retryCount: 0
  };

  const id = await db.add('sync_queue', newItem);
  newItem.id = Number(id);
  return newItem;
}

export async function getAllQueueItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll('sync_queue');
}

export async function getPendingQueueItems(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  const index = db.transaction('sync_queue').store.index('by-status');
  return index.getAll('PENDING_SYNC');
}

export async function updateQueueItem(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  await db.put('sync_queue', item);
}

export async function removeQueueItem(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('sync_queue', id);
}

// -------------------------------------------------------------
// SYNCED HISTORY OPERATIONS
// -------------------------------------------------------------

export async function markItemAsSynced(item: SyncQueueItem): Promise<void> {
  const db = await getDB();
  const syncedItem: SyncQueueItem = {
    ...item,
    status: 'SYNCED',
    syncedAt: new Date().toISOString()
  };

  const tx = db.transaction(['sync_queue', 'synced_history'], 'readwrite');
  if (item.id !== undefined) {
    await tx.objectStore('sync_queue').delete(item.id);
  }
  await tx.objectStore('synced_history').put(syncedItem);
  await tx.done;
}

export async function getSyncedHistory(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll('synced_history');
}

export async function deleteHistoryItem(uuid: string): Promise<void> {
  const db = await getDB();
  await db.delete('synced_history', uuid);
}

export async function clearAllLocalData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['drafts', 'sync_queue', 'synced_history'], 'readwrite');
  await tx.objectStore('drafts').clear();
  await tx.objectStore('sync_queue').clear();
  await tx.objectStore('synced_history').clear();
  await tx.done;
}
