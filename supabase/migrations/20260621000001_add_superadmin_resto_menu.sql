-- Allow super_admins to manage resto_menu_categories
CREATE POLICY "Super Admins manage resto_menu_categories" ON "public"."resto_menu_categories"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "public"."profiles"
      WHERE "profiles"."id" = "auth"."uid"() AND "profiles"."platform_role" = 'super_admin'
    )
  );

-- Allow super_admins to manage resto_menu_items
CREATE POLICY "Super Admins manage resto_menu_items" ON "public"."resto_menu_items"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "public"."profiles"
      WHERE "profiles"."id" = "auth"."uid"() AND "profiles"."platform_role" = 'super_admin'
    )
  );
