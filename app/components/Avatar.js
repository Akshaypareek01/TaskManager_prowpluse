import { avatarStyle } from "@/lib/colors";

const SIZES = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-7 w-7 text-[10px]",
  md: "h-9 w-9 text-[12px]",
  lg: "h-11 w-11 text-sm",
};

/**
 * Initials avatar for a team member.
 *
 * The roster palette in lib/team.js was authored for a dark UI, so the colour
 * is deepened and the foreground is chosen by contrast (see lib/colors.js)
 * rather than hard-coded — otherwise the yellow/cyan members are unreadable.
 *
 * @param {{ member: object, size?: keyof typeof SIZES, className?: string, ring?: boolean }} props
 */
export default function Avatar({ member, size = "md", className = "", ring = true }) {
  const style = avatarStyle(member?.color || "#667085");

  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold leading-none tracking-tight ${
        SIZES[size] || SIZES.md
      } ${ring ? "ring-2 ring-white" : ""} ${className}`}
      style={style}
      title={member?.name}
      aria-hidden="true"
    >
      {member?.initials}
    </span>
  );
}

/**
 * Overlapping avatar row, capped with a "+N" chip.
 * @param {{ members: object[], max?: number, size?: keyof typeof SIZES }} props
 */
export function AvatarGroup({ members = [], max = 5, size = "sm" }) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;

  return (
    <span className="flex items-center -space-x-2">
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {rest > 0 && (
        <span
          className={`inline-grid shrink-0 place-items-center rounded-full bg-surface-sunken font-semibold text-ink-600 ring-2 ring-white ${
            SIZES[size] || SIZES.sm
          }`}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
