import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Camera, X } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DateInput,
} from '@/components/ui';
import type { Person, PersonFormData, Sex, Family } from '@/types';

interface RelationSelections {
  parentIds: string[];
  spouseId?: string;
  childIds: string[];
}

interface PersonFormProps {
  person?: Person;
  onSubmit: (data: PersonFormData, photo: File | undefined, relations: RelationSelections) => void;
  relations?: RelationSelections;
  persons?: Person[];
  families?: Family[];
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PersonForm({ person, persons = [], families = [], relations, onSubmit, onCancel, isSubmitting }: PersonFormProps) {
  const [formData, setFormData] = useState<PersonFormData>({
    givenNames: person?.givenNames ?? '',
    surname: person?.surname ?? '',
    birthName: person?.birthName ?? '',
    sex: person?.sex ?? 'U',
    birthDate: person?.birth?.date ?? '',
    birthPlace: person?.birth?.place ?? '',
    deathDate: person?.death?.date ?? '',
    deathPlace: person?.death?.place ?? '',
    notes: person?.notes ?? '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRelations, setShowRelations] = useState<boolean>(false);

  const [relationState, setRelationState] = useState<RelationSelections>(() => relations ?? {
    parentIds: [],
    spouseId: undefined,
    childIds: [],
  });

  // Keep local relation state in sync with incoming props (edit mode)
  useEffect(() => {
    if (relations) {
      setRelationState(relations);
      setShowRelations(relations.parentIds.length > 0 || !!relations.spouseId || relations.childIds.length > 0);
    }
  }, [relations]);

  // Create preview from existing photo
  const existingPhotoUrl = person?.photo 
    ? URL.createObjectURL(person.photo) 
    : null;

  const handleChange = useCallback((
    field: keyof PersonFormData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleRemovePhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, photoFile ?? undefined, relationState);
  }, [formData, photoFile, onSubmit, relationState]);

  const initials = formData.givenNames.charAt(0) + formData.surname.charAt(0);

  const selectablePersons = persons.filter(p => p.id !== person?.id);

  const parentsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    families.forEach((family) => {
      const parentIds = [family.spouse1Id, family.spouse2Id].filter(Boolean) as string[];
      family.childIds.forEach((childId) => {
        const existing = map.get(childId) ?? [];
        map.set(childId, [...existing, ...parentIds]);
      });
    });
    return map;
  }, [families]);

  const childrenMap = useMemo(() => {
    const map = new Map<string, string[]>();
    families.forEach((family) => {
      const parentIds = [family.spouse1Id, family.spouse2Id].filter(Boolean) as string[];
      parentIds.forEach((pid) => {
        const existing = map.get(pid) ?? [];
        map.set(pid, [...existing, ...family.childIds]);
      });
    });
    return map;
  }, [families]);

  const collectAncestors = useCallback((id: string, visited: Set<string> = new Set()): Set<string> => {
    if (visited.has(id)) return visited;
    visited.add(id);
    const parents = parentsMap.get(id) ?? [];
    parents.forEach((pid) => collectAncestors(pid, visited));
    return visited;
  }, [parentsMap]);

  const collectDescendants = useCallback((id: string, visited: Set<string> = new Set()): Set<string> => {
    if (visited.has(id)) return visited;
    visited.add(id);
    const kids = childrenMap.get(id) ?? [];
    kids.forEach((cid) => collectDescendants(cid, visited));
    return visited;
  }, [childrenMap]);

  const ancestorsOfPerson = useMemo(() => {
    return person?.id ? Array.from(collectAncestors(person.id, new Set([person.id]))).filter(pid => pid !== person.id) : [];
  }, [person?.id, collectAncestors]);

  const descendantsOfPerson = useMemo(() => {
    return person?.id ? Array.from(collectDescendants(person.id, new Set([person.id]))).filter(pid => pid !== person.id) : [];
  }, [person?.id, collectDescendants]);

  const parentBlockedIds = useMemo(() => new Set<string>([...descendantsOfPerson, ...relationState.childIds, person?.id ?? ''].filter(Boolean)), [descendantsOfPerson, relationState.childIds, person?.id]);
  const childBlockedIds = useMemo(() => new Set<string>([...ancestorsOfPerson, ...relationState.parentIds, person?.id ?? ''].filter(Boolean)), [ancestorsOfPerson, relationState.parentIds, person?.id]);
  const spouseBlockedIds = useMemo(() => new Set<string>([person?.id ?? ''].filter(Boolean)), [person?.id]);

  const selectableParents = selectablePersons.filter(p => !parentBlockedIds.has(p.id));
  const selectableChildren = selectablePersons.filter(p => !childBlockedIds.has(p.id));
  const selectableSpouses = selectablePersons.filter(p => !spouseBlockedIds.has(p.id));

  const noneValue = '__none__';

  const setParent = useCallback((which: 0 | 1, value?: string) => {
    setRelationState(prev => {
      const parentIds = [...prev.parentIds];
      parentIds[which] = value || '';
      const cleaned = parentIds.filter(Boolean);
      return { ...prev, parentIds: cleaned.slice(0, 2) };
    });
  }, []);

