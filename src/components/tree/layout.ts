import type { Edge } from '@xyflow/react';
import type { Person, Family, TreeLayoutOrientation } from '@/types';
import type { PersonNode } from './PersonNode';

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  spouseSpacing: number;
}

const LAYOUT_CONFIG: Record<'desktop' | 'mobile', LayoutConfig> = {
  desktop: {
    nodeWidth: 180,
    nodeHeight: 100,
    horizontalSpacing: 60,
    verticalSpacing: 120,
    spouseSpacing: 40,
  },
  mobile: {
    nodeWidth: 130,
    nodeHeight: 70,
    horizontalSpacing: 30,
    verticalSpacing: 80,
    spouseSpacing: 20,
  },
};

interface LayoutResult {
  nodes: PersonNode[];
  edges: Edge[];
}

/**
 * Generate tree layout from persons and families
 * Supports both horizontal and vertical orientations
 */
export function generateTreeLayout(
  persons: Person[],
  families: Family[],
  rootPersonId: string | undefined,
  orientation: TreeLayoutOrientation = 'vertical',
  isMobile: boolean = false
): LayoutResult {
  if (persons.length === 0) {
    return { nodes: [], edges: [] };
  }

  const config = isMobile ? LAYOUT_CONFIG.mobile : LAYOUT_CONFIG.desktop;
  const personMap = new Map(persons.map(p => [p.id, p]));
  const nodes: PersonNode[] = [];
  const edges: Edge[] = [];
  const positioned = new Set<string>();

  // Find root person or use first person
  const rootPerson = rootPersonId 
    ? personMap.get(rootPersonId) 
    : persons[0];

  if (!rootPerson) {
    return { nodes: [], edges: [] };
  }

  // Build family lookup maps
  const personToSpouseFamilies = new Map<string, Family[]>();
  const personToBirthFamily = new Map<string, Family>();

  families.forEach(family => {
    if (family.spouse1Id) {
      const existing = personToSpouseFamilies.get(family.spouse1Id) || [];
      personToSpouseFamilies.set(family.spouse1Id, [...existing, family]);
    }
    if (family.spouse2Id) {
      const existing = personToSpouseFamilies.get(family.spouse2Id) || [];
      personToSpouseFamilies.set(family.spouse2Id, [...existing, family]);
    }
    family.childIds.forEach(childId => {
      personToBirthFamily.set(childId, family);
    });
  });

  // Position a person node
  function positionPerson(
    person: Person,
    x: number,
    y: number,
    isRoot: boolean = false
  ): void {
    if (positioned.has(person.id)) return;
    positioned.add(person.id);

    nodes.push({
      id: person.id,
      type: 'person',
      position: { x, y },
      data: {
        person,
        isRoot,
        compact: isMobile,
        orientation,
      },
    });
  }

  // Create edge between nodes
  function createEdge(
    sourceId: string,
    targetId: string,
    type: 'spouse' | 'parent-child'
  ): void {
    const edgeId = `${sourceId}-${targetId}`;
    if (edges.some(e => e.id === edgeId)) return;

    edges.push({
      id: edgeId,
      source: sourceId,
      target: targetId,
      type: 'smoothstep',
      style: {
        stroke: type === 'spouse' ? '#f472b6' : '#94a3b8',
        strokeWidth: type === 'spouse' ? 3 : 2,
        strokeDasharray: type === 'spouse' ? '5,5' : undefined,
      },
    });
  }

  // Recursive function to layout descendants
  function layoutDescendants(
    personId: string,
    x: number,
    y: number,
    generation: number
  ): number {
    const person = personMap.get(personId);
    if (!person || positioned.has(personId)) return x;

    const spouseFamilies = personToSpouseFamilies.get(personId) || [];
    let currentX = x;
    let personX = x;

    // If person has children, calculate position based on children's positions
    const childPositions: { childId: string; x: number }[] = [];

    spouseFamilies.forEach(family => {
      family.childIds.forEach(childId => {
        if (!positioned.has(childId)) {
          const childX = layoutDescendants(
            childId,
            currentX,
            orientation === 'vertical' 
              ? y + config.verticalSpacing 
              : y,
            generation + 1
          );
          childPositions.push({ childId, x: currentX });
          currentX = childX + config.horizontalSpacing;
        }
      });
    });

    // Position person centered above their children
    if (childPositions.length > 0) {
      const firstChildX = childPositions[0].x;
      const lastChildX = childPositions[childPositions.length - 1].x;
      personX = (firstChildX + lastChildX) / 2;
    }

    // Position the person
    positionPerson(person, personX, y, generation === 0);

    // Position spouse(s) and create spouse edges
    spouseFamilies.forEach((family, index) => {
      const spouseId = family.spouse1Id === personId ? family.spouse2Id : family.spouse1Id;
      if (spouseId && !positioned.has(spouseId)) {
        const spouse = personMap.get(spouseId);
        if (spouse) {
          const spouseX = personX + (index + 1) * (config.nodeWidth + config.spouseSpacing);
          positionPerson(spouse, spouseX, y);
          createEdge(personId, spouseId, 'spouse');
        }
      }

      // Create parent-child edges
      family.childIds.forEach(childId => {
        createEdge(personId, childId, 'parent-child');
        const spouseId = family.spouse1Id === personId ? family.spouse2Id : family.spouse1Id;
        if (spouseId) {
          createEdge(spouseId, childId, 'parent-child');
        }
      });
    });

    return Math.max(currentX, personX + config.nodeWidth);
  }

  // Recursive function to layout ancestors
  function layoutAncestors(
    personId: string,
    x: number,
    y: number,
    generation: number
  ): void {
    const birthFamily = personToBirthFamily.get(personId);
    if (!birthFamily) return;

    const parentIds = [birthFamily.spouse1Id, birthFamily.spouse2Id].filter(Boolean) as string[];
    
    parentIds.forEach((parentId, index) => {
      if (positioned.has(parentId)) return;
      
      const parent = personMap.get(parentId);
      if (!parent) return;

      const parentY = orientation === 'vertical' 
        ? y - config.verticalSpacing 
        : y;
      const parentX = x + (index - 0.5) * (config.nodeWidth + config.spouseSpacing);

      positionPerson(parent, parentX, parentY);
      createEdge(parentId, personId, 'parent-child');

      // Recursively layout grandparents
      layoutAncestors(parentId, parentX, parentY, generation + 1);
    });

    // Create spouse edge between parents
    if (parentIds.length === 2) {
      createEdge(parentIds[0], parentIds[1], 'spouse');
    }
  }

  // Start layout from root person
  const startX = 0;
  const startY = orientation === 'vertical' ? config.verticalSpacing * 2 : 0;

  // Layout descendants first
  layoutDescendants(rootPerson.id, startX, startY, 0);

  // Then layout ancestors
  layoutAncestors(rootPerson.id, startX, startY, 0);

  // Position any unconnected persons in a grid
  let unconnectedX = Math.max(...nodes.map(n => n.position.x), 0) + config.nodeWidth + config.horizontalSpacing * 2;
  let unconnectedY = startY;
  let unconnectedCount = 0;

  persons.forEach(person => {
    if (!positioned.has(person.id)) {
      positionPerson(person, unconnectedX, unconnectedY);
      unconnectedCount++;
      
      if (unconnectedCount % 3 === 0) {
        unconnectedX = Math.max(...nodes.map(n => n.position.x), 0) + config.nodeWidth + config.horizontalSpacing * 2;
        unconnectedY += config.nodeHeight + config.verticalSpacing / 2;
      } else {
        unconnectedX += config.nodeWidth + config.horizontalSpacing;
      }
    }
  });

  return { nodes, edges };
}
