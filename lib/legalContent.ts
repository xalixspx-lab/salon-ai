// نصوص الوثائق القانونية (مسودة). هذه صياغة أولية تنفيذًا للقسم 7 من PRD V3،
// ويجب مراجعتها واعتمادها من محامٍ مرخّص قبل الإطلاق التجاري. عند تعديلها
// جوهريًا ارفع LEGAL_VERSION في lib/legal.ts لإلزام الجميع بالموافقة من جديد.

export type LegalSlug = 'privacy' | 'terms' | 'tenant-agreement' | 'refund';
export const LEGAL_SLUGS: LegalSlug[] = ['terms', 'privacy', 'refund', 'tenant-agreement'];

// الجهة التي تنطبق عليها كل وثيقة — تُعرض في الصفحة المركزية وفي رأس كل وثيقة
export type LegalAudience = 'customer' | 'owner' | 'both';
export const LEGAL_AUDIENCE: Record<LegalSlug, LegalAudience> = {
  terms: 'customer',
  privacy: 'both',
  refund: 'both',
  'tenant-agreement': 'owner',
};

interface Section {
  heading: string;
  paragraphs: string[];
}
interface LegalDoc {
  title: string;
  summary: string;
  sections: Section[];
}

export const LEGAL_DOCS: Record<LegalSlug, Record<'ar' | 'en', LegalDoc>> = {
  terms: {
    ar: {
      title: 'شروط استخدام المنصة (للعملاء)',
      summary: 'تنظّم استخدامك لسوق Salon AI للبحث عن الصالونات وحجز المواعيد.',
      sections: [
        {
          heading: '1. طبيعة المنصة',
          paragraphs: [
            'Salon AI منصة تقنية وسيطة تتيح لك اكتشاف الصالونات ومراكز التجميل ومقارنتها وحجز مواعيد لديها. الخدمة الفعلية يقدّمها الصالون وحده، وعلاقة تقديم الخدمة قائمة بينك وبينه مباشرة.',
            'المنصة ليست مقدّمة للخدمات التجميلية ولا تضمن جودتها أو نتائجها، وتقتصر مسؤوليتها على توفير الوسيلة التقنية للبحث والحجز.',
          ],
        },
        {
          heading: '2. الحساب والاستخدام',
          paragraphs: [
            'تلتزم بتقديم بيانات صحيحة، وبالحفاظ على سرية كلمة المرور، وتتحمل مسؤولية كل نشاط يتم عبر حسابك.',
            'يُمنع إساءة استخدام المنصة، ومنه إنشاء حجوزات وهمية أو متكررة بقصد الإضرار، أو محاولة الوصول لبيانات غيرك، أو استخدام برمجيات آلية.',
            'يحق للمنصة إيقاف أو حذف أي حساب يخالف هذه الشروط.',
          ],
        },
        {
          heading: '3. الحجز والعربون والإلغاء',
          paragraphs: [
            'قد يشترط الصالون دفع عربون لتثبيت الحجز، وتُعرض قيمته وسياسة الإلغاء والاسترداد قبل إتمام الحجز. تسري سياسة الاسترداد المنشورة في صفحة «سياسة العربون والاسترداد».',
            'الحجز غير المؤكد بالعربون يُحجز مؤقتًا لمدة محدودة ثم يُفرج عنه تلقائيًا.',
          ],
        },
        {
          heading: '3.1 التقييمات',
          paragraphs: [
            'يمكنك تقييم الصالون بعد زيارة مكتملة. يجب أن يعبّر التقييم عن تجربتك الفعلية، وللمنصة إخفاء أي تقييم مسيء أو مخالف.',
          ],
        },
        {
          heading: '4. حدود المسؤولية',
          paragraphs: [
            'تُقدَّم المنصة «كما هي». وفي أقصى حد يسمح به القانون، لا تتحمل المنصة مسؤولية عن جودة الخدمة المقدّمة في الصالون، أو عن أي ضرر غير مباشر ينشأ عن استخدامك للمنصة.',
          ],
        },
        {
          heading: '5. الخصوصية',
          paragraphs: ['تخضع معالجة بياناتك الشخصية لسياسة الخصوصية المنشورة على المنصة وتُعد جزءًا من هذه الشروط.'],
        },
        {
          heading: '6. القانون الواجب التطبيق',
          paragraphs: ['تخضع هذه الشروط لقوانين مملكة البحرين، وتختص محاكمها بالنظر في أي نزاع ينشأ عنها، ما لم يقرر القانون الإلزامي خلاف ذلك.'],
        },
      ],
    },
    en: {
      title: 'Marketplace Terms of Use (Customers)',
      summary: 'Governs your use of the Salon AI marketplace to discover salons and book appointments.',
      sections: [
        {
          heading: '1. Nature of the platform',
          paragraphs: [
            'Salon AI is a technology intermediary that lets you discover, compare and book appointments at salons and beauty centres. The service itself is provided solely by the salon, and the service relationship is directly between you and the salon.',
            'Salon AI is not a provider of beauty services and does not guarantee their quality or results; it only provides the technical means for search and booking.',
          ],
        },
        {
          heading: '2. Account and acceptable use',
          paragraphs: [
            'You agree to provide accurate information, keep your password confidential, and take responsibility for all activity under your account.',
            'Abuse is prohibited, including fake or repeated bookings intended to cause harm, attempts to access other people\'s data, or use of automated tools.',
            'We may suspend or delete any account that breaches these terms.',
          ],
        },
        {
          heading: '3. Bookings, deposits and cancellation',
          paragraphs: [
            'A salon may require a deposit to secure a booking. The amount and the cancellation and refund policy are shown before you complete the booking. The policy published on the "Deposit & Refund Policy" page applies.',
            'A booking not confirmed by deposit is held temporarily for a limited time and then released automatically.',
          ],
        },
        {
          heading: '3.1 Reviews',
          paragraphs: ['You may review a salon after a completed visit. Reviews must reflect your genuine experience, and we may hide any abusive or non-compliant review.'],
        },
        {
          heading: '4. Limitation of liability',
          paragraphs: [
            'The platform is provided "as is". To the maximum extent permitted by law, Salon AI is not liable for the quality of services provided at the salon, or for any indirect damage arising from your use of the platform.',
          ],
        },
        {
          heading: '5. Privacy',
          paragraphs: ['Processing of your personal data is governed by the Privacy Policy published on the platform, which forms part of these terms.'],
        },
        {
          heading: '6. Governing law',
          paragraphs: ['These terms are governed by the laws of the Kingdom of Bahrain, and its courts have jurisdiction over any dispute arising from them, unless mandatory law provides otherwise.'],
        },
      ],
    },
  },

  privacy: {
    ar: {
      title: 'سياسة الخصوصية',
      summary: 'كيف نجمع بياناتك الشخصية ونستخدمها ونحميها، وما هي حقوقك.',
      sections: [
        {
          heading: '1. الإطار النظامي',
          paragraphs: [
            'نلتزم بقانون حماية البيانات الشخصية في مملكة البحرين (القانون رقم 30 لسنة 2018) كحد أدنى، وبما يقابله من أنظمة في الأسواق الأخرى التي نعمل فيها.',
          ],
        },
        {
          heading: '2. البيانات التي نجمعها',
          paragraphs: [
            'بيانات الحساب: الاسم والبريد الإلكتروني وكلمة المرور (مخزّنة مشفّرة بصيغة لا يمكن عكسها).',
            'بيانات الحجز: الصالون والخدمة والموعد ورقم الجوال الذي تدخله عند الحجز، وسجل الحجوزات والتقييمات والمفضلة ونقاط الولاء.',
            'بيانات تقنية: عنوان IP وسجلات الأخطاء الضرورية لتشغيل المنصة وحمايتها، وموقعك الجغرافي فقط إذا سمحت به متصفحك للبحث عن الأقرب إليك.',
            'بيانات أصحاب الصالونات: بيانات الصالون وموقعه وشعاره وصوره وبيانات المالك وإعدادات الحجز.',
          ],
        },
        {
          heading: '3. أغراض المعالجة',
          paragraphs: [
            'تنفيذ الحجوزات وإدارة الحسابات، إرسال رسائل تشغيلية (تأكيد الحجز، الإلغاء، استعادة كلمة المرور)، منع الاحتيال والإساءة، وتحسين الخدمة.',
            'الرسائل التسويقية والعروض لا تُرسل إلا بموافقتك الصريحة المنفصلة، ويمكنك سحبها في أي وقت من صفحة حسابك.',
          ],
        },
        {
          heading: '3.1 أدوار المعالجة: العميل مقابل صاحب الصالون',
          paragraphs: [
            'بيانات حساب العميل (الاسم والبريد وكلمة المرور والنقاط والموافقات) تتحكم بها المنصة.',
            'بيانات الحجز التي يراها الصالون (اسمك ورقم جوالك وتفاصيل الموعد) يعالجها الصالون بصفته مسؤولًا مستقلًا عنها لغرض تنفيذ خدمتك، وهو ملزم بحمايتها وبعدم استخدامها للتسويق دون موافقتك، وفق اتفاقية الصالون مع المنصة.',
            'صاحب الصالون: نعالج بيانات حسابه وبيانات صالونه (الاسم والموقع والشعار والصور والإعدادات) لتشغيل الاشتراك والسوق، ونسجّل موافقته على اتفاقية الصالون ونسختها وتاريخها وعنوان IP.',
          ],
        },
        {
          heading: '4. المشاركة مع أطراف أخرى',
          paragraphs: [
            'يطّلع الصالون الذي تحجز لديه على اسمك ورقم جوالك وتفاصيل حجزك فقط.',
            'نستعين بمزودي بنية تحتية لتشغيل المنصة: الاستضافة (Vercel)، قاعدة البيانات (Prisma Postgres)، تخزين الصور (Supabase)، البريد (Resend)، مراقبة الأخطاء (Sentry)، وذاكرة التخزين المؤقت (Redis). قد تقع خوادم بعضها خارج البحرين، ونشترط لديها ضمانات حماية مناسبة. عند تفعيل الدفع أو واتساب أو الذكاء الاصطناعي سنُحدّث هذه القائمة قبل التفعيل.',
            'لا نبيع بياناتك الشخصية.',
          ],
        },
        {
          heading: '5. الاحتفاظ بالبيانات',
          paragraphs: [
            'نحتفظ ببياناتك ما دام حسابك قائمًا. عند حذف حسابك تُحذف بياناته الشخصية وتُفصل سجلات الحجز التاريخية لدى الصالونات عن هويتك. نحتفظ بسجلات الموافقات القانونية (معرّف وتاريخ وعنوان IP) لإثبات الالتزام النظامي.',
          ],
        },
        {
          heading: '6. حقوقك',
          paragraphs: [
            'لك حق الاطلاع على بياناتك وتصديرها، وتصحيحها، وحذف حسابك، وسحب موافقاتك التسويقية. تجد أدوات ذلك في صفحة «حسابي» ضمن قسم الخصوصية والبيانات.',
            'أصحاب الصالونات: يمكنكم طلب تصحيح بيانات الصالون من لوحة التحكم، وطلب تصدير بياناتكم أو حذف الحساب من الدعم، وتُحذف بيانات الصالون وحجوزاته وخدماته بعد التحقق من هوية المالك.',
            'لأي استفسار أو شكوى تواصل معنا عبر قنوات الدعم المعلنة على المنصة، ولك حق التقدم بشكوى للجهة الرقابية المختصة.',
          ],
        },
        {
          heading: '7. الأمان',
          paragraphs: [
            'نستخدم اتصالات مشفّرة (TLS)، وعزلًا بين بيانات الصالونات، وتقييدًا لمحاولات الدخول، وسياسة أمان للمحتوى. لا يوجد نظام آمن بشكل مطلق، ونلتزم بإخطارك والجهات المختصة عند وقوع حادث يمسّ بياناتك وفق النظام.',
          ],
        },
        {
          heading: '8. ملفات تعريف الارتباط',
          paragraphs: ['نستخدم ملفات ضرورية فقط لتسجيل الدخول وحفظ اللغة، ولا نستخدم ملفات تتبع إعلانية.'],
        },
      ],
    },
    en: {
      title: 'Privacy Policy',
      summary: 'How we collect, use and protect your personal data, and what your rights are.',
      sections: [
        {
          heading: '1. Legal framework',
          paragraphs: [
            'We comply as a minimum with the Kingdom of Bahrain\'s Personal Data Protection Law (Law No. 30 of 2018), and with the equivalent rules of other markets in which we operate.',
          ],
        },
        {
          heading: '2. Data we collect',
          paragraphs: [
            'Account data: name, email and password (stored hashed in a non-reversible form).',
            'Booking data: the salon, service, appointment time and the phone number you enter when booking, plus your booking history, reviews, favourites and loyalty points.',
            'Technical data: IP address and error logs needed to operate and protect the platform, and your location only if you allow your browser to share it for "nearest salon" search.',
            'Salon owner data: salon details, location, logo, photos, owner details and booking settings.',
          ],
        },
        {
          heading: '3. Purposes of processing',
          paragraphs: [
            'Fulfilling bookings and managing accounts, sending operational messages (booking confirmation, cancellation, password reset), preventing fraud and abuse, and improving the service.',
            'Marketing messages and offers are sent only with your separate, explicit consent, which you can withdraw at any time from your account page.',
          ],
        },
        {
          heading: '3.1 Processing roles: customer vs salon owner',
          paragraphs: [
            'Customer account data (name, email, password, points and consents) is controlled by the platform.',
            'Booking data a salon sees (your name, phone number and appointment details) is processed by the salon as an independent controller to deliver your service; it must protect it and must not use it for marketing without your consent, under the salon\'s agreement with the platform.',
            'Salon owners: we process account and salon data (name, location, logo, photos, settings) to run the subscription and marketplace, and we record the owner\'s acceptance of the Salon Agreement, its version, date and IP address.',
          ],
        },
        {
          heading: '4. Sharing with others',
          paragraphs: [
            'A salon you book with sees only your name, phone number and booking details.',
            'We use infrastructure providers to run the platform: hosting (Vercel), database (Prisma Postgres), image storage (Supabase), email (Resend), error monitoring (Sentry) and caching (Redis). Some servers may be outside Bahrain and we require appropriate safeguards from them. Before enabling payments, WhatsApp or AI features we will update this list.',
            'We do not sell your personal data.',
          ],
        },
        {
          heading: '5. Retention',
          paragraphs: [
            'We keep your data while your account exists. When you delete your account, its personal data is deleted and historical booking records held by salons are detached from your identity. We retain legal consent records (identifier, date and IP address) to prove regulatory compliance.',
          ],
        },
        {
          heading: '6. Your rights',
          paragraphs: [
            'You may access and export your data, correct it, delete your account, and withdraw marketing consent. Tools for this are in "My account" under Privacy & data.',
            'Salon owners: you can correct salon details from the dashboard, and request a data export or account deletion through support; the salon\'s data, bookings and services are deleted after the owner\'s identity is verified.',
            'For questions or complaints, contact us through the support channels published on the platform; you may also complain to the competent supervisory authority.',
          ],
        },
        {
          heading: '7. Security',
          paragraphs: [
            'We use encrypted connections (TLS), isolation between salons\' data, login-attempt limiting and a content security policy. No system is absolutely secure, and we will notify you and the competent authorities of any incident affecting your data as the law requires.',
          ],
        },
        {
          heading: '8. Cookies',
          paragraphs: ['We use only essential cookies for sign-in and language preference, and no advertising trackers.'],
        },
      ],
    },
  },

  refund: {
    ar: {
      title: 'سياسة العربون والاسترداد',
      summary: 'الحد الأدنى الموحّد لسياسة الإلغاء واسترداد العربون على مستوى المنصة.',
      sections: [
        {
          heading: '1. العربون',
          paragraphs: [
            'قد يشترط الصالون عربونًا كنسبة من قيمة الخدمة لتثبيت الحجز. تُعرض قيمة العربون ومهلة الإلغاء المجاني ونسبة الاسترداد بعدها بوضوح في صفحة الصالون قبل إتمام الحجز.',
          ],
        },
        {
          heading: '2. الإلغاء المجاني',
          paragraphs: [
            'إذا ألغيت أو غيّرت موعدك قبل الموعد بمدة لا تقل عن «مهلة الإلغاء» التي حددها الصالون، تسترد العربون كاملًا.',
          ],
        },
        {
          heading: '3. الإلغاء بعد انتهاء المهلة',
          paragraphs: [
            'بعد انتهاء المهلة يُسترد جزء من العربون بحسب النسبة التي حددها الصالون (قد تكون صفرًا)، ويستحقّ الصالون الباقي تعويضًا عن الوقت المحجوز.',
            'يجوز لكل صالون تخصيص شروط أفضل للعميل من هذا الحد الأدنى، ولا يجوز أن تكون أسوأ منه.',
          ],
        },
        {
          heading: '4. إلغاء الصالون',
          paragraphs: ['إذا ألغى الصالون الحجز أو تعذّر تقديم الخدمة لسبب يعود إليه، يُسترد العربون كاملًا في جميع الأحوال.'],
        },
        {
          heading: '5. النزاعات',
          paragraphs: [
            'عند الخلاف بين العميل والصالون على العربون، يُرفع الطلب إلى المنصة التي تتوسط بين الطرفين بحسب المعلومات المتاحة (سجل الحجز ووقت الإلغاء)، ويكون قرارها في حدود سياسة الاسترداد هذه نهائيًا على مستوى المنصة، دون الإخلال بحقك في اللجوء للقضاء.',
          ],
        },
        {
          heading: '5.1 التزامات الصالون',
          paragraphs: [
            'على الصالون أن يحدد مهلة الإلغاء ونسبة الاسترداد بعدها من إعدادات صالونه، وأن تكون شروطه مساوية لهذا الحد الأدنى أو أفضل للعميل، وأن يتعاون مع المنصة بتقديم ما يلزم عند أي نزاع.',
            'إذا ألغى الصالون حجزًا مؤكدًا أو لم يقدّم الخدمة، يتحمل ردّ العربون كاملًا، وقد يترتب على تكرار ذلك إيقاف الحساب.',
            'تُخصم المبالغ المستردة من مستحقات الصالون لدى المنصة عند تفعيل الدفع الإلكتروني.',
          ],
        },
        {
          heading: '6. مدة تنفيذ الاسترداد',
          paragraphs: ['يُنفَّذ الاسترداد إلى وسيلة الدفع الأصلية بعد اعتماده، وتحدد مدة وصوله وسيلة الدفع والبنك. تُفعَّل الدفعات الإلكترونية لاحقًا، وتسري هذه السياسة عليها من لحظة تفعيلها.'],
        },
      ],
    },
    en: {
      title: 'Deposit & Refund Policy',
      summary: 'The platform-wide minimum cancellation and deposit refund policy.',
      sections: [
        {
          heading: '1. Deposit',
          paragraphs: [
            'A salon may require a deposit, as a percentage of the service price, to secure a booking. The deposit amount, the free-cancellation window and the refund percentage after it are shown clearly on the salon page before you complete the booking.',
          ],
        },
        {
          heading: '2. Free cancellation',
          paragraphs: ['If you cancel or reschedule at least the salon\'s stated "cancellation window" before the appointment, your deposit is refunded in full.'],
        },
        {
          heading: '3. Cancellation after the window',
          paragraphs: [
            'After the window, part of the deposit is refunded according to the percentage set by the salon (which may be zero); the salon keeps the remainder as compensation for the reserved time.',
            'A salon may offer terms better for the customer than this minimum, but never worse.',
          ],
        },
        {
          heading: '4. Cancellation by the salon',
          paragraphs: ['If the salon cancels, or cannot provide the service for a reason on its side, the deposit is refunded in full in all cases.'],
        },
        {
          heading: '5. Disputes',
          paragraphs: [
            'If you and a salon disagree about a deposit, the request is referred to the platform, which mediates using the available information (booking record and time of cancellation). Its decision within this refund policy is final at platform level, without prejudice to your right to go to court.',
          ],
        },
        {
          heading: '5.1 Salon obligations',
          paragraphs: [
            'A salon must set its cancellation window and post-window refund percentage in its settings, on terms equal to or better for the customer than this minimum, and cooperate with the platform in any dispute.',
            'If a salon cancels a confirmed booking or fails to provide the service, it bears a full deposit refund, and repeated cases may lead to account suspension.',
            'Refunded amounts are deducted from the salon\'s payouts held by the platform once online payments are enabled.',
          ],
        },
        {
          heading: '6. Refund timing',
          paragraphs: ['Refunds are made to the original payment method once approved; arrival time depends on the payment method and bank. Online payments will be enabled later, and this policy applies to them from activation.'],
        },
      ],
    },
  },

  'tenant-agreement': {
    ar: {
      title: 'اتفاقية الصالون مع المنصة',
      summary: 'العلاقة التعاقدية بين Salon AI وصاحب الصالون المشترك في المنصة.',
      sections: [
        {
          heading: '1. طبيعة العلاقة',
          paragraphs: [
            'Salon AI وسيط تقني (Technology Facilitator) يوفّر برمجيات إدارة الصالون وسوقًا للحجز. لا تُعد المنصة طرفًا في عقد الخدمة بين الصالون وعميله، ولا تتحمل مسؤولية تضامنية عن جودة الخدمة أو نتائجها.',
            'الصالون مسؤول وحده عن الترخيص النظامي لنشاطه، وعن سلامة خدماته، وعن دقة بياناته وأسعاره المنشورة.',
          ],
        },
        {
          heading: '2. الاشتراك والتجديد',
          paragraphs: [
            'تبدأ بفترة تجريبية ثم باقة اشتراك تُحدَّد مدتها وسعرها وقت الاشتراك، وتتجدد تلقائيًا ما لم تُلغَ قبل موعد التجديد. قد تُضاف رسوم أو عمولة على الحجوزات المكتملة عبر السوق العام بحسب الباقة، وتُعلن قبل تطبيقها.',
          ],
        },
        {
          heading: '3. بيانات العملاء والسرية',
          paragraphs: [
            'يحصل الصالون على بيانات عملائه لغرض تنفيذ الحجوزات فقط، ويلتزم بسريتها وحمايتها، وبعدم استخدامها في تسويق دون موافقة العميل، وبقانون حماية البيانات الشخصية المعمول به.',
            'يُعد الصالون والمنصة كلٌّ في نطاقه مسؤولًا عن معالجة البيانات، وتُبرم اتفاقية معالجة بيانات مستقلة مع مزودي الدفع والذكاء الاصطناعي عند تفعيلهم.',
          ],
        },
        {
          heading: '4. العربون والمدفوعات',
          paragraphs: [
            'يلتزم الصالون بسياسة العربون والاسترداد الموحّدة كحد أدنى. عند تفعيل الدفع الإلكتروني تُحدَّد في ملحق منفصل صفة «التاجر المسجل» ومواعيد تحويل المستحقات وخصم العمولة ومسؤولية النزاعات المالية.',
          ],
        },
        {
          heading: '5. الالتزامات العامة',
          paragraphs: [
            'عدم نشر محتوى مخالف أو مضلل، وعدم إساءة استخدام المنصة، والحفاظ على سرية بيانات الدخول، وإخطار المنصة فورًا بأي اختراق للحساب.',
          ],
        },
        {
          heading: '6. حدود مسؤولية المنصة',
          paragraphs: ['في أقصى حد يسمح به القانون، تقتصر مسؤولية المنصة على قيمة اشتراك آخر ثلاثة أشهر، ولا تشمل الأضرار غير المباشرة أو فوات الربح.'],
        },
        {
          heading: '7. الإنهاء',
          paragraphs: [
            'يحق لأي طرف إنهاء الاشتراك بإخطار كتابي. وللمنصة إيقاف الحساب فورًا عند مخالفة جوهرية. عند الإنهاء يتاح للصالون تصدير بياناته خلال مدة معقولة قبل حذفها.',
          ],
        },
        {
          heading: '8. تسوية النزاعات والقانون الواجب',
          paragraphs: ['يخضع هذا الاتفاق لقوانين مملكة البحرين، وتختص محاكمها بأي نزاع ينشأ عنه، بعد محاولة تسوية ودية لمدة ثلاثين يومًا.'],
        },
        {
          heading: '9. توثيق الموافقة',
          paragraphs: ['تُسجَّل موافقتك على هذه النسخة (رقمها وتاريخها وعنوان IP) في سجلات المنصة لإثباتها عند أي نزاع، ويُطلب منك الموافقة من جديد عند أي تعديل جوهري.'],
        },
      ],
    },
    en: {
      title: 'Salon Agreement with the Platform',
      summary: 'The contractual relationship between Salon AI and a salon owner subscribing to the platform.',
      sections: [
        {
          heading: '1. Nature of the relationship',
          paragraphs: [
            'Salon AI is a technology facilitator that provides salon-management software and a booking marketplace. The platform is not a party to the service contract between the salon and its customer and bears no joint liability for the quality or results of the service.',
            'The salon alone is responsible for the legal licensing of its business, the safety of its services, and the accuracy of its published data and prices.',
          ],
        },
        {
          heading: '2. Subscription and renewal',
          paragraphs: [
            'You begin with a trial period, then a subscription plan whose term and price are set at subscription, renewing automatically unless cancelled before the renewal date. Fees or a commission on bookings completed through the public marketplace may apply depending on the plan, and are announced before they take effect.',
          ],
        },
        {
          heading: '3. Customer data and confidentiality',
          paragraphs: [
            'The salon receives its customers\' data only to fulfil bookings, and must keep it confidential and protected, must not use it for marketing without the customer\'s consent, and must comply with the applicable personal data protection law.',
            'The salon and the platform are each responsible for data processing within their own scope, and a separate data processing agreement is concluded with payment and AI providers when they are enabled.',
          ],
        },
        {
          heading: '4. Deposits and payments',
          paragraphs: [
            'The salon complies with the platform-wide Deposit & Refund Policy as a minimum. When online payments are enabled, a separate annex will define the "merchant of record", payout schedule, commission deduction and responsibility for financial disputes.',
          ],
        },
        {
          heading: '5. General obligations',
          paragraphs: ['Not to publish unlawful or misleading content, not to abuse the platform, to keep login credentials confidential, and to notify the platform immediately of any account compromise.'],
        },
        {
          heading: '6. Limitation of platform liability',
          paragraphs: ['To the maximum extent permitted by law, the platform\'s liability is limited to the subscription fees of the last three months and excludes indirect damage or loss of profit.'],
        },
        {
          heading: '7. Termination',
          paragraphs: [
            'Either party may end the subscription by written notice. The platform may suspend the account immediately for a material breach. On termination the salon may export its data within a reasonable period before deletion.',
          ],
        },
        {
          heading: '8. Dispute resolution and governing law',
          paragraphs: ['This agreement is governed by the laws of the Kingdom of Bahrain, and its courts have jurisdiction over any dispute arising from it, after a thirty-day amicable settlement attempt.'],
        },
        {
          heading: '9. Record of acceptance',
          paragraphs: ['Your acceptance of this version (its number, date and IP address) is recorded in the platform\'s logs to prove it in any dispute, and you will be asked to accept again on any material change.'],
        },
      ],
    },
  },
};