  const setSpouse = useCallback((value?: string) => {
    setRelationState(prev => ({ ...prev, spouseId: value || undefined }));
  }, []);

  const toggleChild = useCallback((id: string) => {
    setRelationState(prev => {
      const exists = prev.childIds.includes(id);
      const childIds = exists
        ? prev.childIds.filter(c => c !== id)
        : [...prev.childIds, id];
      return { ...prev, childIds };
    });
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Photo upload */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <Avatar className="h-24 w-24">
            <AvatarImage 
              src={photoPreview || existingPhotoUrl || undefined} 
              alt="Photo preview" 
            />
            <AvatarFallback className="text-2xl">
              {initials || '?'}
            </AvatarFallback>
          </Avatar>
          {(photoPreview || existingPhotoUrl) && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
              onClick={handleRemovePhoto}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
            id="photo-upload"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="h-4 w-4 mr-2" />
            {photoPreview || existingPhotoUrl ? 'Change Photo' : 'Add Photo'}
          </Button>
        </div>
      </div>

      {/* Name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="givenNames">Given Names *</Label>
          <Input
            id="givenNames"
            value={formData.givenNames}
            onChange={(e) => handleChange('givenNames', e.target.value)}
            placeholder="First name(s)"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surname">Surname *</Label>
          <Input
            id="surname"
            value={formData.surname}
            onChange={(e) => handleChange('surname', e.target.value)}
            placeholder="Last name"
            required
          />
        </div>
      </div>

      {/* Birth name and sex */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="birthName">Birth Name</Label>
          <Input
            id="birthName"
            value={formData.birthName}
            onChange={(e) => handleChange('birthName', e.target.value)}
            placeholder="Maiden name (if different)"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sex">Sex</Label>
          <Select
            value={formData.sex}
            onValueChange={(value: Sex) => handleChange('sex', value)}
          >
            <SelectTrigger id="sex">
              <SelectValue placeholder="Select sex" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="F">Female</SelectItem>
              <SelectItem value="U">Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Birth info */}
      <div className="space-y-2">
        <Label>Birth</Label>
        <div className="space-y-3">
          <DateInput
            value={formData.birthDate}
            onChange={(value) => handleChange('birthDate', value)}
          />
          <Input
            value={formData.birthPlace}
            onChange={(e) => handleChange('birthPlace', e.target.value)}
            placeholder="Place"
          />
        </div>
      </div>

      {/* Death info */}
      <div className="space-y-2">
        <Label>Death (if applicable)</Label>
        <div className="space-y-3">
          <DateInput
            value={formData.deathDate}
            onChange={(value) => handleChange('deathDate', value)}
          />
          <Input
            value={formData.deathPlace}
            onChange={(e) => handleChange('deathPlace', e.target.value)}
            placeholder="Place"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          placeholder="Any additional information..."
          rows={3}
        />
      </div>

      {/* Relationships (optional) */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Relationships (optional)</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowRelations((prev) => !prev)}
            className="text-xs"
          >
            {showRelations ? 'Hide' : 'Show'}
          </Button>
        </div>

        {showRelations && (
          <div className="space-y-3">
            {/* Parents */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Parent 1</Label>
                <Select
                  value={relationState.parentIds[0] ?? noneValue}
                  onValueChange={(value) => setParent(0, value === noneValue ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noneValue}>None</SelectItem>
                    {selectableParents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.givenNames} {p.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Parent 2</Label>
                <Select
                  value={relationState.parentIds[1] ?? noneValue}
                  onValueChange={(value) => setParent(1, value === noneValue ? undefined : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noneValue}>None</SelectItem>
                    {selectableParents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.givenNames} {p.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Spouse */}
            <div className="space-y-2">
              <Label>Spouse / Partner</Label>
              <Select
                value={relationState.spouseId ?? noneValue}
                onValueChange={(value) => setSpouse(value === noneValue ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select spouse" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noneValue}>None</SelectItem>
                  {selectableSpouses.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.givenNames} {p.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Children */}
            <div className="space-y-2">
              <Label>Children</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-2">
                {selectableChildren.map((p) => {
                  const checked = relationState.childIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleChild(p.id)}
                      className={`flex items-center justify-between gap-2 rounded-md px-2 py-2 text-left border transition-colors ${checked ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}
                    >
                      <span className="truncate text-sm">{p.givenNames} {p.surname}</span>
                      <span className="text-xs text-muted-foreground">{checked ? '✓' : ''}</span>
                    </button>
                  );
                })}
                {selectablePersons.length === 0 && (
                  <p className="text-sm text-muted-foreground">Add another person first, then assign relationships.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={isSubmitting || !formData.givenNames || !formData.surname}
        >
          {isSubmitting ? 'Saving...' : person ? 'Update' : 'Add Person'}
        </Button>
      </div>
    </form>
  );
}
