import { useState, useRef, useLayoutEffect } from 'react';
import './base.css';

interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ checked, defaultChecked = false, onChange, disabled }: ToggleProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isOn = isControlled ? checked : internalChecked;

  const wrapperRef = useRef<HTMLButtonElement>(null);
  const btnRef = useRef<HTMLImageElement>(null);
  const [travelX, setTravelX] = useState<number | null>(null);

  const measure = () => {
    if (!wrapperRef.current || !btnRef.current) return;
    const btnW = btnRef.current.offsetWidth;
    if (btnW === 0) return;
    setTravelX(wrapperRef.current.offsetWidth - btnW - 8);
  };

  useLayoutEffect(measure, []);

  const handleClick = () => {
    if (disabled) return;
    const next = !isOn;
    if (!isControlled) setInternalChecked(next);
    onChange?.(next);
  };

  const xPos = isOn ? (travelX ?? 0) : 8;

  return (
    <button
      ref={wrapperRef}
      type="button"
      role="switch"
      aria-checked={isOn}
      onClick={handleClick}
      disabled={disabled}
      className="pixel-toggle"
    >
      <img
        src="/images/ui/toggle_bg.png"
        alt=""
        className="pixel-toggle__bg"
        draggable={false}
        onLoad={measure}
      />
      <img
        ref={btnRef}
        src="/images/ui/toggle_button.png"
        alt=""
        className="pixel-toggle__btn"
        style={{ transform: `translateX(${xPos}px)` }}
        draggable={false}
        onLoad={measure}
      />
    </button>
  );
}
