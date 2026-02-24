"use client";

import { memo, useCallback, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export type MappingLink = {
  sourceKey: string;
  targetKey: string;
  isAi: boolean;
};

type Point = { x: number; y: number };

type BezierLine = {
  id: string;
  from: Point;
  to: Point;
  isAi: boolean;
  sourceVisible: boolean;
  targetVisible: boolean;
};

type MappingCanvasProps = {
  links: MappingLink[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  sourceScrollRef: React.RefObject<HTMLDivElement | null>;
  targetScrollRef: React.RefObject<HTMLDivElement | null>;
  animationKey: number;
  hoveredKey: string | null;
};

function isInView(el: HTMLElement, scrollContainer: HTMLElement): boolean {
  const elRect = el.getBoundingClientRect();
  const cRect = scrollContainer.getBoundingClientRect();
  return elRect.bottom > cRect.top && elRect.top < cRect.bottom;
}

function clampY(y: number, scrollContainer: HTMLElement): number {
  const cRect = scrollContainer.getBoundingClientRect();
  return Math.max(cRect.top + 4, Math.min(cRect.bottom - 4, y));
}

function computeLines(
  links: MappingLink[],
  containerEl: HTMLElement,
  sourceScrollEl: HTMLElement,
  targetScrollEl: HTMLElement,
): BezierLine[] {
  const containerRect = containerEl.getBoundingClientRect();
  const result: BezierLine[] = [];

  for (const link of links) {
    const sourceEl = containerEl.querySelector(`[data-header="${CSS.escape(link.sourceKey)}"]`) as HTMLElement | null;
    const targetEl = containerEl.querySelector(`[data-placeholder="${CSS.escape(link.targetKey)}"]`) as HTMLElement | null;
    if (!sourceEl || !targetEl) continue;

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();

    const sourceVisible = isInView(sourceEl, sourceScrollEl);
    const targetVisible = isInView(targetEl, targetScrollEl);

    const rawFromY = sourceRect.top + sourceRect.height / 2;
    const rawToY = targetRect.top + targetRect.height / 2;

    const fromX = sourceRect.right - containerRect.left;
    const fromY = (sourceVisible ? rawFromY : clampY(rawFromY, sourceScrollEl)) - containerRect.top;
    const toX = targetRect.left - containerRect.left;
    const toY = (targetVisible ? rawToY : clampY(rawToY, targetScrollEl)) - containerRect.top;

    result.push({
      id: `${link.sourceKey}::${link.targetKey}`,
      from: { x: fromX, y: fromY },
      to: { x: toX, y: toY },
      isAi: link.isAi,
      sourceVisible,
      targetVisible,
    });
  }

  return result;
}

const BezierPath = memo(function BezierPath({
  line,
  isHovered,
  animationKey,
  index,
}: {
  line: BezierLine;
  isHovered: boolean;
  animationKey: number;
  index: number;
}) {
  const dx = Math.abs(line.to.x - line.from.x);
  const cpOffset = Math.max(40, dx * 0.45);
  const d = `M ${line.from.x} ${line.from.y} C ${line.from.x + cpOffset} ${line.from.y}, ${line.to.x - cpOffset} ${line.to.y}, ${line.to.x} ${line.to.y}`;

  const bothVisible = line.sourceVisible && line.targetVisible;
  const opacity = bothVisible ? (isHovered ? 1 : 0.55) : 0.15;
  const strokeWidth = isHovered ? 2.5 : 1.5;
  const stroke = line.isAi
    ? (isHovered ? "#818cf8" : "#a5b4fc")
    : (isHovered ? "#64748b" : "#94a3b8");

  return (
    <motion.path
      key={`${line.id}-${animationKey}`}
      d={d}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={line.isAi ? "6 4" : undefined}
      className={line.isAi ? "animate-dash-flow" : undefined}
      opacity={opacity}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity }}
      transition={{
        pathLength: { type: "spring", stiffness: 120, damping: 20, delay: index * 0.06 },
        opacity: { duration: 0.3, delay: index * 0.06 },
      }}
      style={{ pointerEvents: "none" }}
    />
  );
});

export const MappingCanvas = memo(function MappingCanvas({
  links,
  containerRef,
  sourceScrollRef,
  targetScrollRef,
  animationKey,
  hoveredKey,
}: MappingCanvasProps) {
  const [lines, setLines] = useState<BezierLine[]>([]);
  const rafRef = useRef(0);

  const recalc = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!containerRef.current || !sourceScrollRef.current || !targetScrollRef.current) return;
      setLines(computeLines(links, containerRef.current, sourceScrollRef.current, targetScrollRef.current));
    });
  }, [links, containerRef, sourceScrollRef, targetScrollRef]);

  useLayoutEffect(() => {
    recalc();
  }, [recalc, animationKey]);

  useLayoutEffect(() => {
    const srcEl = sourceScrollRef.current;
    const tgtEl = targetScrollRef.current;
    if (!srcEl || !tgtEl) return;

    srcEl.addEventListener("scroll", recalc, { passive: true });
    tgtEl.addEventListener("scroll", recalc, { passive: true });
    window.addEventListener("resize", recalc);

    return () => {
      srcEl.removeEventListener("scroll", recalc);
      tgtEl.removeEventListener("scroll", recalc);
      window.removeEventListener("resize", recalc);
      cancelAnimationFrame(rafRef.current);
    };
  }, [recalc, sourceScrollRef, targetScrollRef]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {lines.map((line, i) => (
        <BezierPath
          key={line.id}
          line={line}
          isHovered={hoveredKey !== null && (line.id.startsWith(hoveredKey) || line.id.endsWith(hoveredKey))}
          animationKey={animationKey}
          index={i}
        />
      ))}
    </svg>
  );
});
