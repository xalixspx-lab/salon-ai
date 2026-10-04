'use client';

// حقل مخفي بصريًا (ليس display:none — البوتات المتقدمة تتجاهل تلك) يقع فيه
// أي بوت يملأ النماذج تلقائيًا. المستخدم الحقيقي لا يراه ولا يصل له بالتاب.
// لا يُستعمل left:-9999px: في الصفحات العربية RTL تصير المساحة السالبة قابلة
// للتمرير فيتمدد عرض الصفحة ~10000px وتنكسر على الجوال وفي WebView التطبيق.
export default function HoneypotField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        overflow: 'hidden',
        clipPath: 'inset(50%)',
        whiteSpace: 'nowrap',
        opacity: 0,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    >
      <label htmlFor="website">Website</label>
      <input
        id="website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
