export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-50 text-red-700 border-red-200',
    Expired: 'bg-slate-100 text-slate-600 border-slate-200',
    'Under Review': 'bg-blue-50 text-blue-700 border-blue-200',
    Processing: 'bg-blue-50 text-blue-700 border-blue-200',
    Submitted: 'bg-slate-100 text-slate-700 border-slate-200',
    'Pending Documents': 'bg-amber-50 text-amber-700 border-amber-200',
    'Additional Information Required': 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {status}
    </span>
  );
}

export function RiskBadge({ level, score }: { level?: string; score?: number }) {
  if (!level) return <span className="text-xs text-slate-400">Unscored</span>;
  const styles: Record<string, string> = {
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    High: 'bg-red-50 text-red-700 border-red-200',
  };
  const pct = typeof score === 'number' ? ` (${Math.round(score * 100)}%)` : '';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[level] || 'bg-slate-100 text-slate-700'}`}>
      {level} Risk{pct}
    </span>
  );
}

