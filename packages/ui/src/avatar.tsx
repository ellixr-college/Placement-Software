import * as React from 'react';
import { cn } from './cn';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: number;
  className?: string;
}

export const Avatar = ({ src, name, size = 40, className }: AvatarProps) => {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xs font-semibold text-primary-700 ring-2 ring-white',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
};

export interface AvatarStackProps {
  people: { name: string; src?: string }[];
  max?: number;
  extraLabel?: string;
}

export const AvatarStack = ({ people, max = 3, extraLabel }: AvatarStackProps) => {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((p, i) => (
          <Avatar key={i} name={p.name} src={p.src} size={28} />
        ))}
      </div>
      {(extra > 0 || extraLabel) && (
        <span className="ml-2 text-xs text-subtle">{extraLabel ?? `+ ${extra} members`}</span>
      )}
    </div>
  );
};
