import { cn } from '@/components/ui/cn';

export default function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-stone-200/70', className)} aria-hidden />;
}
