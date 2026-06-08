import type { ReactNode } from 'react';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { formatDateTime } from '../utils/time';

export function Card({ title, eyebrow, source, updated, action, className = '', children }: { title: string; eyebrow?: string; source?: string; updated?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return <section className={`card ${className}`}>
    <header className="card-header"><div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h2>{title}</h2></div>{action}</header>
    {children}
    {(source || updated) && <footer className="source-line"><span>{source}</span>{updated && <span><Clock3 size={12}/> {formatDateTime(updated)}</span>}</footer>}
  </section>;
}
export function Skeleton({ rows = 3 }: { rows?: number }) { return <div className="skeleton-stack">{Array.from({ length: rows }, (_, i) => <div className="skeleton" key={i}/>)}</div>; }
export function ErrorState({ message }: { message: string }) { return <div className="error-state"><AlertTriangle size={20}/><div><strong>Data unavailable</strong><p>{message}</p></div></div>; }
export function Metric({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) { return <div className="metric"><span>{label}</span><strong>{value ?? '—'}</strong>{detail && <small>{detail}</small>}</div>; }
