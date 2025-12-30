import { useCallback, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
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
  const orientation = settings?.layoutOrientation ?? 'vertical';

  // Generate initial layout
  const initialLayout = useMemo(() => {
    return generateTreeLayout(persons, families, rootPersonId, orientation, isMobile);
  }, [persons, families, rootPersonId, orientation, isMobile]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialLayout.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialLayout.edges);
  const [_selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Update nodes when layout changes
  useMemo(() => {
    setNodes(initialLayout.nodes);
    setEdges(initialLayout.edges);
  }, [initialLayout, setNodes, setEdges]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      const person = node.data.person || node.data.person1;
      setSelectedPersonId(node.id);
      if (onPersonClick && person) {
        onPersonClick(person);
      }
    },
    [onPersonClick]
  );

  // Handle node double click
  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      const person = node.data.person || node.data.person1;
      if (onPersonDoubleClick && person) {
        onPersonDoubleClick(person);
      }
    },
    [onPersonDoubleClick]
  );

  // Handle pane click (background)
  const handlePaneClick = useCallback(() => {
    setSelectedPersonId(null);
    if (onBackgroundClick) {
      onBackgroundClick();
    }
  }, [onBackgroundClick]);

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
  }, [nodes, edges, orientation, isMobile, setNodes]);

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
        // Touch-friendly settings
        zoomOnPinch={true}
        panOnDrag={true}
        selectionOnDrag={false}
        nodesDraggable={!isMobile}
        nodeDragThreshold={10}
        // Disable some features on mobile for better performance
        elementsSelectable={true}
        nodesConnectable={false}
        // Accessibility
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
