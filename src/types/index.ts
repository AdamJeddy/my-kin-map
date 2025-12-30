// Core data types for the family tree application

export interface DatePlace {
  date?: string; // Flexible: "1985", "Mar 1985", "1985-03-15"
  place?: string;
  placeCoordinates?: [number, number];
}

export type Sex = 'M' | 'F' | 'U';

export type FamilyType = 'married' | 'partnership' | 'unknown';

export type TreeLayoutOrientation = 'horizontal' | 'vertical';

// Sync-ready base interface
export interface SyncableEntity {
  id: string;
  _rev: string; // Revision for conflict detection
  _deleted?: boolean; // Soft delete for sync
  createdAt: Date;
  updatedAt: Date;
}

export interface Person extends SyncableEntity {
  givenNames: string;
  surname: string;
  birthName?: string; // Maiden name
  sex: Sex;
  birth?: DatePlace;
  death?: DatePlace;
  photo?: Blob; // Stored as blob in IndexedDB
  photoThumbnail?: Blob; // Small version for tree view
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface Family extends SyncableEntity {
  spouse1Id?: string; // Person ID
  spouse2Id?: string; // Person ID
  marriageDate?: DatePlace;
  divorceDate?: DatePlace;
  childIds: string[]; // Ordered list of Person IDs
  type: FamilyType;
}

export interface FamilyTree extends SyncableEntity {
  name: string;
  description?: string;
  rootPersonId?: string; // The "home" person of this tree
}

export interface Settings {
  id: string;
  layoutOrientation: TreeLayoutOrientation;
  theme: 'light' | 'dark' | 'system';
  hasSeenInstallPrompt: boolean;
  lastBackupDate?: Date;
  lastViewedTreeId?: string;
  lastViewedPersonId?: string;
}

// Helper types for forms
export interface PersonFormData {
  givenNames: string;
  surname: string;
  birthName?: string;
  sex: Sex;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  notes?: string;
}

export interface FamilyFormData {
  spouse1Id?: string;
  spouse2Id?: string;
  marriageDate?: string;
  marriagePlace?: string;
  divorceDate?: string;
  divorcePlace?: string;
  type: FamilyType;
}

// Tree visualization types
export interface PersonNodeData {
  person: Person;
  isRoot?: boolean;
  isSelected?: boolean;
  compact?: boolean; // Mobile view
}

export interface FamilyEdgeData {
  family: Family;
  relationshipType: 'spouse' | 'parent-child';
}
