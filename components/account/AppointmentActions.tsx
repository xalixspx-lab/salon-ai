'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export default function AppointmentActions({
  appointmentId,
  tenantId,
  serviceId,
  employeeId,
  timezone,
}: {
  appointmentId: string;
  tenantId: string;
  serviceId: string;
  employeeId: string | null;
  timezone: string;
}) {
  const t = useTranslations('Account');
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'confirmCancel' | 'reschedule'>('idle');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'reschedule' || !date) return;
    let cancelled = false;
    const qs = new URLSearchParams({
      serviceId,
      date,
      excludeAppointmentId: appointmentId,
      ...(employeeId ? { employeeId } : {}),
    });
    fetch(`/api/salons/${tenantId}/availability?${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setSlots(d.success ? d.data.slots : []);
        setPicked('');
      });
    return () => {
      cancelled = true;
    };
  }, [mode, date, tenantId, serviceId, employeeId, appointmentId]);

  const call = async (path: string, body?: object) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/account/appointments/${appointmentId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMode('idle');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'confirmCancel') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-600">{t('confirmCancel')}</span>
        <button disabled={busy} onClick={() => call('cancel')} className="text-xs bg-red-600 text-white px-2 py-1 rounded">
          {t('yesCancel')}
        </button>
        <button onClick={() => setMode('idle')} className="text-xs text-gray-500 underline">
          {t('back')}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  if (mode === 'reschedule') {
    return (
      <div className="space-y-2 min-w-56">
        <input
          type="date"
          value={date}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
          className="w-full border rounded px-2 py-1 text-xs text-black"
        />
        {date && (
          <div className="flex flex-wrap gap-1">
            {slots.length === 0 ? (
              <span className="text-xs text-gray-500">{t('noSlots')}</span>
            ) : (
              slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setPicked(s)}
                  className={`text-xs px-2 py-1 rounded border ${picked === s ? 'bg-brand-600 text-white' : 'bg-white text-gray-700'}`}
                >
                  {new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: timezone })}
                </button>
              ))
            )}
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            disabled={busy || !picked}
            onClick={() => call('reschedule', { startTime: picked })}
            className="text-xs bg-brand-600 text-white px-2 py-1 rounded disabled:opacity-40"
          >
            {t('saveNewTime')}
          </button>
          <button onClick={() => setMode('idle')} className="text-xs text-gray-500 underline">
            {t('back')}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex gap-3 text-xs">
      <button onClick={() => setMode('reschedule')} className="text-blue-600 hover:underline">
        {t('reschedule')}
      </button>
      <button onClick={() => setMode('confirmCancel')} className="text-red-600 hover:underline">
        {t('cancelBooking')}
      </button>
    </div>
  );
}
