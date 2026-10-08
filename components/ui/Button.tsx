import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type Variant = 'primary' | 'dark' | 'secondary' | 'soft' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700',
  dark: 'bg-stone-900 text-white hover:bg-stone-800',
  secondary: 'bg-white text-stone-800 border border-stone-200 hover:bg-stone-50 hover:border-stone-300',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  ghost: 'text-stone-600 hover:bg-stone-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const sizes: Record<Size, string> = { sm: 'h-9 px-3.5 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-12 px-7 text-base' };

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) => cn(base, variants[variant], sizes[size], className);

type Props = { variant?: Variant; size?: Size; href?: string; className?: string; children: ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>;

// زر موحّد: يصير رابطًا (next/link) إن مُرِّر href
export default function Button({ variant, size, href, className, children, ...rest }: Props) {
  if (href) {
    return (
      <Link href={href} className={buttonClass(variant, size, className)}>
        {children}
      </Link>
    );
  }
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
