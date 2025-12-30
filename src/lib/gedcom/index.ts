import { parse as parseGedcom } from 'parse-gedcom';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/db';
import type { Person, Family, Sex, FamilyType } from '@/types';

interface GedcomIndividual {
  pointer: string;
  tree: Array<{
    tag: string;
    data?: string;
    tree?: Array<{
      tag: string;
      data?: string;
    }>;
  }>;
}

interface GedcomFamily {
  pointer: string;
  tree: Array<{
    tag: string;
    data?: string;
    tree?: Array<{
      tag: string;
      data?: string;
    }>;
  }>;
}

// Map GEDCOM pointers to our IDs
const pointerToIdMap = new Map<string, string>();

function getOrCreateId(pointer: string): string {
  if (!pointerToIdMap.has(pointer)) {
    pointerToIdMap.set(pointer, uuidv4());
  }
  return pointerToIdMap.get(pointer)!;
}

function extractValue(record: GedcomIndividual | GedcomFamily, tag: string): string | undefined {
  const node = record.tree.find(n => n.tag === tag);
  return node?.data;
}

function extractNestedValue(record: GedcomIndividual | GedcomFamily, parentTag: string, childTag: string): string | undefined {
  const parent = record.tree.find(n => n.tag === parentTag);
  if (!parent?.tree) return undefined;
  const child = parent.tree.find(n => n.tag === childTag);
  return child?.data;
}

function parseSex(sexValue: string | undefined): Sex {
  if (sexValue === 'M') return 'M';
  if (sexValue === 'F') return 'F';
  return 'U';
}

function parseIndividual(record: GedcomIndividual): Person {
  const id = getOrCreateId(record.pointer);
  const now = new Date();

  // Parse name
  const nameNode = record.tree.find(n => n.tag === 'NAME');
  let givenNames = '';
  let surname = '';
  
  if (nameNode?.data) {
    // GEDCOM name format: "Given Names /Surname/"
    const nameMatch = nameNode.data.match(/^([^/]*)\/?([^/]*)\/?$/);
    if (nameMatch) {
      givenNames = nameMatch[1].trim();
      surname = nameMatch[2].trim();
    }
  }

  // Check for structured name parts
  if (nameNode?.tree) {
    const givn = nameNode.tree.find(n => n.tag === 'GIVN');
    const surn = nameNode.tree.find(n => n.tag === 'SURN');
    if (givn?.data) givenNames = givn.data;
    if (surn?.data) surname = surn.data;
  }

  // Parse birth
  const birthDate = extractNestedValue(record, 'BIRT', 'DATE');
  const birthPlace = extractNestedValue(record, 'BIRT', 'PLAC');

  // Parse death
  const deathDate = extractNestedValue(record, 'DEAT', 'DATE');
  const deathPlace = extractNestedValue(record, 'DEAT', 'PLAC');

  // Parse notes
  const noteNode = record.tree.find(n => n.tag === 'NOTE');
  const notes = noteNode?.data;

  return {
    id,
    _rev: uuidv4(),
    createdAt: now,
    updatedAt: now,
    givenNames: givenNames || 'Unknown',
    surname: surname || '',
    sex: parseSex(extractValue(record, 'SEX')),
    birth: birthDate || birthPlace ? { date: birthDate, place: birthPlace } : undefined,
    death: deathDate || deathPlace ? { date: deathDate, place: deathPlace } : undefined,
    notes,
  };
}

function parseFamily(record: GedcomFamily): Family {
  const id = getOrCreateId(record.pointer);
  const now = new Date();

  // Get spouses
  const husbNode = record.tree.find(n => n.tag === 'HUSB');
  const wifeNode = record.tree.find(n => n.tag === 'WIFE');
  
  const spouse1Id = husbNode?.data ? getOrCreateId(husbNode.data) : undefined;
  const spouse2Id = wifeNode?.data ? getOrCreateId(wifeNode.data) : undefined;

  // Get children
  const childNodes = record.tree.filter(n => n.tag === 'CHIL');
  const childIds = childNodes.map(n => n.data ? getOrCreateId(n.data) : '').filter(Boolean);

  // Parse marriage
  const marriageDate = extractNestedValue(record, 'MARR', 'DATE');
  const marriagePlace = extractNestedValue(record, 'MARR', 'PLAC');

  // Parse divorce
  const divorceDate = extractNestedValue(record, 'DIV', 'DATE');

  // Determine type
  let type: FamilyType = 'unknown';
  if (record.tree.some(n => n.tag === 'MARR')) {
    type = 'married';
  }

  return {
    id,
    _rev: uuidv4(),
    createdAt: now,
    updatedAt: now,
    spouse1Id,
    spouse2Id,
    childIds,
    marriageDate: marriageDate || marriagePlace ? { date: marriageDate, place: marriagePlace } : undefined,
    divorceDate: divorceDate ? { date: divorceDate } : undefined,
    type,
  };
}

