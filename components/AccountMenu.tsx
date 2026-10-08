'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';

// قائمة حساب العميل في الهيدر العام: صورة رمزية + اسم + (حسابي / تسجيل الخروج)
export default function AccountMenu({ locale, name, labels }: { locale: string; name: string; labels: { account: string; logout: string } }) {
  const router = useRouter();
  const logout = async () => {
    await fetch('/api/account/logout', { method: 'POST' });
    router.push(`/${locale}`);
    router.refresh();
  };
  return (
    <Dropdown
      trigger={
        <span className="flex items-center gap-2 ps-1 pe-2.5 py-1 rounded-full border border-stone-200 hover:bg-stone-50 transition-colors">
          <Avatar name={name} size={30} />
          <span className="text-sm font-medium text-stone-800 max-w-[110px] truncate">{name}</span>
          <ChevronDown className="h-3.5 w-3.5 text-stone-400" />
        </span>
      }
      items={[
        { label: labels.account, href: `/${locale}/account`, icon: <UserRound /> },
        { type: 'separator' },
        { label: labels.logout, onSelect: logout, icon: <LogOut />, danger: true },
      ]}
    />
  );
}
