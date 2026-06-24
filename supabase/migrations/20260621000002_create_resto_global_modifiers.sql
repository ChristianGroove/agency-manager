-- Global Modifiers para Resto Menu

CREATE TABLE IF NOT EXISTS "public"."resto_modifier_groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "required" boolean DEFAULT false NOT NULL,
    "min_selections" integer DEFAULT 0 NOT NULL,
    "max_selections" integer DEFAULT 1 NOT NULL,
    "options" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "resto_mod_groups_org_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "public"."resto_item_modifier_groups" (
    "item_id" "uuid" NOT NULL,
    "modifier_group_id" "uuid" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    PRIMARY KEY ("item_id", "modifier_group_id"),
    CONSTRAINT "resto_item_mod_groups_item_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."resto_menu_items"("id") ON DELETE CASCADE,
    CONSTRAINT "resto_item_mod_groups_mod_fkey" FOREIGN KEY ("modifier_group_id") REFERENCES "public"."resto_modifier_groups"("id") ON DELETE CASCADE
);

-- Indices
CREATE INDEX "idx_resto_modifier_groups_org" ON "public"."resto_modifier_groups" ("organization_id");
CREATE INDEX "idx_resto_item_mod_groups_item" ON "public"."resto_item_modifier_groups" ("item_id");
CREATE INDEX "idx_resto_item_mod_groups_mod" ON "public"."resto_item_modifier_groups" ("modifier_group_id");

-- RLS Configuration
ALTER TABLE "public"."resto_modifier_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."resto_item_modifier_groups" ENABLE ROW LEVEL SECURITY;

-- Policies for resto_modifier_groups
CREATE POLICY "Admins manage resto_modifier_groups" ON "public"."resto_modifier_groups"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "public"."organization_members"
      WHERE "organization_members"."organization_id" = "resto_modifier_groups"."organization_id"
      AND "organization_members"."user_id" = "auth"."uid"()
      AND "organization_members"."role" IN ('admin', 'owner')
    )
  );

CREATE POLICY "Members view resto_modifier_groups" ON "public"."resto_modifier_groups"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."organization_members"
      WHERE "organization_members"."organization_id" = "resto_modifier_groups"."organization_id"
      AND "organization_members"."user_id" = "auth"."uid"()
    )
  );

CREATE POLICY "Public read access for resto_modifier_groups" ON "public"."resto_modifier_groups"
  FOR SELECT
  USING (true);

-- Policies for resto_item_modifier_groups
CREATE POLICY "Admins manage resto_item_modifier_groups" ON "public"."resto_item_modifier_groups"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "public"."organization_members" om
      JOIN "public"."resto_menu_items" rmi ON rmi.organization_id = om.organization_id
      WHERE rmi.id = "resto_item_modifier_groups"."item_id"
      AND om.user_id = "auth"."uid"()
      AND om.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Members view resto_item_modifier_groups" ON "public"."resto_item_modifier_groups"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "public"."organization_members" om
      JOIN "public"."resto_menu_items" rmi ON rmi.organization_id = om.organization_id
      WHERE rmi.id = "resto_item_modifier_groups"."item_id"
      AND om.user_id = "auth"."uid"()
    )
  );

CREATE POLICY "Public read access for resto_item_modifier_groups" ON "public"."resto_item_modifier_groups"
  FOR SELECT
  USING (true);
