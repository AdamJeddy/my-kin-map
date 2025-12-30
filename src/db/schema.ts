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

// Load sample/test data
export async function loadSampleData(): Promise<void> {
  try {
    // Fetch the sample data
    const response = await fetch('/test-data/sample-family.json');
    const data = await response.json();

    // Check if data already exists
    const personCount = await db.persons.count();
    if (personCount > 0) {
      const confirmed = window.confirm(
        `You already have ${personCount} people in your family tree. ` +
        'Loading sample data will add more people. Continue?'
      );
      if (!confirmed) return;
    }

    // Import persons
    for (const person of data.persons) {
      await db.persons.put({
        ...person,
        createdAt: new Date(person.createdAt),
        updatedAt: new Date(person.updatedAt),
      });
    }

    // Import families
    for (const family of data.families) {
      await db.families.put({
        ...family,
        createdAt: new Date(family.createdAt),
        updatedAt: new Date(family.updatedAt),
      });
    }

    // Import trees
    for (const tree of data.trees) {
      await db.trees.put({
        ...tree,
        createdAt: new Date(tree.createdAt),
        updatedAt: new Date(tree.updatedAt),
      });
    }
  } catch (error) {
    console.error('Failed to load sample data:', error);
    throw new Error('Failed to load sample data. Please try again.');
  }
}

// Export the database for use in hooks
export type { FamilyTreeDatabase };
