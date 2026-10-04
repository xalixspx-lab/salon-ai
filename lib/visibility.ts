// الصالون ظاهر للعامة فقط إذا نشره مالكه ولم تحظره الإدارة. adminHiddenAt يضبطه
// الأدمن وحده، فلا يلغيه المالك بإعادة تفعيل "منشور" من لوحته.
export const PUBLIC_TENANT = { isPublished: true, adminHiddenAt: null } as const;

export function isPubliclyVisible(t: { isPublished: boolean; adminHiddenAt: Date | null }) {
  return t.isPublished && !t.adminHiddenAt;
}
