interface GirlAvatarProps {
  avatarUrl: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circle' | 'card';
  className?: string;
}

const circleSizes = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-28 h-28',
};

const cardSizes = {
  sm: 'w-16 h-20',
  md: 'w-32 h-40',
  lg: 'w-40 h-52',
};

export function GirlAvatar({ avatarUrl, name, size = 'md', variant = 'circle', className = '' }: GirlAvatarProps) {
  const isCard = variant === 'card';
  const containerSize = isCard ? cardSizes[size] : circleSizes[size];

  return (
    <div
      className={`${containerSize} ${isCard ? 'rounded-xl' : 'rounded-full'} overflow-hidden bg-gradient-to-br from-neon-pink/30 to-neon-purple/30 ring-2 ring-neon-purple/50 shadow-lg shadow-neon-purple/20 ${className}`}
    >
      <img
        src={avatarUrl}
        alt={name}
        className={`w-full h-full ${isCard ? 'object-cover object-top' : 'object-cover'}`}
        loading="lazy"
      />
    </div>
  );
}
