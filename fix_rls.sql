-- Fix data_snapshots
DROP POLICY IF EXISTS "Owners can view own snapshots" ON "public"."data_snapshots";
CREATE POLICY "Owners can view own snapshots" ON "public"."data_snapshots" FOR SELECT USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

DROP POLICY IF EXISTS "Owners can create snapshots" ON "public"."data_snapshots";
CREATE POLICY "Owners can create snapshots" ON "public"."data_snapshots" FOR INSERT WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND role = 'owner'
    )
);

-- Fix work_orders
DROP POLICY IF EXISTS "Org Access" ON "public"."work_orders";
CREATE POLICY "Org Access" ON "public"."work_orders" USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
);

-- Fix manifest_imeis
DROP POLICY IF EXISTS "Access own organization imeis" ON "public"."manifest_imeis";
CREATE POLICY "Access own organization imeis" ON "public"."manifest_imeis" USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
);

-- Fix manifest_documents
DROP POLICY IF EXISTS "Access own organization manifests" ON "public"."manifest_documents";
CREATE POLICY "Access own organization manifests" ON "public"."manifest_documents" USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
) WITH CHECK (
    organization_id IN (
        SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
);
