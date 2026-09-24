-- Row-Level Security لعزل المستأجرين (PRD §5) — جاهز وغير مُطبَّق عمدًا.
--
-- لماذا غير مُطبَّق: قاعدة الإنتاج الحالية (Prisma Postgres) يتصل التطبيق بها بدور
-- `prisma_migration` وهو superuser، والـ superuser يتجاوز RLS دائمًا حتى مع FORCE.
-- تطبيق هذه السياسات هناك لن يغيّر شيئًا. لتفعيلها فعليًا يلزم دور تطبيق غير superuser
-- (لا يملك BYPASSRLS) — أي قاعدة تتيح إنشاء الأدوار (مثل Supabase Postgres) — ثم ربط
-- سياق المستأجر في كل استعلام (انظر docs/SECURITY_PLAN.md القسم 3).
--
-- اختُبر النمط محليًا (معاملة مُلغاة): مع دور غير superuser وسياق مضبوط يرى المستأجر
-- صفوفه فقط، وبدون سياق لا يرى شيئًا (fail-closed)، والتعديل عبر مستأجر آخر يمسّ 0 صف.

-- دور التطبيق (مثال؛ كلمة المرور من مدير أسرار):
--   CREATE ROLE salon_app LOGIN PASSWORD '<secret>' NOBYPASSRLS;
--   GRANT USAGE ON SCHEMA public TO salon_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO salon_app;

-- مسار المنصة الداخلي (السوق العام، الأدمن، مهام الخلفية) يضبط app.bypass='on'؛
-- مسار المالك يضبط app.tenant_id فقط. غيابهما معًا = لا صفوف.

DO $$
DECLARE
  t text;
  tenant_scoped text[] := ARRAY[
    'owners', 'staff', 'customers', 'services', 'appointments',
    'customer_packages', 'offers', 'reviews', 'favorites', 'salon_photos'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_scoped LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON %I
        USING (
          current_setting('app.bypass', true) = 'on'
          OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
        WITH CHECK (
          current_setting('app.bypass', true) = 'on'
          OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        )
    $p$, t);
  END LOOP;
END $$;

-- جدول tenants نفسه: المفتاح هو id
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (
    current_setting('app.bypass', true) = 'on'
    OR id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.bypass', true) = 'on'
    OR id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );

-- ملاحظة: services.tenant_id و appointments.tenant_id عمودان يقبلان NULL في المخطط الحالي؛
-- صف بلا tenant_id لن يظهر إلا لمسار bypass. service_options و service_pricing_rules
-- يرثان العزل عبر service_id (أضف سياسة EXISTS على services عند الحاجة).

-- كتابة السياق من التطبيق (داخل معاملة Prisma لكل استعلام):
--   SELECT set_config('app.tenant_id', '<uuid>', true);   -- مسار المالك
--   SELECT set_config('app.bypass', 'on', true);          -- مسار المنصة
