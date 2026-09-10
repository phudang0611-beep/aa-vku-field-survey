export type SurveyCategory = 'Hardware' | 'Projector' | 'AC' | 'Electrical' | 'Furniture';

export type SyncStatus = 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SurveyFormData {
  building: string;
  floor: string;
  roomNumber: string;
  category: SurveyCategory;
  conditionRating: number; // 1 to 5
  defectNotes: string;
  photoBase64?: string;
  inspectorName?: string;
}

export interface SyncQueueItem {
  id?: number; // Auto-increment ID in IndexedDB
  uuid: string; // Mandatory UUID
  createdAt: string; // ISO string
  status: SyncStatus;
  data: SurveyFormData;
  syncedAt?: string;
  retryCount: number;
  lastError?: string;
}

export interface SurveyDraft {
  key: 'current_draft';
  data: Partial<SurveyFormData>;
  currentStep: number;
  updatedAt: string;
}

export interface NetworkState {
  isOnline: boolean;
  connectionType?: string;
  isSimulatedOffline?: boolean;
}
