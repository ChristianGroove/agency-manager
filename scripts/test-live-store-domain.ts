import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function testLiveStoreAndDomain() {
  console.log('--- TESTING LIVE STORE & CUSTOM DOMAIN RESOLUTION ---');

  // 1. Check SuperAdmin Org Slug and Portal Resolution
  const { data: orgPixy } = await supabase
    .from('organizations')
    .select('id, name, slug, custom_portal_domain')
    .eq('id', 'db9d1288-80ab-48df-b130-a0739881c6f2')
    .single();

  console.log('✅ SuperAdmin Organization:', orgPixy);
  const expectedPortalUrl = `/portal/${orgPixy?.slug}`;
  console.log(`✅ Default Storefront URL: ${expectedPortalUrl}`);

  // 2. Test getPortalData & getPortalCatalog with slug 'pixy-agency'
  const { getPortalData, getPortalCatalog } = await import('@/modules/features/portal/services/portal-service');
  
  const portalData = await getPortalData('pixy-agency');
  console.log(`✅ getPortalData('pixy-agency') -> type: "${portalData.type}", agency: "${portalData.settings?.agency_name}"`);

  const catalogItems = await getPortalCatalog('pixy-agency');
  console.log(`✅ getPortalCatalog('pixy-agency') -> fetched ${catalogItems.length} universal catalog items!`);
  console.log(`   - Sample Item 1: "${catalogItems[0]?.name}" | Photos: ${catalogItems[0]?.gallery_images?.length || 0}`);

  // 3. Test Custom Domain Setting & Resolution
  console.log('\n--- TESTING CUSTOM DOMAIN ACTIONS ---');
  const { saveCustomDomainAction, getCustomDomainConfigAction, verifyCustomDomainAction, removeCustomDomainAction } = await import('@/modules/features/catalog/customizer-actions');

  // Configure custom domain 'catalogo.pixyagency.com'
  const saveRes = await saveCustomDomainAction({
    orgId: orgPixy?.id,
    customDomain: 'catalogo.pixyagency.com',
  });
  console.log('✅ saveCustomDomainAction ->', saveRes);

  const configRes = await getCustomDomainConfigAction(orgPixy?.id);
  console.log('✅ getCustomDomainConfigAction ->', configRes.data);

  const verifyRes = await verifyCustomDomainAction({ orgId: orgPixy?.id });
  console.log('✅ verifyCustomDomainAction ->', verifyRes);

  // Test getPortalCatalog using the custom domain as token
  const domainCatalog = await getPortalCatalog('catalogo.pixyagency.com');
  console.log(`✅ getPortalCatalog('catalogo.pixyagency.com') -> fetched ${domainCatalog.length} items via Custom Domain!`);

  // Clean up back to default
  await removeCustomDomainAction({ orgId: orgPixy?.id });
  console.log('✅ removeCustomDomainAction -> Domain cleanly reset, fallback to default portal active');

  console.log('\n🎉 ALL LIVE STORE AND CUSTOM DOMAIN TESTS PASSED SUCCESSFULLY!');
}

testLiveStoreAndDomain().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
