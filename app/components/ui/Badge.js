import Icon from "./Icon";

const TONES = {
  neutral: "badge-neutral",
  success: "badge-success",
  warning: "badge-warning",
  danger: "badge-danger",
  brand: "badge-brand",
};

/**
 * Status pill. Tone always carries meaning — never pick one for looks.
 * @param {{ tone?: keyof typeof TONES, icon?: string, className?: string, children: React.ReactNode }} props
 */
export default function Badge({ tone = "neutral", icon, className = "", children }) {
  return (
    <span className={`badge ${TONES[tone] || TONES.neutral} ${className}`}>
      {icon && <Icon name={icon} size={12} strokeWidth={2.25} />}
      {children}
    </span>
  );
}

/** Maps a task status to its badge tone, label and icon — one source of truth. */
export const TASK_STATUS = {
  completed: { tone: "success", label: "Done", icon: "check" },
  overdue: { tone: "danger", label: "Overdue", icon: "alert-triangle" },
  backlog: { tone: "warning", label: "Backlog", icon: "archive" },
  in_progress: { tone: "brand", label: "In progress", icon: "play" },
  pending: { tone: "neutral", label: "Pending", icon: "clock" },
};

/**
 * @param {{ status: string, className?: string }} props
 */
export function StatusBadge({ status, className = "" }) {
  const s = TASK_STATUS[status] || TASK_STATUS.pending;
  return (
    <Badge tone={s.tone} icon={s.icon} className={className}>
      {s.label}
    </Badge>
  );
}