export async function importGedcom(gedcomContent: string): Promise<{ persons: number; families: number }> {
  // Clear the pointer map for fresh import
  pointerToIdMap.clear();

  // Parse GEDCOM
  const parsed = parseGedcom(gedcomContent);
  
  // Extract individuals and families
  const individuals: GedcomIndividual[] = [];
  const familyRecords: GedcomFamily[] = [];

  // Normalize a record's pointer and children regardless of key names
  const normalize = (record: any) => {
    const pointer = record?.pointer || record?.id || record?.xref; // xref used by parse-gedcom
    const children = Array.isArray(record?.tree)
      ? record.tree
      : Array.isArray(record?.children)
        ? record.children
        : [];
    return { tag: record?.tag, pointer, children };
  };

  // Helper to walk any level and collect INDI/FAM records
  const collectRecords = (records: any[]) => {
    for (const raw of records) {
      const rec = normalize(raw);
      if (!rec.tag) continue;

      // Ensure downstream readers see pointer/tree
      if (rec.pointer) {
        (raw as any).pointer = rec.pointer;
      }
      if (!raw.tree && rec.children?.length) {
        (raw as any).tree = rec.children;
      }

      if (rec.tag === 'INDI' && rec.pointer) {
        individuals.push(raw as unknown as GedcomIndividual);
      } else if (rec.tag === 'FAM' && rec.pointer) {
        familyRecords.push(raw as unknown as GedcomFamily);
      }

      if (rec.children.length) {
        collectRecords(rec.children as any[]);
      }
    }
  };

  const parsedChildren = (parsed as any)?.children;
  const rootRecords = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsedChildren)
      ? parsedChildren
      : parsedChildren && typeof parsedChildren === 'object'
        ? Object.values(parsedChildren)
        : [];

  // If everything is nested under a HEAD node, descend once into it
  const maybeHead = rootRecords.length === 1 && (rootRecords[0] as any)?.tag === 'HEAD'
    ? normalize(rootRecords[0]).children
    : rootRecords;

  collectRecords(maybeHead as any[]);

  // Parse all records
  const persons = individuals.map(parseIndividual);
  const families = familyRecords.map(parseFamily);

  // Store in database
  await db.transaction('rw', [db.persons, db.families], async () => {
    for (const person of persons) {
      await db.persons.put(person);
    }
    for (const family of families) {
      await db.families.put(family);
    }
  });

  return {
    persons: persons.length,
    families: families.length,
  };
}

export async function exportGedcom(): Promise<string> {
  const persons = await db.persons.filter(p => !p._deleted).toArray();
  const families = await db.families.filter(f => !f._deleted).toArray();

  // Create ID to pointer map
  const idToPointer = new Map<string, string>();
  let indiCounter = 1;
  let famCounter = 1;

  for (const person of persons) {
    idToPointer.set(person.id, `@I${indiCounter++}@`);
  }
  for (const family of families) {
    idToPointer.set(family.id, `@F${famCounter++}@`);
  }

  const lines: string[] = [];

  // Header
  lines.push('0 HEAD');
  lines.push('1 SOUR My Kin Map');
  lines.push('2 VERS 1.0');
  lines.push('1 GEDC');
  lines.push('2 VERS 5.5.1');
  lines.push('2 FORM LINEAGE-LINKED');
  lines.push('1 CHAR UTF-8');
  lines.push(`1 DATE ${new Date().toISOString().split('T')[0].replace(/-/g, ' ').toUpperCase()}`);

  // Individuals
  for (const person of persons) {
    const pointer = idToPointer.get(person.id)!;
    lines.push(`0 ${pointer} INDI`);
    
    // Name
    const name = `${person.givenNames} /${person.surname}/`;
    lines.push(`1 NAME ${name}`);
    if (person.givenNames) lines.push(`2 GIVN ${person.givenNames}`);
    if (person.surname) lines.push(`2 SURN ${person.surname}`);
    
    // Sex
    if (person.sex !== 'U') {
      lines.push(`1 SEX ${person.sex}`);
    }
    
    // Birth
    if (person.birth?.date || person.birth?.place) {
      lines.push('1 BIRT');
      if (person.birth.date) lines.push(`2 DATE ${person.birth.date}`);
      if (person.birth.place) lines.push(`2 PLAC ${person.birth.place}`);
    }
    
    // Death
    if (person.death?.date || person.death?.place) {
      lines.push('1 DEAT');
      if (person.death.date) lines.push(`2 DATE ${person.death.date}`);
      if (person.death.place) lines.push(`2 PLAC ${person.death.place}`);
    }
    
    // Notes
    if (person.notes) {
      lines.push(`1 NOTE ${person.notes.replace(/\n/g, '\n2 CONT ')}`);
    }

    // Family links
    for (const family of families) {
      const famPointer = idToPointer.get(family.id)!;
      if (family.spouse1Id === person.id || family.spouse2Id === person.id) {
        lines.push(`1 FAMS ${famPointer}`);
      }
      if (family.childIds.includes(person.id)) {
        lines.push(`1 FAMC ${famPointer}`);
      }
    }
  }

  // Families
  for (const family of families) {
    const pointer = idToPointer.get(family.id)!;
    lines.push(`0 ${pointer} FAM`);
    
    // Spouses
    if (family.spouse1Id && idToPointer.has(family.spouse1Id)) {
      lines.push(`1 HUSB ${idToPointer.get(family.spouse1Id)}`);
    }
    if (family.spouse2Id && idToPointer.has(family.spouse2Id)) {
      lines.push(`1 WIFE ${idToPointer.get(family.spouse2Id)}`);
    }
    
    // Marriage
    if (family.type === 'married' || family.marriageDate) {
      lines.push('1 MARR');
      if (family.marriageDate?.date) lines.push(`2 DATE ${family.marriageDate.date}`);
      if (family.marriageDate?.place) lines.push(`2 PLAC ${family.marriageDate.place}`);
    }
    
    // Divorce
    if (family.divorceDate) {
      lines.push('1 DIV');
      if (family.divorceDate.date) lines.push(`2 DATE ${family.divorceDate.date}`);
    }
    
    // Children
    for (const childId of family.childIds) {
      if (idToPointer.has(childId)) {
        lines.push(`1 CHIL ${idToPointer.get(childId)}`);
      }
    }
  }

  // Trailer
  lines.push('0 TRLR');

  return lines.join('\n');
}
