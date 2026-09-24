import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import { LEGAL_AUDIENCE, LEGAL_DOCS, LEGAL_SLUGS, type LegalSlug } from '@/lib/legalContent';
import { LEGAL_VERSION } from '@/lib/legal';

const isSlug = (v: string): v is LegalSlug => (LEGAL_SLUGS as string[]).includes(v);

export async function generateMetadata({ params }: { params: Promise<{ locale: string; doc: string }> }): Promise<Metadata> {
  const { locale, doc } = await params;
  if (!isSlug(doc)) return {};
  const d = LEGAL_DOCS[doc][locale === 'en' ? 'en' : 'ar'];
  return { title: d.title, description: d.summary };
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string; doc: string }> }) {
  const { locale, doc } = await params;
  if (!isSlug(doc)) notFound();
  const lang = locale === 'en' ? 'en' : 'ar';
  const d = LEGAL_DOCS[doc][lang];

  return (
    <>
      <PublicHeader locale={locale} />
      <main className="min-h-screen bg-gray-50 px-4 py-10" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <article className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-10">
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            {lang === 'ar'
              ? 'مسودة أولية لم تُعتمد قانونيًا بعد — يجب مراجعتها من محامٍ مرخّص قبل الإطلاق التجاري.'
              : 'Preliminary draft not yet legally approved — must be reviewed by a licensed lawyer before commercial launch.'}
          </p>
          <span className="inline-block mb-3 rounded-full bg-purple-50 text-purple-700 px-3 py-1 text-xs font-semibold">
            {lang === 'ar' ? 'ينطبق على: ' : 'Applies to: '}
            {{ customer: lang === 'ar' ? 'العملاء' : 'Customers', owner: lang === 'ar' ? 'أصحاب الصالونات' : 'Salon owners', both: lang === 'ar' ? 'العملاء وأصحاب الصالونات' : 'Customers and salon owners' }[LEGAL_AUDIENCE[doc]]}
          </span>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{d.title}</h1>
          <p className="text-gray-600 mb-1">{d.summary}</p>
          <p className="text-xs text-gray-400 mb-8">
            {lang === 'ar' ? 'رقم النسخة' : 'Version'}: {LEGAL_VERSION}
          </p>

          <div className="space-y-7">
            {d.sections.map((s) => (
              <section key={s.heading}>
                <h2 className="text-lg font-bold text-gray-900 mb-2">{s.heading}</h2>
                {s.paragraphs.map((p) => (
                  <p key={p} className="text-gray-700 leading-relaxed mb-2">{p}</p>
                ))}
              </section>
            ))}
          </div>

          <nav className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
            <Link href={`/${locale}/legal`} className="font-semibold text-gray-800 hover:underline">
              {lang === 'ar' ? 'كل الوثائق' : 'All documents'}
            </Link>
            {LEGAL_SLUGS.filter((s) => s !== doc).map((s) => (
              <Link key={s} href={`/${locale}/legal/${s}`} className="text-blue-600 hover:underline">
                {LEGAL_DOCS[s][lang].title}
              </Link>
            ))}
          </nav>
        </article>
      </main>
    </>
  );
}
