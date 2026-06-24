interface WheelPlanDiagramProps {
  plan: string;
  assetType?: string;
}

function parsePlan(plan: string, assetType?: string) {
  const isTrailer = assetType === "Trailer";
  const isTractor = /Tractor/i.test(plan);
  // Twin rear wheels: "4x2T" or explicit "Twin Rear"
  const twinRear =
    !isTrailer && (/\d+x\d+T\b/i.test(plan) || /Twin Rear/i.test(plan));

  let axles = 2;
  let driven = 1;

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

  return { axles, driven, isTrailer, isTractor, twinRear };
}

export function WheelPlanDiagram({ plan, assetType }: WheelPlanDiagramProps) {
  if (!plan) return null;
  const { axles, driven, isTrailer, isTractor, twinRear } = parsePlan(plan, assetType);

  // Top-down flattened view
  const chassisWidth = 44;
  const axleSpacing = 44;
  const marginY = 24;
  const wheelW = 10;
  const wheelH = 20;
  const axleBarThickness = 3;
  const axleHalfLen = chassisWidth / 2 + 14; // from centerline to wheel inner edge

  const height = marginY * 2 + Math.max(1, axles) * axleSpacing;
  const width = (axleHalfLen + wheelW + 8 + (twinRear ? wheelW + 2 : 0)) * 2;
  const cx = width / 2;

  const axleYs: number[] = [];
  const startY = marginY + axleSpacing / 2;
  for (let i = 0; i < axles; i++) axleYs.push(startY + i * axleSpacing);

  const drivenSet = new Set<number>();
  if (!isTrailer) {
    for (let i = axles - driven; i < axles; i++) drivenSet.add(i);
  }

  // Chassis extents
  const chassisTop = isTrailer ? marginY - 8 : marginY - 4;
  const chassisBottom = height - marginY + 4;

  return (
    <div className="rounded-md border bg-muted/30 p-4 flex flex-col items-center gap-3">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-foreground"
      >
        {/* Chassis (vertical bar, top-down) */}
        <rect
          x={cx - chassisWidth / 2}
          y={chassisTop}
          width={chassisWidth}
          height={chassisBottom - chassisTop}
          rx={3}
          fill="hsl(var(--muted-foreground) / 0.7)"
          stroke="hsl(var(--foreground))"
          strokeWidth={1}
        />

        {/* Kingpin marker for trailer at top */}
        {isTrailer && (
          <circle
            cx={cx}
            cy={chassisTop + 6}
            r={3}
            fill="hsl(var(--background))"
            stroke="hsl(var(--foreground))"
            strokeWidth={1}
          />
        )}

        {/* Cab indicator for tractor / vehicle at top */}
        {!isTrailer && (
          <rect
            x={cx - chassisWidth / 2 + 4}
            y={chassisTop + 4}
            width={chassisWidth - 8}
            height={6}
            rx={1}
            fill="hsl(var(--foreground) / 0.35)"
          />
        )}

        {/* Axles + wheels */}
        {axleYs.map((y, i) => {
          const isDriven = drivenSet.has(i);
          const isRear = i === axles - 1;
          const doubled = twinRear && isRear;
          const wheelFill = isDriven
            ? "hsl(var(--primary))"
            : "hsl(var(--muted-foreground) / 0.85)";
          const leftInner = cx - axleHalfLen - wheelW;
          const rightInner = cx + axleHalfLen;
          const gap = 2;
          return (
            <g key={i}>
              {/* Axle bar */}
              <rect
                x={cx - axleHalfLen - (doubled ? wheelW + gap : 0)}
                y={y - axleBarThickness / 2}
                width={axleHalfLen * 2 + (doubled ? (wheelW + gap) * 2 : 0)}
                height={axleBarThickness}
                fill="hsl(var(--foreground) / 0.6)"
              />
              {/* Left wheel(s) */}
              {doubled && (
                <rect
                  x={leftInner - wheelW - gap}
                  y={y - wheelH / 2}
                  width={wheelW}
                  height={wheelH}
                  rx={2}
                  fill={wheelFill}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1}
                />
              )}
              <rect
                x={leftInner}
                y={y - wheelH / 2}
                width={wheelW}
                height={wheelH}
                rx={2}
                fill={wheelFill}
                stroke="hsl(var(--foreground))"
                strokeWidth={1}
              />
              {/* Right wheel(s) */}
              <rect
                x={rightInner}
                y={y - wheelH / 2}
                width={wheelW}
                height={wheelH}
                rx={2}
                fill={wheelFill}
                stroke="hsl(var(--foreground))"
                strokeWidth={1}
              />
              {doubled && (
                <rect
                  x={rightInner + wheelW + gap}
                  y={y - wheelH / 2}
                  width={wheelW}
                  height={wheelH}
                  rx={2}
                  fill={wheelFill}
                  stroke="hsl(var(--foreground))"
                  strokeWidth={1}
                />
              )}
            </g>
          );
        })}
      </svg>
      <div className="text-xs text-muted-foreground flex flex-col items-center gap-1.5 text-center">
        <span>{plan}</span>
        {!isTrailer && driven > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />
            Driven axle
          </span>
        )}
      </div>
    </div>
  );
}
