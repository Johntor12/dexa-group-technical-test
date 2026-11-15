interface StatusBadgeProps {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}

export function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: StatusBadgeProps) {
  return (
    <span className={`status ${active ? "active" : ""}`}>
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}
