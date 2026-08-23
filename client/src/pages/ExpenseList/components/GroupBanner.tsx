export function GroupBanner({ label }: { label: string }) {
  return (
    <div className="expense-day-banner">
      <span className="expense-day-banner__label">{label}</span>
    </div>
  );
}
