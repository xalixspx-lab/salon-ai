'use client';

// حقل مخفي بصريًا (ليس display:none — البوتات المتقدمة تتجاهل تلك) يقع فيه
// أي بوت يملأ النماذج تلقائيًا. المستخدم الحقيقي لا يراه ولا يصل له بالتاب.
export default function HoneypotField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden="true">
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
