export function SkeletonBox({ w = '100%', h = 16, radius = 6, style }: {
  w?: string | number;
  h?: number;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="skeleton"
      style={{ width: w, height: h, borderRadius: radius, flexShrink: 0, ...style }}
    />
  );
}

export function TargetCardSkeleton() {
  return (
    <div className="card" style={{ padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <SkeletonBox w={36} h={36} radius={18} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
        <SkeletonBox w="40%" h={14} />
        <SkeletonBox w="70%" h={12} />
        <div style={{ display: 'flex', gap: '6px' }}>
          <SkeletonBox w={60} h={20} radius={10} />
          <SkeletonBox w={80} h={20} radius={10} />
        </div>
      </div>
      <SkeletonBox w={56} h={56} radius={8} />
    </div>
  );
}

export function ResultsPageSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <TargetCardSkeleton key={i} />
      ))}
    </div>
  );
}
