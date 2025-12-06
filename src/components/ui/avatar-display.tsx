import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface AvatarDisplayProps {
  src?: string | null;
  name?: string | null;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-16 h-16 text-xl',
};

const iconSizes = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
};

function getInitials(name?: string | null, email?: string): string {
  if (name && name.trim()) {
    // Get first character of name (handles Korean well)
    return name.trim().charAt(0).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return '?';
}

function getColorFromString(str: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function AvatarDisplay({
  src,
  name,
  email,
  size = 'md',
  className,
}: AvatarDisplayProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];

  // If we have a valid image URL, show it
  if (src) {
    return (
      <div
        className={cn(
          'rounded-full overflow-hidden flex-shrink-0',
          sizeClass,
          className
        )}
      >
        <img
          src={src}
          alt={name || email || 'User avatar'}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Hide broken image and show fallback
            const target = e.currentTarget;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.classList.add(getColorFromString(name || email || ''));
              parent.innerHTML = `
                <span class="flex items-center justify-center w-full h-full text-white font-medium">
                  ${getInitials(name, email)}
                </span>
              `;
            }
          }}
        />
      </div>
    );
  }

  // Fallback: show initials or icon
  const initials = getInitials(name, email);
  const bgColor = getColorFromString(name || email || '');

  if (initials === '?') {
    return (
      <div
        className={cn(
          'rounded-full flex-shrink-0 flex items-center justify-center bg-muted',
          sizeClass,
          className
        )}
      >
        <User size={iconSize} className="text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0 flex items-center justify-center text-white font-medium',
        sizeClass,
        bgColor,
        className
      )}
    >
      {initials}
    </div>
  );
}
