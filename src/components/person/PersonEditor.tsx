import { useCallback, useState } from 'react';
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
import { createPerson, updatePerson, updatePersonPhoto } from '@/db';
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

  const handleSubmit = useCallback(async (data: PersonFormData, photo?: File) => {
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

      onOpenChange(false);
      if (onSaved) {
        onSaved(savedPerson);
      }
    } catch (error) {
      console.error('Failed to save person:', error);
      // TODO: Show error toast
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
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
