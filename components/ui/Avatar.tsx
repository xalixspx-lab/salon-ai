import { cn } from '@/components/ui/cn';

export default function Avatar({ name, src, size = 36, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0)).join('').toUpperCase() || '?';
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} width={size} height={size} className={cn('rounded-full object-cover', className)} style={{ width: size, height: size }} />;
  }
  return (
    <span className={cn('rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center shrink-0', className)} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-label={name}>
      {initials}
    </span>
  );
}
