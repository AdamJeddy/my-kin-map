import type { Edge } from '@xyflow/react';
import dagre from 'dagre';
import type { Person, Family, TreeLayoutOrientation } from '@/types';
import type { PersonNode } from './PersonNode';
import type { CoupleNode } from './CoupleNode';

type TreeNode = PersonNode | CoupleNode;

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  spouseSpacing: number;
}

const LAYOUT_CONFIG: Record<'desktop' | 'mobile', LayoutConfig> = {
  desktop: {
    nodeWidth: 200, // Increased for couple nodes
    nodeHeight: 140, // Increased for couple nodes
    horizontalSpacing: 100,
    verticalSpacing: 160,
    spouseSpacing: 40,
  },
  mobile: {
    nodeWidth: 120, // Reduced for mobile
    nodeHeight: 80, // Reduced for mobile
    horizontalSpacing: 40, // More compact
    verticalSpacing: 80, // Reduced vertical spacing
    spouseSpacing: 15,
  },
};

interface LayoutResult {
  nodes: TreeNode[];
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
  const nodes: TreeNode[] = [];
  const edges: Edge[] = [];
  const positioned = new Set<string>();
  const personToCoupleNodeId = new Map<string, string>(); // Maps person IDs to couple node IDs

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

  // Pre-create couple nodes to avoid creating them multiple times
  const createdCouples = new Set<string>();
  families.forEach(family => {
    if (family.spouse1Id && family.spouse2Id && family.childIds.length > 0) {
      // Only create couple nodes for families with children
      const coupleKey = [family.spouse1Id, family.spouse2Id].sort().join('-');
      if (!createdCouples.has(coupleKey)) {
        createdCouples.add(coupleKey);
        const coupleNodeId = `couple-${coupleKey}`;
        personToCoupleNodeId.set(family.spouse1Id, coupleNodeId);
        personToCoupleNodeId.set(family.spouse2Id, coupleNodeId);
      }
    }
  });

  // Position a person or couple node
  function positionPerson(
    person: Person,
    x: number,
    y: number,
    isRoot: boolean = false
  ): void {
    if (positioned.has(person.id)) return;

    const coupleNodeId = personToCoupleNodeId.get(person.id);
    
    // If this person should be part of a couple node, create it (only once)
    if (coupleNodeId && !nodes.some(n => n.id === coupleNodeId)) {
      // Find the spouse by looking at families
      const family = families.find(f => 
        (f.spouse1Id === person.id && f.spouse2Id) || 
        (f.spouse2Id === person.id && f.spouse1Id)
      );
      
      if (family) {
        const spouseId = family.spouse1Id === person.id ? family.spouse2Id : family.spouse1Id;
        const spouse = personMap.get(spouseId!);
        
        if (spouse && !positioned.has(spouseId!)) {
          positioned.add(person.id);
          positioned.add(spouseId!);
          
          (nodes as CoupleNode[]).push({
            id: coupleNodeId,
            type: 'couple',
            position: { x, y },
            data: {
              person1: person,
              person2: spouse,
              isRoot,
              compact: isMobile,
              orientation,
            },
          } as CoupleNode);
          return;
        }
      }
    }
    
    // If spouse already positioned, mark this person as positioned too
    if (coupleNodeId && positioned.has(person.id)) return;
    positioned.add(person.id);

    // Create individual person node
    (nodes as PersonNode[]).push({
      id: person.id,
      type: 'person',
      position: { x, y },
      data: {
        person,
        isRoot,
        compact: isMobile,
        orientation,
      },
    } as PersonNode);
  }

  // Create edge between nodes
  function createEdge(
    sourceId: string,
    targetId: string,
    type: 'spouse' | 'parent-child'
  ): void {
    // Skip spouse edges for couple nodes (they're built into the node)
    if (type === 'spouse' && (personToCoupleNodeId.has(sourceId) || personToCoupleNodeId.has(targetId))) {
      return;
    }

    // Resolve to actual node IDs (accounting for couple nodes)
    const sourceNodeId = personToCoupleNodeId.get(sourceId) || sourceId;
    const targetNodeId = personToCoupleNodeId.get(targetId) || targetId;
    
    const edgeId = `${sourceNodeId}-${targetNodeId}`;
    if (edges.some(e => e.id === edgeId)) return;

    edges.push({
      id: edgeId,
      source: sourceNodeId,
      target: targetNodeId,
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

/**
 * Auto-layout tree using dagre for hierarchical positioning
 * This provides better spacing and prevents node overlap
 */
export function autoLayoutTree(
  nodes: TreeNode[],
  edges: Edge[],
  orientation: TreeLayoutOrientation = 'vertical',
  isMobile: boolean = false
): TreeNode[] {
  if (nodes.length === 0) return nodes;

  const config = isMobile ? LAYOUT_CONFIG.mobile : LAYOUT_CONFIG.desktop;
  
  // Create a directed graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: orientation === 'vertical' ? 'TB' : 'LR',
    nodesep: config.horizontalSpacing,
    ranksep: config.verticalSpacing,
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes to graph
  nodes.forEach(node => {
    const isCoupleNode = node.type === 'couple';
    g.setNode(node.id, {
      width: isCoupleNode ? config.nodeWidth : config.nodeWidth,
      height: isCoupleNode ? config.nodeHeight : config.nodeHeight,
    });
  });

  // Add edges to graph
  edges.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  // Run layout algorithm
  dagre.layout(g);

  // Update node positions with computed layout
  const layoutedNodes = nodes.map(node => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - config.nodeWidth / 2,
        y: pos.y - config.nodeHeight / 2,
      },
    };
  });

  return layoutedNodes;
}
