import type { ReactNode } from 'react';

export default function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      {icon && <span className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">{icon}</span>}
      <p className="font-semibold text-stone-900">{title}</p>
      {text && <p className="text-sm text-stone-500 mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
