import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
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

// Inner component that uses ReactFlow hooks
function FamilyTreeViewInner({
  persons,
  families,
  rootPersonId,
  onPersonClick,
  onPersonDoubleClick,
  onBackgroundClick,
}: FamilyTreeViewProps) {
  const isMobile = useIsMobile();
  const settings = useSettings();
  const orientation = settings?.layoutOrientation ?? 'vertical';
  const { fitView } = useReactFlow();

  // Inject click handlers into couple nodes
  const injectHandlersIntoNodes = useCallback((nodes: any[]) => {
    return nodes.map(node => {
      if (node.type === 'couple') {
        return {
          ...node,
          data: {
            ...node.data,
            onPersonClick,
            onPersonDoubleClick,
          },
        };
      }
      return node;
    });
  }, [onPersonClick, onPersonDoubleClick]);

  // Generate initial layout
  const initialLayout = useMemo(() => {
    const layout = generateTreeLayout(persons, families, rootPersonId, orientation, isMobile);
    return {
      nodes: injectHandlersIntoNodes(layout.nodes),
      edges: layout.edges,
    };
  }, [persons, families, rootPersonId, orientation, isMobile, injectHandlersIntoNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);

  // Track previous orientation to detect changes
  const prevOrientationRef = useRef(orientation);

  // Update nodes when persons/families/orientation changes
  useEffect(() => {
    const newLayout = generateTreeLayout(persons, families, rootPersonId, orientation, isMobile);
    
    // If orientation changed, apply auto-layout for better arrangement
    if (prevOrientationRef.current !== orientation) {
      const layoutedNodes = autoLayoutTree(newLayout.nodes, newLayout.edges, orientation, isMobile);
      setNodes(injectHandlersIntoNodes(layoutedNodes));
      setEdges(newLayout.edges);
      prevOrientationRef.current = orientation;
      setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 50);
    } else {
      setNodes(injectHandlersIntoNodes(newLayout.nodes));
      setEdges(newLayout.edges);
    }
  }, [persons, families, rootPersonId, orientation, isMobile, setNodes, setEdges, fitView, injectHandlersIntoNodes]);

  // Auto-layout on sample data import
  useEffect(() => {
    const shouldAutoLayout = localStorage.getItem('triggerAutoLayout');
    if (shouldAutoLayout && nodes.length > 0) {
      setTimeout(() => {
        setNodes((currentNodes) => autoLayoutTree(currentNodes, edges, orientation, isMobile));
        setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 100);
      }, 100);
      localStorage.removeItem('triggerAutoLayout');
    }
  }, [nodes.length, edges, orientation, isMobile, setNodes, fitView]);

  // Toggle layout orientation
  const toggleOrientation = useCallback(async () => {
    const newOrientation: TreeLayoutOrientation = 
      orientation === 'vertical' ? 'horizontal' : 'vertical';
    await updateSettings({ layoutOrientation: newOrientation });
  }, [orientation]);

  // Auto-layout handler
  const handleAutoLayout = useCallback(() => {
    setNodes((currentNodes) => autoLayoutTree(currentNodes, edges, orientation, isMobile));
    setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 50);
  }, [edges, orientation, isMobile, setNodes, fitView]);

  // Node click handlers
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      const person = node.data.person || node.data.person1;
      if (onPersonClick && person) {
        onPersonClick(person);
      }
    },
    [onPersonClick]
  );

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      const person = node.data.person || node.data.person1;
      if (onPersonDoubleClick && person) {
        onPersonDoubleClick(person);
      }
    },
    [onPersonDoubleClick]
  );

  const handlePaneClick = useCallback(() => {
    if (onBackgroundClick) {
      onBackgroundClick();
    }
  }, [onBackgroundClick]);

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

  return (
    <div className="w-full h-full">
      <ReactFlow
        style={{ touchAction: 'none' }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        zoomOnPinch={true}
        panOnDrag={isMobile ? false : true}
        panOnScroll={isMobile}
        panOnScrollMode="free"
        selectionOnDrag={false}
        nodesDraggable={true}
        nodeDragThreshold={isMobile ? 0 : 10}
        elementsSelectable={true}
        nodesConnectable={false}
        aria-label="Family tree visualization"
      >
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
      </ReactFlow>
    </div>
  );
}

// Wrapper component that provides ReactFlowProvider
export function FamilyTreeView(props: FamilyTreeViewProps) {
  return (
    <ReactFlowProvider>
      <FamilyTreeViewInner {...props} />
    </ReactFlowProvider>
  );
}
