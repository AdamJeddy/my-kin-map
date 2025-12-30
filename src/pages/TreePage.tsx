import { useState, useCallback, useEffect } from 'react';
import { FamilyTreeView } from '@/components/tree';
import { PersonEditor } from '@/components/person';
import { PersonDetails } from '@/components/person';
import { MobileHeader } from '@/components/navigation';
import { useIsMobile } from '@/hooks';
import { useToast } from '@/hooks/useToast';
import { usePersons, useFamilies, getPersonWithRelations, initializeSettings, requestPersistentStorage, loadSampleData } from '@/db';
import type { Person } from '@/types';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import { Zap, Plus } from 'lucide-react';

interface TreePageProps {
  onAddPerson?: () => void;
}

export function TreePage({ onAddPerson: _onAddPerson }: TreePageProps) {
  const isMobile = useIsMobile();
  const { addToast } = useToast();
  const persons = usePersons();
  const families = useFamilies();
  
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [personRelations, setPersonRelations] = useState<{
    parents: Person[];
    spouses: Person[];
    children: Person[];
    siblings: Person[];
  } | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Initialize settings and request persistent storage on mount
  useEffect(() => {
    initializeSettings();
    requestPersistentStorage();
  }, []);

  // Load relations when person is selected
  const loadPersonRelations = useCallback(async (person: Person) => {
    const relations = await getPersonWithRelations(person.id);
    if (relations) {
      setPersonRelations({
        parents: relations.parents,
        spouses: relations.spouses,
        children: relations.children,
        siblings: relations.siblings,
      });
    }
  }, []);

  const handlePersonClick = useCallback((person: Person) => {
    setSelectedPerson(person);
    loadPersonRelations(person);
    setIsDetailsOpen(true);
  }, [loadPersonRelations]);

  const handlePersonDoubleClick = useCallback((person: Person) => {
    setSelectedPerson(person);
    setIsEditing(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setIsDetailsOpen(false);
    setSelectedPerson(null);
    setPersonRelations(null);
  }, []);

  const handleEditPerson = useCallback(() => {
    setIsDetailsOpen(false);
    setIsEditing(true);
  }, []);

  const handleEditClose = useCallback(() => {
    setIsEditing(false);
    if (selectedPerson) {
      loadPersonRelations(selectedPerson);
      setIsDetailsOpen(true);
    }
  }, [selectedPerson, loadPersonRelations]);

  const handleLoadSampleData = useCallback(async () => {
    setIsLoadingSample(true);
    try {
      await loadSampleData();
      addToast({
        type: 'success',
        title: 'Success',
        description: 'Sample data loaded successfully! Reloading...',
        duration: 2000,
      });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      console.error('Failed to load sample data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        description: 'Failed to load sample data. Please try again.',
      });
      setIsLoadingSample(false);
    }
  }, [addToast]);

  return (
    <div className="flex flex-col h-full">
      {isMobile && <MobileHeader title="Family Tree" />}
      
      <div className="flex-1 relative">
        {(!persons || persons.length === 0) ? (
          // Empty state
          <div className="flex items-center justify-center h-full p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Start Your Family Tree</CardTitle>
                <CardDescription>
                  No family members yet. Add your first person or load sample data to explore.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  onClick={() => _onAddPerson?.()}
                  className="w-full justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Person
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or try this</span>
                  </div>
                </div>
                <Button
                  onClick={handleLoadSampleData}
                  disabled={isLoadingSample}
                  className="w-full justify-center"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  {isLoadingSample ? 'Loading...' : 'Load Sample Data'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Load a sample family tree with 4 generations to explore features
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Family tree view
          <FamilyTreeView
            persons={persons ?? []}
            families={families ?? []}
            onPersonClick={handlePersonClick}
            onPersonDoubleClick={handlePersonDoubleClick}
            onBackgroundClick={handleCloseDetails}
          />
        )}
      </div>

      {/* Person Details Drawer (mobile) */}
      {isMobile && selectedPerson && (
        <Drawer open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DrawerContent className="max-h-[80vh]">
            <DrawerHeader>
              <DrawerTitle>Person Details</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-4">
              <PersonDetails
                person={selectedPerson}
                parents={personRelations?.parents}
                spouses={personRelations?.spouses}
                children={personRelations?.children}
                siblings={personRelations?.siblings}
                onEdit={handleEditPerson}
                onPersonClick={(p) => {
                  setSelectedPerson(p);
                  loadPersonRelations(p);
                }}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* Person Details Panel (desktop) */}
      {!isMobile && selectedPerson && isDetailsOpen && (
        <div className="absolute top-4 right-4 w-80 max-h-[calc(100%-2rem)] overflow-y-auto bg-card/95 backdrop-blur-sm rounded-lg shadow-xl border border-border/80">
          <PersonDetails
            person={selectedPerson}
            parents={personRelations?.parents}
            spouses={personRelations?.spouses}
            children={personRelations?.children}
            siblings={personRelations?.siblings}
            onEdit={handleEditPerson}
            onPersonClick={(p) => {
              setSelectedPerson(p);
              loadPersonRelations(p);
            }}
          />
        </div>
      )}

      {/* Person Editor */}
      <PersonEditor
        person={selectedPerson ?? undefined}
        open={isEditing}
        onOpenChange={(open) => {
          if (!open) handleEditClose();
        }}
        onSaved={() => {
          setIsEditing(false);
          if (selectedPerson) {
            loadPersonRelations(selectedPerson);
            setIsDetailsOpen(true);
          }
        }}
      />
    </div>
  );
}
