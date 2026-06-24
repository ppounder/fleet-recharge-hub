interface WheelPlanDiagramProps {
  plan: string;
  assetType?: string;
}

function parsePlan(plan: string, assetType?: string) {
  const isTrailer = assetType === "Trailer";
  const isTractor = /Tractor/i.test(plan);

  let axles = 2;
  let driven = 1; // number of driven axles from the rear

  if (isTrailer) {
    if (/Quad/i.test(plan)) axles = 4;
    else if (/Tri/i.test(plan)) axles = 3;
    else if (/Twin/i.test(plan)) axles = 2;
    else axles = 1;
    driven = 0;
  } else {
    const m = plan.match(/(\d+)x(\d+)/);
    if (m) {
      const wheels = parseInt(m[1], 10);
      const drivenWheels = parseInt(m[2], 10);
      axles = Math.max(1, Math.round(wheels / 2));
      driven = Math.max(0, Math.round(drivenWheels / 2));
    } else {
      const am = plan.match(/(\d+)-Axle/i);
      if (am) axles = parseInt(am[1], 10);
    }
  }

  return { axles, driven, isTrailer, isTractor };
}

export function WheelPlanDiagram({ plan, assetType }: WheelPlanDiagramProps) {
  if (!plan) return null;
  const { axles, driven, isTrailer, isTractor } = parsePlan(plan, assetType);

  // Layout
  const wheelR = 14;
  const axleSpacing = 56;
  const margin = 28;
  const chassisHeight = 36;
  const width = margin * 2 + Math.max(1, axles) * axleSpacing + (isTractor ? 30 : 0);
  const height = 120;
  const chassisY = (height - chassisHeight) / 2;

  // Axle x positions: front axle near left, then evenly spaced
  const axleXs: number[] = [];
  const startX = margin + axleSpacing / 2;
  for (let i = 0; i < axles; i++) {
    axleXs.push(startX + i * axleSpacing);
  }

  // For HGV/Van/Car: cab on left over front axle, body extends back
  // For trailer: no cab, kingpin on left
  // For tractor: short chassis, fifth wheel circle at rear

  const drivenSet = new Set<number>();
  if (!isTrailer) {
    // mark last `driven` axles (rear) as driven
    for (let i = axles - driven; i < axles; i++) drivenSet.add(i);
  }

  return (
    <div className="rounded-md border bg-muted/30 p-4 flex flex-col items-center gap-2">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-foreground">
        {/* Ground */}
        <line x1={0} y1={height - 8} x2={width} y2={height - 8} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 4" />

        {/* Chassis */}
        {isTrailer ? (
          <>
            {/* Kingpin tongue */}
            <polygon
              points={`${margin - 16},${chassisY + chassisHeight / 2} ${margin + 6},${chassisY + 4} ${margin + 6},${chassisY + chassisHeight - 4}`}
              fill="hsl(var(--primary) / 0.15)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
            <rect
              x={margin + 4}
              y={chassisY}
              width={width - margin - 4 - 8}
              height={chassisHeight}
              rx={4}
              fill="hsl(var(--primary) / 0.15)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
          </>
        ) : isTractor ? (
          <>
            {/* Cab */}
            <rect
              x={margin}
              y={chassisY - 14}
              width={axleSpacing + 10}
              height={chassisHeight + 14}
              rx={5}
              fill="hsl(var(--primary) / 0.2)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
            {/* Chassis behind cab */}
            <rect
              x={margin + axleSpacing + 10}
              y={chassisY + 6}
              width={width - margin - axleSpacing - 10 - 8}
              height={chassisHeight - 12}
              fill="hsl(var(--primary) / 0.15)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
            {/* Fifth wheel */}
            <circle
              cx={axleXs[axleXs.length - 1] + 8}
              cy={chassisY + chassisHeight / 2}
              r={6}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
          </>
        ) : (
          <>
            {/* Cab + body */}
            <rect
              x={margin}
              y={chassisY - 14}
              width={axleSpacing + 6}
              height={chassisHeight + 14}
              rx={5}
              fill="hsl(var(--primary) / 0.2)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
            <rect
              x={margin + axleSpacing + 6}
              y={chassisY - 8}
              width={width - margin - axleSpacing - 6 - 8}
              height={chassisHeight + 8}
              rx={4}
              fill="hsl(var(--primary) / 0.15)"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
            />
          </>
        )}

        {/* Wheels */}
        {axleXs.map((x, i) => {
          const isDriven = drivenSet.has(i);
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={height - 8 - wheelR}
                r={wheelR}
                fill={isDriven ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.25)"}
                stroke="hsl(var(--foreground))"
                strokeWidth={1.5}
              />
              <circle
                cx={x}
                cy={height - 8 - wheelR}
                r={wheelR / 2.5}
                fill="hsl(var(--background))"
                stroke="hsl(var(--foreground))"
                strokeWidth={1}
              />
            </g>
          );
        })}
      </svg>
      <div className="text-xs text-muted-foreground flex items-center gap-4">
        <span>{plan}</span>
        {!isTrailer && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Driven axle
          </span>
        )}
      </div>
    </div>
  );
}
