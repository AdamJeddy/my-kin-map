import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { db, initializeSettings, DEFAULT_SETTINGS } from './schema';
import type { Person, Family, FamilyTree, Settings, PersonFormData, FamilyFormData, FamilyType } from '@/types';

// ==================== PERSON HOOKS ====================

export function usePerson(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.persons.get(id) : undefined),
    [id]
  );
}

export function usePersons() {
  return useLiveQuery(
    () => db.persons.filter(p => !p._deleted).toArray(),
    []
  );
}

export function usePersonsByTree(treeId: string | undefined) {
  // For now, return all persons (tree filtering will be added later)
  return useLiveQuery(
    () => db.persons.filter(p => !p._deleted).toArray(),
    [treeId]
  );
}

export async function createPerson(data: PersonFormData): Promise<Person> {
  const now = new Date();
  const person: Person = {
    id: uuidv4(),
    _rev: uuidv4(),
    createdAt: now,
    updatedAt: now,
    givenNames: data.givenNames,
    surname: data.surname,
    birthName: data.birthName,
    sex: data.sex,
    birth: data.birthDate || data.birthPlace 
      ? { date: data.birthDate, place: data.birthPlace } 
      : undefined,
    death: data.deathDate || data.deathPlace
      ? { date: data.deathDate, place: data.deathPlace }
      : undefined,
    notes: data.notes
  };
  
  await db.persons.add(person);
  return person;
}

export async function updatePerson(id: string, data: Partial<PersonFormData>): Promise<void> {
  const person = await db.persons.get(id);
  if (!person) throw new Error('Person not found');

  const updates: Partial<Person> = {
    _rev: uuidv4(),
    updatedAt: new Date()
  };

  if (data.givenNames !== undefined) updates.givenNames = data.givenNames;
  if (data.surname !== undefined) updates.surname = data.surname;
  if (data.birthName !== undefined) updates.birthName = data.birthName;
  if (data.sex !== undefined) updates.sex = data.sex;
  if (data.notes !== undefined) updates.notes = data.notes;

  if (data.birthDate !== undefined || data.birthPlace !== undefined) {
    updates.birth = {
      date: data.birthDate ?? person.birth?.date,
      place: data.birthPlace ?? person.birth?.place
    };
  }

  if (data.deathDate !== undefined || data.deathPlace !== undefined) {
    updates.death = {
      date: data.deathDate ?? person.death?.date,
      place: data.deathPlace ?? person.death?.place
    };
  }

  await db.persons.update(id, updates);
}

export async function updatePersonPhoto(id: string, photo: Blob, thumbnail?: Blob): Promise<void> {
  await db.persons.update(id, {
    photo,
    photoThumbnail: thumbnail,
    _rev: uuidv4(),
    updatedAt: new Date()
  });
}

export async function deletePerson(id: string, hard = false): Promise<void> {
  if (hard) {
    await db.persons.delete(id);
  } else {
    // Soft delete for sync support
    await db.persons.update(id, {
      _deleted: true,
      _rev: uuidv4(),
      updatedAt: new Date()
    });
  }
}

// ==================== FAMILY HOOKS ====================

export function useFamily(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.families.get(id) : undefined),
    [id]
  );
}

export function useFamilies() {
  return useLiveQuery(
    () => db.families.filter(f => !f._deleted).toArray(),
    []
  );
}

export function useFamiliesByPerson(personId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!personId) return [];
      const asSpouse1 = await db.families.where('spouse1Id').equals(personId).toArray();
      const asSpouse2 = await db.families.where('spouse2Id').equals(personId).toArray();
      const asChild = await db.families.where('childIds').equals(personId).toArray();
      
      // Deduplicate and filter deleted
      const allFamilies = [...asSpouse1, ...asSpouse2, ...asChild];
      const uniqueIds = new Set<string>();
      return allFamilies.filter(f => {
        if (f._deleted || uniqueIds.has(f.id)) return false;
        uniqueIds.add(f.id);
        return true;
      });
    },
    [personId]
  );
}

export async function createFamily(data: FamilyFormData): Promise<Family> {
  const now = new Date();
  const family: Family = {
    id: uuidv4(),
    _rev: uuidv4(),
    createdAt: now,
    updatedAt: now,
    spouse1Id: data.spouse1Id,
    spouse2Id: data.spouse2Id,
    marriageDate: data.marriageDate || data.marriagePlace
      ? { date: data.marriageDate, place: data.marriagePlace }
      : undefined,
    divorceDate: data.divorceDate
      ? { date: data.divorceDate }
      : undefined,
    childIds: [],
    type: data.type
  };

  await db.families.add(family);
  return family;
}

export async function addChildToFamily(familyId: string, childId: string): Promise<void> {
  const family = await db.families.get(familyId);
  if (!family) throw new Error('Family not found');

  if (!family.childIds.includes(childId)) {
    await db.families.update(familyId, {
      childIds: [...family.childIds, childId],
      _rev: uuidv4(),
      updatedAt: new Date()
    });
  }
}

export async function removeChildFromFamily(familyId: string, childId: string): Promise<void> {
  const family = await db.families.get(familyId);
  if (!family) throw new Error('Family not found');

  await db.families.update(familyId, {
    childIds: family.childIds.filter(id => id !== childId),
    _rev: uuidv4(),
    updatedAt: new Date()
  });
}

