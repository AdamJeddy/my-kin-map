import { useMemo } from 'react';
import { Edit, Trash2, Users, User } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui';
import type { Person } from '@/types';

interface PersonDetailsProps {
  person: Person;
  parents?: Person[];
  spouses?: Person[];
  children?: Person[];
  siblings?: Person[];
  onEdit?: () => void;
  onDelete?: () => void;
  onPersonClick?: (person: Person) => void;
}

export function PersonDetails({
  person,
  parents = [],
  spouses = [],
  children = [],
  siblings = [],
  onEdit,
  onDelete,
  onPersonClick,
}: PersonDetailsProps) {
  // Create photo URL
  const photoUrl = useMemo(() => {
    if (person.photo) {
      return URL.createObjectURL(person.photo);
    }
    return null;
  }, [person.photo]);

  // Get initials
  const initials = (person.givenNames?.charAt(0) || '') + (person.surname?.charAt(0) || '');

  // Format dates
  const formatDate = (date?: string, place?: string) => {
    if (!date && !place) return null;
    const parts = [date, place].filter(Boolean);
    return parts.join(', ');
  };

  const birthInfo = formatDate(person.birth?.date, person.birth?.place);
  const deathInfo = formatDate(person.death?.date, person.death?.place);

  // Render person mini card
  const PersonMiniCard = ({ p }: { p: Person }) => {
    const pPhotoUrl = p.photo ? URL.createObjectURL(p.photo) : null;
    const pInitials = (p.givenNames?.charAt(0) || '') + (p.surname?.charAt(0) || '');
    
    return (
      <button
        onClick={() => onPersonClick?.(p)}
        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-left w-full"
      >
        <Avatar className="h-8 w-8">
          {pPhotoUrl && <AvatarImage src={pPhotoUrl} />}
          <AvatarFallback className="text-xs">{pInitials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{p.givenNames} {p.surname}</p>
        </div>
      </button>
    );
  };

  // Render relation section
  const RelationSection = ({ 
    title, 
    persons, 
    icon: Icon 
  }: { 
    title: string; 
    persons: Person[]; 
    icon: typeof User;
  }) => {
    if (persons.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </h4>
        <div className="space-y-1">
          {persons.map(p => (
            <PersonMiniCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            {photoUrl && <AvatarImage src={photoUrl} alt={person.givenNames} />}
            <AvatarFallback className="text-xl">{initials || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">
              {person.givenNames} {person.surname}
            </CardTitle>
            {person.birthName && person.birthName !== person.surname && (
              <p className="text-sm text-muted-foreground">
                née {person.birthName}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {person.sex === 'M' ? 'Male' : person.sex === 'F' ? 'Female' : 'Unknown'}
            </p>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vital info */}
        <div className="space-y-2">
          {birthInfo && (
            <p className="text-sm">
              <span className="text-muted-foreground">Born:</span> {birthInfo}
            </p>
          )}
          {deathInfo && (
            <p className="text-sm">
              <span className="text-muted-foreground">Died:</span> {deathInfo}
            </p>
          )}
        </div>

        {/* Notes */}
        {person.notes && (
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>
            <p className="text-sm whitespace-pre-wrap">{person.notes}</p>
          </div>
        )}

        {/* Relationships */}
        <div className="border-t pt-4 space-y-4">
          <RelationSection title="Parents" persons={parents} icon={Users} />
          <RelationSection title="Spouse(s)" persons={spouses} icon={User} />
          <RelationSection title="Children" persons={children} icon={Users} />
          <RelationSection title="Siblings" persons={siblings} icon={Users} />
        </div>
      </CardContent>
    </Card>
  );
}
