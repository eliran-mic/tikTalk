'use client';

interface AgentAvatarProps {
  name: string;
  size?: number;
}

const AVATAR_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function AgentAvatar({ name, size = 44 }: AgentAvatarProps) {
  const colorIndex = hashName(name) % AVATAR_COLORS.length;
  const bgColor = AVATAR_COLORS[colorIndex];
  const initials = getInitials(name);

  return (
    <div
      className="relative flex items-center justify-center rounded-full font-semibold text-white shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize: size * 0.38,
        boxShadow: `0 0 12px ${bgColor}80, 0 0 24px ${bgColor}40`,
        border: `2px solid ${bgColor}`,
      }}
    >
      {initials}
    </div>
  );
}
