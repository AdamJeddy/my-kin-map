import { memo, useMemo } from 'react';
import { Handle, Position, type Node } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui';
import type { Person } from '@/types';

export interface CoupleNodeData extends Record<string, unknown> {
  person1: Person;
  person2: Person;
  isRoot?: boolean;
  isSelected?: boolean;
  compact?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

export type CoupleNode = Node<CoupleNodeData, 'couple'>;

interface CoupleNodeProps {
  data: CoupleNodeData;
  selected?: boolean;
}

function CoupleNodeComponent({ data, selected }: CoupleNodeProps) {
  const { person1, person2, isRoot, compact, orientation = 'vertical' } = data;

  // Create object URLs for photos
  const photo1Url = useMemo(() => {
    if (person1.photoThumbnail) {
      return URL.createObjectURL(person1.photoThumbnail);
    }
    if (person1.photo) {
      return URL.createObjectURL(person1.photo);
    }
    return null;
  }, [person1.photo, person1.photoThumbnail]);

  const photo2Url = useMemo(() => {
    if (person2.photoThumbnail) {
      return URL.createObjectURL(person2.photoThumbnail);
    }
    if (person2.photo) {
      return URL.createObjectURL(person2.photo);
    }
    return null;
  }, [person2.photo, person2.photoThumbnail]);

  // Get initials
  const initials1 = useMemo(() => {
    const first = person1.givenNames?.charAt(0) || '';
    const last = person1.surname?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }, [person1.givenNames, person1.surname]);

  const initials2 = useMemo(() => {
    const first = person2.givenNames?.charAt(0) || '';
    const last = person2.surname?.charAt(0) || '';
    return (first + last).toUpperCase() || '?';
  }, [person2.givenNames, person2.surname]);

  // Format birth year
  const birthYear1 = person1.birth?.date?.match(/\d{4}/)?.[0];
  const birthYear2 = person2.birth?.date?.match(/\d{4}/)?.[0];

  const isHorizontal = orientation === 'horizontal';

  if (compact) {
    // Compact mobile view - stack vertically
    return (
      <div
        className={cn(
          'px-3 py-2 rounded-lg border-2 bg-card shadow-sm min-w-[140px] max-w-[160px]',
          'transition-all duration-200',
          selected && 'ring-2 ring-primary ring-offset-2',
          isRoot && 'border-primary',
          !isRoot && 'border-border'
        )}
      >
        <Handle
          type="target"
          position={isHorizontal ? Position.Left : Position.Top}
          className="!bg-muted-foreground !w-2 !h-2"
        />
        <Handle
          type="source"
          position={isHorizontal ? Position.Right : Position.Bottom}
          className="!bg-muted-foreground !w-2 !h-2"
        />

        <div className="space-y-2">
          {/* Person 1 */}
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 flex-shrink-0">
              {photo1Url && <AvatarImage src={photo1Url} alt={person1.givenNames} />}
              <AvatarFallback className="text-xs">{initials1}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">
                {person1.givenNames}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {person1.surname}
              </p>
            </div>
          </div>

          {/* Connector */}
          <div className="text-center text-xs text-muted-foreground font-semibold">&</div>

          {/* Person 2 */}
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7 flex-shrink-0">
              {photo2Url && <AvatarImage src={photo2Url} alt={person2.givenNames} />}
              <AvatarFallback className="text-xs">{initials2}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">
                {person2.givenNames}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {person2.surname}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full desktop view
  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg border-2 bg-card shadow-md min-w-[280px]',
        'transition-all duration-200',
        selected && 'ring-2 ring-primary ring-offset-2',
        isRoot && 'border-primary',
        !isRoot && 'border-border'
      )}
    >
      <Handle
        type="target"
        position={isHorizontal ? Position.Left : Position.Top}
        className="!bg-muted-foreground !w-2 !h-2"
      />
      <Handle
        type="source"
        position={isHorizontal ? Position.Right : Position.Bottom}
        className="!bg-muted-foreground !w-2 !h-2"
      />

      <div className="space-y-3">
        {/* Person 1 */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            {photo1Url && <AvatarImage src={photo1Url} alt={person1.givenNames} />}
            <AvatarFallback>{initials1}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">
              {person1.givenNames}
            </p>
            <p className="text-sm text-muted-foreground">
              {person1.surname}
            </p>
            {birthYear1 && (
              <p className="text-xs text-muted-foreground">
                b. {birthYear1}
              </p>
            )}
          </div>
        </div>

        {/* Connector */}
        <div className="text-center text-muted-foreground font-semibold text-lg">&</div>

        {/* Person 2 */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            {photo2Url && <AvatarImage src={photo2Url} alt={person2.givenNames} />}
            <AvatarFallback>{initials2}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">
              {person2.givenNames}
            </p>
            <p className="text-sm text-muted-foreground">
              {person2.surname}
            </p>
            {birthYear2 && (
              <p className="text-xs text-muted-foreground">
                b. {birthYear2}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const CoupleNode = memo(CoupleNodeComponent);
