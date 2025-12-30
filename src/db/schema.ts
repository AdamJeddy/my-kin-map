import Dexie, { type EntityTable } from 'dexie';
import type { Person, Family, FamilyTree, Settings } from '@/types';

// Define the database
class FamilyTreeDatabase extends Dexie {
  persons!: EntityTable<Person, 'id'>;
  families!: EntityTable<Family, 'id'>;
  trees!: EntityTable<FamilyTree, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor() {
    super('MyKinMapDB');
    
    this.version(1).stores({
      persons: 'id, surname, givenNames, updatedAt, _deleted',
      families: 'id, spouse1Id, spouse2Id, *childIds, updatedAt, _deleted',
      trees: 'id, name, rootPersonId, updatedAt, _deleted',
      settings: 'id'
    });
  }
}

// Create the database instance
export const db = new FamilyTreeDatabase();

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Storage persistence: ${isPersisted ? 'granted' : 'denied'}`);
    return isPersisted;
  }
  return false;
}

// Get storage estimate
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0
    };
  }
  return null;
}

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  id: 'user-settings',
  layoutOrientation: 'vertical',
  theme: 'system',
  hasSeenInstallPrompt: false
};

// Initialize default settings if not present
export async function initializeSettings(): Promise<Settings> {
  const existing = await db.settings.get('user-settings');
  if (!existing) {
    await db.settings.add(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  return existing;
}

// Export the database for use in hooks
export type { FamilyTreeDatabase };
