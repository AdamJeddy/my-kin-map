import { useState, useMemo } from 'react';
import { Search as SearchIcon, User } from 'lucide-react';
import { MobileHeader } from '@/components/navigation';
import { PersonEditor } from '@/components/person';
import { useIsMobile } from '@/hooks';
import { usePersons } from '@/db';
import { Input, Avatar, AvatarFallback, AvatarImage } from '@/components/ui';
import type { Person } from '@/types';

export function SearchPage() {
  const isMobile = useIsMobile();
  const persons = usePersons();
  const [query, setQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Filter persons based on search query
  const filteredPersons = useMemo(() => {
    if (!persons) return [];
    if (!query.trim()) return persons;

    const lowerQuery = query.toLowerCase();
    return persons.filter((person) => {
      const fullName = `${person.givenNames} ${person.surname}`.toLowerCase();
      const birthName = person.birthName?.toLowerCase() ?? '';
      return (
        fullName.includes(lowerQuery) ||
        birthName.includes(lowerQuery) ||
        person.birth?.place?.toLowerCase().includes(lowerQuery) ||
        person.death?.place?.toLowerCase().includes(lowerQuery)
      );
    });
  }, [persons, query]);

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
    setIsEditing(true);
  };

  return (
    <div className="flex flex-col h-full">
      {isMobile && <MobileHeader title="Search" />}
      
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Search input */}
        <div className="p-4 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or place..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {filteredPersons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {query ? 'No results found' : 'No people yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {query 
                  ? 'Try a different search term' 
                  : 'Add your first person to get started'}
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {filteredPersons.map((person) => {
                const photoUrl = person.photoThumbnail 
                  ? URL.createObjectURL(person.photoThumbnail)
                  : person.photo 
                    ? URL.createObjectURL(person.photo)
                    : null;
                const initials = 
                  (person.givenNames?.charAt(0) ?? '') + 
                  (person.surname?.charAt(0) ?? '');
                const birthYear = person.birth?.date?.match(/\d{4}/)?.[0];

                return (
                  <li key={person.id}>
                    <button
                      onClick={() => handlePersonClick(person)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-12 w-12">
                        {photoUrl && <AvatarImage src={photoUrl} />}
                        <AvatarFallback>{initials || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {person.givenNames} {person.surname}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {birthYear && `b. ${birthYear}`}
                          {birthYear && person.birth?.place && ' · '}
                          {person.birth?.place}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Person Editor */}
      <PersonEditor
        person={selectedPerson ?? undefined}
        open={isEditing}
        onOpenChange={setIsEditing}
      />
    </div>
  );
}
