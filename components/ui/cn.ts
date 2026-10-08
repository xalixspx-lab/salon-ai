// دمج أسماء الأصناف مع تجاهل القيم الفارغة
export const cn = (...v: Array<string | false | null | undefined>) => v.filter(Boolean).join(' ');