// Create or reuse a family between two spouses (order-insensitive)
export async function getOrCreateFamily(spouseAId?: string, spouseBId?: string, type: FamilyType = 'unknown'): Promise<Family> {
  const pair = [spouseAId, spouseBId].filter(Boolean) as string[];
  if (pair.length === 0) {
    throw new Error('At least one spouse is required to create a family');
  }

  const [a, b] = pair;

  // Try to find an existing family with the same spouses (order agnostic)
  const existing = (await db.families
    .filter(f => !f._deleted &&
      ((f.spouse1Id === a && f.spouse2Id === b) || (f.spouse1Id === b && f.spouse2Id === a)))
    .toArray())[0];

  if (existing) return existing;

  return createFamily({
    spouse1Id: a,
    spouse2Id: b,
    type,
  });
}

// Ensure a child is linked to the given parents (one or two)
export async function linkParentsToChild(parentIds: string[], childId: string): Promise<void> {
  if (parentIds.length === 0) return;

  const [first, second] = parentIds;
  const family = await getOrCreateFamily(first, second);
  await addChildToFamily(family.id, childId);
}

// Link a person to an optional spouse and children in one go
export async function linkSpouseAndChildren(personId: string, spouseId?: string, childIds: string[] = []): Promise<void> {
  if (!spouseId && childIds.length === 0) return; // Nothing to do

  // If no spouse, create a single-parent family using personId
  const family = await getOrCreateFamily(personId, spouseId);

  for (const childId of childIds) {
    await addChildToFamily(family.id, childId);
  }
}

export async function deleteFamily(id: string, hard = false): Promise<void> {
  if (hard) {
    await db.families.delete(id);
  } else {
    await db.families.update(id, {
      _deleted: true,
      _rev: uuidv4(),
      updatedAt: new Date()
    });
  }
}

// ==================== TREE HOOKS ====================

export function useTree(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.trees.get(id) : undefined),
    [id]
  );
}

export function useTrees() {
  return useLiveQuery(
    () => db.trees.filter(t => !t._deleted).toArray(),
    []
  );
}

export async function createTree(name: string, description?: string, rootPersonId?: string): Promise<FamilyTree> {
  const now = new Date();
  const tree: FamilyTree = {
    id: uuidv4(),
    _rev: uuidv4(),
    createdAt: now,
    updatedAt: now,
    name,
    description,
    rootPersonId
  };

  await db.trees.add(tree);
  return tree;
}

export async function updateTree(id: string, data: Partial<Pick<FamilyTree, 'name' | 'description' | 'rootPersonId'>>): Promise<void> {
  await db.trees.update(id, {
    ...data,
    _rev: uuidv4(),
    updatedAt: new Date()
  });
}

export async function deleteTree(id: string, hard = false): Promise<void> {
  if (hard) {
    await db.trees.delete(id);
  } else {
    await db.trees.update(id, {
      _deleted: true,
      _rev: uuidv4(),
      updatedAt: new Date()
    });
  }
}

// ==================== SETTINGS HOOKS ====================

export function useSettings() {
  return useLiveQuery(
    async () => {
      const settings = await db.settings.get('user-settings');
      return settings ?? DEFAULT_SETTINGS;
    },
    []
  );
}

export async function updateSettings(data: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await initializeSettings(); // Ensure settings exist
  await db.settings.update('user-settings', data);
}

// ==================== UTILITY FUNCTIONS ====================

export async function getPersonWithRelations(personId: string) {
  const person = await db.persons.get(personId);
  if (!person) return null;

  // Find families where this person is a spouse
  const asSpouse1 = await db.families.where('spouse1Id').equals(personId).toArray();
  const asSpouse2 = await db.families.where('spouse2Id').equals(personId).toArray();
  const spouseFamilies = [...asSpouse1, ...asSpouse2].filter(f => !f._deleted);

  // Find family where this person is a child
  const parentFamilies = await db.families.where('childIds').equals(personId).toArray();
  const birthFamily = parentFamilies.find(f => !f._deleted);

  // Get parents
  let parents: Person[] = [];
  if (birthFamily) {
    const parentIds = [birthFamily.spouse1Id, birthFamily.spouse2Id].filter(Boolean) as string[];
    parents = await db.persons.bulkGet(parentIds).then(p => p.filter(Boolean) as Person[]);
  }

  // Get spouses
  const spouseIds = spouseFamilies
    .map(f => f.spouse1Id === personId ? f.spouse2Id : f.spouse1Id)
    .filter(Boolean) as string[];
  const spouses = await db.persons.bulkGet(spouseIds).then(p => p.filter(Boolean) as Person[]);

  // Get children
  const childIds = spouseFamilies.flatMap(f => f.childIds);
  const children = await db.persons.bulkGet([...new Set(childIds)]).then(p => p.filter(Boolean) as Person[]);

  // Get siblings
  let siblings: Person[] = [];
  if (birthFamily) {
    const siblingIds = birthFamily.childIds.filter(id => id !== personId);
    siblings = await db.persons.bulkGet(siblingIds).then(p => p.filter(Boolean) as Person[]);
  }

  return {
    person,
    parents,
    spouses,
    children,
    siblings,
    spouseFamilies,
    birthFamily
  };
}
