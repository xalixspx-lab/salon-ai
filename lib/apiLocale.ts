import { cookies, headers } from 'next/headers';

// لغة رسائل أخطاء الـAPI: تُستنتج من مسار صفحة الطلب (Referer: /en/... أو /ar/...)
// ثم كوكي NEXT_LOCALE. الواجهة تعرض data.error كما هو، فكانت الأخطاء عربية فقط
// حتى لمستخدم الصفحات الإنجليزية.
export async function apiLang(): Promise<'ar' | 'en'> {
  try {
    const ref = (await headers()).get('referer') || '';
    const m = ref.match(/^https?:\/\/[^/]+\/(ar|en)(?:[/?#]|$)/);
    if (m) return m[1] as 'ar' | 'en';
    return (await cookies()).get('NEXT_LOCALE')?.value === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar';
  }
}

const EN: Record<string, string> = {
  'هذه الخدمة متوقفة حاليًا': 'This service is currently unavailable',
  'الوقت المختار خارج ساعات الدوام': 'The selected time is outside working hours',
  'هذا الوقت غير متاح، اختر وقتًا آخر': 'This time is not available, please choose another',
  'فشل تغيير الموعد': 'Could not change the appointment',
  'كلمة المرور يجب أن تكون 8 أحرف على الأقل': 'Password must be at least 8 characters',
  'اختر كلمة مرور مختلفة عن الحالية': 'Choose a password different from the current one',
  'كلمة المرور الحالية غير صحيحة': 'Current password is incorrect',
  'نوع موافقة غير صالح': 'Invalid consent type',
  'لسحب موافقة معالجة البيانات احذف حسابك': 'To withdraw data-processing consent, delete your account',
  'الصالون غير موجود': 'Salon not found',
  'نص الرسالة مطلوب': 'Message text is required',
  'كلمة المرور غير صحيحة': 'Incorrect password',
  'البريد الإلكتروني وكلمة المرور مطلوبان': 'Email and password are required',
  'بيانات الدخول غير صحيحة': 'Incorrect email or password',
  'هذا الحساب موقوف، تواصل مع إدارة المنصة': 'This account is suspended. Please contact the platform team',
  'فشل تسجيل الدخول': 'Login failed',
  'فشل إنشاء الحساب': 'Could not create the account',
  'فشل التحقق من أنك لست روبوت': 'Could not verify you are not a robot',
  'يجب الموافقة على شروط الاستخدام وسياسة الخصوصية': 'You must accept the terms of use and privacy policy',
  'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة': 'Name, email and password are required',
  'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل': 'An account with this email already exists',
  'هذا البريد مسجَّل كحساب صاحب صالون بالفعل، استخدم بريدًا آخر لحساب العميل':
    'This email is already registered as a salon owner account. Use a different email for a customer account',
  'تقييم غير صالح': 'Invalid rating',
  'يمكن التقييم بعد اكتمال الموعد فقط': 'You can review only after the appointment is completed',
  'تم تقييم هذا الموعد مسبقًا': 'This appointment was already reviewed',
  'هذا الصالون لا يستقبل حجوزات جديدة حاليًا': 'This salon is not accepting new bookings right now',
  'الموظف غير متاح': 'Staff member unavailable',
  'العرض غير صالح': 'Invalid offer',
  'هذا العرض لا ينطبق على هذه الخدمة': 'This offer does not apply to this service',
  'هذا العرض لأول حجز فقط': 'This offer is for a first booking only',
  'هذا الموظف محجوز في هذا الوقت، اختر وقتًا أو موظفًا آخر': 'This staff member is booked at this time. Choose another time or staff member',
  'البريد الإلكتروني مطلوب': 'Email is required',
  'حدث خطأ، حاول مرة أخرى': 'Something went wrong, please try again',
  'رابط غير صالح': 'Invalid link',
  'الرابط منتهي أو مستخدم من قبل': 'The link has expired or was already used',
  'العميل غير موجود': 'Customer not found',
  'يجب الموافقة على اتفاقية الصالون وشروط الاستخدام وسياسة الخصوصية': 'You must accept the salon agreement, terms of use and privacy policy',
  'اسم المالك والبريد الإلكتروني وكلمة المرور مطلوبة': 'Owner name, email and password are required',
  'هذا البريد مسجَّل كحساب عميل بالفعل، استخدم بريدًا آخر لتسجيل صالونك':
    'This email is already registered as a customer account. Use a different email to register your salon',
  'محاولات كثيرة، حاول مرة أخرى لاحقًا': 'Too many attempts, please try again later',
  'لا يمكن تعديل هذا الحجز': 'This booking cannot be modified',
};

// يُرجع النص الإنجليزي للرسالة العربية المعروفة عند صفحات /en، وإلا النص كما هو
export async function tr(ar: string): Promise<string> {
  if ((await apiLang()) !== 'en') return ar;
  return EN[ar] ?? ar;
}
