import { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type NodeTypes,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { LayoutGrid, LayoutList, ZoomIn, ZoomOut, Maximize, Zap } from 'lucide-react';

import { PersonNode } from './PersonNode';
import { CoupleNode } from './CoupleNode';
import { generateTreeLayout, autoLayoutTree } from './layout';
import { Button } from '@/components/ui';
import { useIsMobile } from '@/hooks';
import { useSettings, updateSettings } from '@/db';
import type { Person, Family, TreeLayoutOrientation } from '@/types';

// Register custom node types
const nodeTypes: NodeTypes = {
  person: PersonNode,
  couple: CoupleNode,
};

interface FamilyTreeViewProps {
  persons: Person[];
  families: Family[];
  rootPersonId?: string;
  onPersonClick?: (person: Person) => void;
  onPersonDoubleClick?: (person: Person) => void;
  onBackgroundClick?: () => void;
}

// Inner component that can use useReactFlow
function TreeContent({
  persons,
  families,
  rootPersonId,
  isMobile,
  settings,
}: Omit<FamilyTreeViewProps, 'onPersonClick' | 'onPersonDoubleClick' | 'onBackgroundClick'> & { isMobile: boolean; settings: ReturnType<typeof useSettings> }) {
  const orientation = settings?.layoutOrientation ?? 'vertical';
  const { fitView } = useReactFlow();

  // Generate initial layout
  const initialLayout = useMemo(() => {
    return generateTreeLayout(persons, families, rootPersonId, orientation, isMobile);
  }, [persons, families, rootPersonId, orientation, isMobile]);

  const [nodes, setNodes] = useNodesState(initialLayout.nodes);
  const [edges, setEdges] = useEdgesState(initialLayout.edges);

  // Update nodes when layout changes
  useMemo(() => {
    setNodes(initialLayout.nodes);
    setEdges(initialLayout.edges);
  }, [initialLayout, setNodes, setEdges]);

  // Auto-layout on data load (initial load or sample data import)
  useEffect(() => {
    if (nodes.length === 0) return;
    
    const shouldAutoLayout = localStorage.getItem('triggerAutoLayout');
    const hasProcessedInitialLayout = sessionStorage.getItem('hasProcessedInitialLayout');
    
    // Run auto-layout if explicitly triggered (sample data) or on first load with data
    if (shouldAutoLayout || !hasProcessedInitialLayout) {
      const layoutedNodes = autoLayoutTree(nodes, edges, orientation, isMobile);
      setNodes(layoutedNodes);
      
      // Fit view to see all nodes after layout
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 500 });
      }, 100);
      
      localStorage.removeItem('triggerAutoLayout');
      sessionStorage.setItem('hasProcessedInitialLayout', 'true');
    }
  }, [persons.length, nodes, edges, orientation, isMobile, setNodes, fitView]);

  // Toggle layout orientation
  const toggleOrientation = useCallback(async () => {
    const newOrientation: TreeLayoutOrientation = 
      orientation === 'vertical' ? 'horizontal' : 'vertical';
    await updateSettings({ layoutOrientation: newOrientation });
  }, [orientation]);

  // Auto-layout handler
  const handleAutoLayout = useCallback(() => {
    const layoutedNodes = autoLayoutTree(nodes, edges, orientation, isMobile);
    setNodes(layoutedNodes);
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 500 });
    }, 50);
  }, [nodes, edges, orientation, isMobile, setNodes, fitView]);

  return (
    <>
      <Background gap={20} size={1} />
      
      {/* Controls - desktop only */}
      {!isMobile && (
        <Controls 
          showInteractive={false}
          className="!bg-background !border !border-border !rounded-lg !shadow-md"
        />
      )}

      {/* MiniMap - desktop only */}
      {!isMobile && (
        <MiniMap 
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="!bg-background !border !border-border !rounded-lg"
        />
      )}

      {/* Layout toggle panel */}
      <Panel position="top-right" className="flex gap-2">
        <Button
          variant="outline"
          size={isMobile ? 'icon' : 'sm'}
          onClick={handleAutoLayout}
          title="Auto-arrange nodes to reduce overlap"
        >
          <Zap className="h-4 w-4" />
          {!isMobile && <span className="ml-2">Auto Layout</span>}
        </Button>
        <Button
          variant="outline"
          size={isMobile ? 'icon' : 'sm'}
          onClick={toggleOrientation}
          title={`Switch to ${orientation === 'vertical' ? 'horizontal' : 'vertical'} layout`}
        >
          {orientation === 'vertical' ? (
            <LayoutList className="h-4 w-4" />
          ) : (
            <LayoutGrid className="h-4 w-4" />
          )}
          {!isMobile && (
            <span className="ml-2">
              {orientation === 'vertical' ? 'Horizontal' : 'Vertical'}
            </span>
          )}
        </Button>
      </Panel>

      {/* Mobile zoom controls */}
      {isMobile && (
        <Panel position="bottom-right" className="flex flex-col gap-2 mb-20">
          <Button variant="outline" size="icon" className="h-10 w-10">
            <ZoomIn className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10">
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" className="h-10 w-10">
            <Maximize className="h-5 w-5" />
          </Button>
        </Panel>
      )}
    </>
  );
}

export function FamilyTreeView({
  persons,
  families,
  rootPersonId,
  onPersonClick,
  onPersonDoubleClick,
  onBackgroundClick,
}: FamilyTreeViewProps) {
  const isMobile = useIsMobile();
  const settings = useSettings();

  // Generate initial layout
  const initialLayout = useMemo(() => {
    const orientation = settings?.layoutOrientation ?? 'vertical';
    return generateTreeLayout(persons, families, rootPersonId, orientation, isMobile);
  }, [persons, families, rootPersonId, settings?.layoutOrientation, isMobile]);

  const [nodes] = useNodesState(initialLayout.nodes);
  const [edges] = useEdgesState(initialLayout.edges);

  // Empty state
  if (persons.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <div className="text-center p-8">
          <p className="text-lg font-medium text-muted-foreground mb-2">
            No family members yet
          </p>
          <p className="text-sm text-muted-foreground">
            Add your first person to start building your family tree
          </p>
        </div>
      </div>
    );
  }

  // These need to be defined at this level for ReactFlow handlers
  const handleNodeClickWrapper = useCallback(
    (_event: React.MouseEvent, node: any) => {
      const person = node.data.person || node.data.person1;
      if (onPersonClick && person) {
        onPersonClick(person);
      }
    },
    [onPersonClick]
  );

  const handleNodeDoubleClickWrapper = useCallback(
    (_event: React.MouseEvent, node: any) => {
      const person = node.data.person || node.data.person1;
      if (onPersonDoubleClick && person) {
        onPersonDoubleClick(person);
      }
    },
    [onPersonDoubleClick]
  );

  const handlePaneClickWrapper = useCallback(() => {
    if (onBackgroundClick) {
      onBackgroundClick();
    }
  }, [onBackgroundClick]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClickWrapper}
        onNodeDoubleClick={handleNodeDoubleClickWrapper}
        onPaneClick={handlePaneClickWrapper}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        zoomOnPinch={true}
        panOnDrag={true}
        selectionOnDrag={false}
        nodesDraggable={!isMobile}
        nodeDragThreshold={10}
        elementsSelectable={true}
        nodesConnectable={false}
        aria-label="Family tree visualization"
      >
        <TreeContent
          persons={persons}
          families={families}
          rootPersonId={rootPersonId}
          isMobile={isMobile}
          settings={settings}
        />
      </ReactFlow>
    </div>
  );
}
