import { ReactNode, useRef, useState, useEffect } from 'react';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface Props {
  label: string;
  placement?: Placement;
  delay?: number;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}

export default function Tooltip({
  label,
  placement = 'top',
  delay = 300,
  children,
  disabled = false,
  className = '',
}: Props) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  const updateCoords = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setCoords({
      x: r.left + r.width / 2,
      y: placement === 'top'
        ? r.top
        : placement === 'bottom'
        ? r.bottom
        : r.top + r.height / 2,
    });
  };

  const start = () => {
    if (disabled) return;
    timerRef.current = window.setTimeout(() => {
      updateCoords();
      setShow(true);
    }, delay);
  };

  const end = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setShow(false);
  };

  // Update position on scroll / resize while shown
  useEffect(() => {
    if (!show) return;
    const handler = () => updateCoords();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [show]);

  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  return (
    <>
      <div
        ref={wrapRef}
        className={`inline-flex ${className}`}
        onMouseEnter={start}
        onMouseLeave={end}
        onFocus={start}
        onBlur={end}
      >
        {children}
      </div>

      {show && !disabled && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            left: coords.x,
            top: placement === 'top' ? coords.y - 8 : coords.y + 8,
            transform:
              placement === 'top'
                ? 'translate(-50%, -100%)'
                : placement === 'bottom'
                ? 'translate(-50%, 0)'
                : 'translate(0, -50%)',
            zIndex: 99999,
          }}
          className="pointer-events-none whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-black/95 text-slate-100 shadow-2xl border border-neon-lime/30 backdrop-blur-md animate-[fadeIn_120ms_ease-out]"
        >
          {label}
          <span
            className={`absolute w-0 h-0 border-4 ${
              placement === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 border-t-black/95 border-x-transparent border-b-transparent'
                : 'bottom-full left-1/2 -translate-x-1/2 border-b-black/95 border-x-transparent border-t-transparent'
            }`}
          />
        </div>
      )}
    </>
  );
}