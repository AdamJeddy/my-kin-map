import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui';
import { PersonForm } from './PersonForm';
import { useIsMobile } from '@/hooks';
import { createPerson, updatePerson, updatePersonPhoto, usePersons, useFamilies, getPersonWithRelations, linkParentsToChild, linkSpouseAndChildren, removeChildFromFamily } from '@/db';
import { useToast } from '@/hooks/useToast';
import type { Person, PersonFormData } from '@/types';

interface PersonEditorProps {
  person?: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (person: Person) => void;
}

export function PersonEditor({ person, open, onOpenChange, onSaved }: PersonEditorProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const persons = usePersons();
  const families = useFamilies();
  const { addToast } = useToast();
  const [relationSelections, setRelationSelections] = useState<{ parentIds: string[]; spouseId?: string; childIds: string[] }>({
    parentIds: [],
    spouseId: undefined,
    childIds: [],
  });

  // Load existing relations when editing a person
  useEffect(() => {
    if (!person) {
      setRelationSelections({ parentIds: [], spouseId: undefined, childIds: [] });
      return;
    }

    getPersonWithRelations(person.id).then((relations) => {
      if (!relations) return;
      setRelationSelections({
        parentIds: relations.parents.map((p) => p.id).slice(0, 2),
        spouseId: relations.spouses[0]?.id,
        childIds: relations.children.map((c) => c.id),
      });
    });
  }, [person]);

  const handleSubmit = useCallback(async (data: PersonFormData, photo: File | undefined, relations: { parentIds: string[]; spouseId?: string; childIds: string[] }) => {
    setIsSubmitting(true);
    try {
      let savedPerson: Person;
      
      if (person) {
        // Update existing person
        await updatePerson(person.id, data);
        savedPerson = { ...person, ...data };
        
        // Update photo if provided
        if (photo) {
          const photoBlob = new Blob([await photo.arrayBuffer()], { type: photo.type });
          // Create thumbnail (simple version - just use same blob for now)
          await updatePersonPhoto(person.id, photoBlob, photoBlob);
        }
      } else {
        // Create new person
        savedPerson = await createPerson(data);
        
        // Add photo if provided
        if (photo) {
          const photoBlob = new Blob([await photo.arrayBuffer()], { type: photo.type });
          await updatePersonPhoto(savedPerson.id, photoBlob, photoBlob);
        }
      }

      // Reconcile relationships after the person exists
      const current = await getPersonWithRelations(savedPerson.id);

      // Parents: if existing birth family differs from desired, remove and relink
      const desiredParents = relations.parentIds.slice(0, 2);
      const desiredParentSet = new Set(desiredParents);

      if (current?.birthFamily) {
        const currentParents = [current.birthFamily.spouse1Id, current.birthFamily.spouse2Id].filter(Boolean) as string[];
        const sameParents = currentParents.length === desiredParents.length && currentParents.every(p => desiredParentSet.has(p));

        if (!sameParents && current.birthFamily.childIds.includes(savedPerson.id)) {
          await removeChildFromFamily(current.birthFamily.id, savedPerson.id);
        }
      }

      if (desiredParents.length > 0) {
        await linkParentsToChild(desiredParents, savedPerson.id);
      }

      // Spouse/children: remove children that are no longer selected from current spouse families
      const desiredChildrenSet = new Set(relations.childIds);
      if (current?.spouseFamilies) {
        for (const fam of current.spouseFamilies) {
          if (!fam.childIds || fam.childIds.length === 0) continue;
          for (const childId of fam.childIds) {
            if (!desiredChildrenSet.has(childId)) {
              await removeChildFromFamily(fam.id, childId);
            }
          }
        }
      }

      // Add missing children (and ensure spouse family exists)
      if (relations.childIds.length > 0 || relations.spouseId) {
        await linkSpouseAndChildren(savedPerson.id, relations.spouseId, relations.childIds);
      }

      onOpenChange(false);
      addToast({
        type: 'success',
        title: 'Saved',
        description: `${savedPerson.givenNames} ${savedPerson.surname} updated.`,
        duration: 1500,
      });
      if (onSaved) {
        onSaved(savedPerson);
      }
    } catch (error) {
      console.error('Failed to save person:', error);
      addToast({
        type: 'error',
        title: 'Save failed',
        description: 'Could not update this person. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [person, onOpenChange, onSaved]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const title = person ? 'Edit Person' : 'Add Person';
  const description = person 
    ? `Update details for ${person.givenNames} ${person.surname}`
    : 'Add a new person to your family tree';

  // Use Drawer on mobile, Dialog on desktop
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <PersonForm
              person={person}
              persons={persons ?? []}
              families={families ?? []}
              relations={relationSelections}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              isSubmitting={isSubmitting}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <PersonForm
          person={person}
          persons={persons ?? []}
          families={families ?? []}
          relations={relationSelections}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
