import { useState, useCallback, useRef } from 'react';
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
import type { Person, PersonFormData, Sex } from '@/types';

interface PersonFormProps {
  person?: Person;
  onSubmit: (data: PersonFormData, photo?: File) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PersonForm({ person, onSubmit, onCancel, isSubmitting }: PersonFormProps) {
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
    onSubmit(formData, photoFile ?? undefined);
  }, [formData, photoFile, onSubmit]);

  const initials = formData.givenNames.charAt(0) + formData.surname.charAt(0);

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
            placeholder="Birth date"
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
            placeholder="Death date"
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
