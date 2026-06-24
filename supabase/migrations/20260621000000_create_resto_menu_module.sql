-- Módulo Resto Menu
-- Tablas nativas para menús de restaurantes, bares y gastrobares.

CREATE TABLE IF NOT EXISTS "public"."resto_menu_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "icon" "text",
    "order_index" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "resto_menu_categories_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."resto_menu_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "organization_id" "uuid" NOT NULL,
    "category_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "base_price" numeric DEFAULT 0 NOT NULL,
    "is_available" boolean DEFAULT true NOT NULL,
    "is_visible" boolean DEFAULT true NOT NULL,
    "type" "text" DEFAULT 'food'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "resto_menu_items_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    CONSTRAINT "resto_menu_items_cat_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."resto_menu_categories"("id") ON DELETE RESTRICT,
    CONSTRAINT "resto_menu_items_type_check" CHECK (("type" = ANY (ARRAY['food'::"text", 'beverage'::"text", 'combo'::"text", 'other'::"text"])))
);

-- Indices
CREATE INDEX "idx_resto_menu_categories_org" ON "public"."resto_menu_categories" ("organization_id");
CREATE INDEX "idx_resto_menu_items_org" ON "public"."resto_menu_items" ("organization_id");
CREATE INDEX "idx_resto_menu_items_category" ON "public"."resto_menu_items" ("category_id");

-- RLS Configuration
ALTER TABLE "public"."resto_menu_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."resto_menu_items" ENABLE ROW LEVEL SECURITY;

-- Policies for resto_menu_categories
CREATE POLICY "Admins manage resto_menu_categories" ON "public"."resto_menu_categories"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "public"."organization_members"
      WHERE "organization_members"."organization_id" = "resto_menu_categories"."organization_id"
      AND "organization_members"."user_id" = "auth"."uid"()
      AND "organization_members"."role" IN ('admin', 'owner')
    )
  );

CREATE POLICY "Members view resto_menu_categories" ON "public"."resto_menu_categories"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."organization_members"
      WHERE "organization_members"."organization_id" = "resto_menu_categories"."organization_id"
      AND "organization_members"."user_id" = "auth"."uid"()
    )
  );

-- Policies for resto_menu_items
CREATE POLICY "Admins manage resto_menu_items" ON "public"."resto_menu_items"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "public"."organization_members"
      WHERE "organization_members"."organization_id" = "resto_menu_items"."organization_id"
      AND "organization_members"."user_id" = "auth"."uid"()
      AND "organization_members"."role" IN ('admin', 'owner')
    )
  );

CREATE POLICY "Members view resto_menu_items" ON "public"."resto_menu_items"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."organization_members"
      WHERE "organization_members"."organization_id" = "resto_menu_items"."organization_id"
      AND "organization_members"."user_id" = "auth"."uid"()
    )
  );

-- Permitir lectura anónima (para portales QR públicos) basada en organization_id si es necesario.
CREATE POLICY "Public read access for visible resto_menu_items" ON "public"."resto_menu_items"
  FOR SELECT
  USING (
    "is_visible" = true
    AND "deleted_at" IS NULL
  );

CREATE POLICY "Public read access for active resto_menu_categories" ON "public"."resto_menu_categories"
  FOR SELECT
  USING (
    "is_active" = true
  );
