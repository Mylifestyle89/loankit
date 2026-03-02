"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type SegmentOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type Props = {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
};

export function SegmentedControl({ options, value, onChange }: Props) {
  const [sliderStyle, setSliderStyle] = useState<{ width: number; transform: string }>({
    width: 0,
    transform: "translateX(0)",
  });
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = options.findIndex((o) => o.value === value);

  const updateSlider = useCallback(() => {
    const el = itemRefs.current[activeIndex];
    if (el) {
      setSliderStyle({
        width: el.offsetWidth,
        transform: `translateX(${el.offsetLeft - 3}px)`,
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    updateSlider();
  }, [updateSlider]);

  useEffect(() => {
    window.addEventListener("resize", updateSlider);
    return () => window.removeEventListener("resize", updateSlider);
  }, [updateSlider]);

  return (
    <div className="seg-root">
      {/* Slider */}
      <div
        className="seg-slider"
        style={{ width: sliderStyle.width, transform: sliderStyle.transform }}
      />

      {/* Buttons */}
      {options.map((opt, i) => (
        <button
          key={opt.value}
          ref={(el) => { itemRefs.current[i] = el; }}
          type="button"
          role="tab"
          aria-selected={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={`seg-item ${opt.value === value ? "seg-active" : ""}`}
        >
          {opt.icon && <span className="seg-icon">{opt.icon}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}
