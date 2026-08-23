export function SkeletonPlanks({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="expense-row expense-row--skeleton" aria-hidden="true">
          <div className="expense-row-content expense-row-content--skeleton" />
        </div>
      ))}
    </>
  );
}
