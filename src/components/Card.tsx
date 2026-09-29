import type { ReactNode } from 'react';

export default function Card({
  title, right, children, className = '',
}: { title?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section
      className={`innila-card rounded-2xl glass p-4 overflow-visible ${className}`}
    >
      {(title || right) && (
        <header className="innila-card-header flex items-center justify-between mb-3 gap-2 pb-2 border-b border-border/40">
          <h2 className="innila-card-title text-xs font-semibold uppercase tracking-widest text-muted">
            {title}
          </h2>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}