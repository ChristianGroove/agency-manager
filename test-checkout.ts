import { dispatchRestoOrder } from './src/modules/features/portal/components/b2c-restaurant-template/actions/checkout-actions';

async function run() {
    console.log("Testing checkout...");
    const payload: any = {
        orgId: "2b090ab0-94e8-46cb-b7b5-0eb7f3ed6c16", // I need to get a valid orgId
        items: [] as any[],
        customerName: "Test User",
        customerPhone: "3001234567",
        restoMode: "delivery" as any,
        tipAmount: 0,
        paymentMethod: "cash" as any
    };
    
    // Get a valid orgId from DB first
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient('http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4bXRkZmRxam5kYW1jcndkeWdxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjA1MDExMywiZXhwIjoyMDUxNjI2MTEzfQ.m1V2b64p5Z2B9sRzGZ1Xy_JdG6vD1D1234567890');
    
    const { data: org } = await supabase.from('organizations').select('id').limit(1).single();
    if (!org) throw new Error("No org found");
    
    payload.orgId = org.id;

    // We need an item that exists in resto_menu_items to pass calculateSecureCartTotal
    const { data: item } = await supabase.from('resto_menu_items').select('id, base_price').eq('organization_id', org.id).limit(1).single();
    
    if (item) {
        payload.items = [{
            id: 'cart-item-1',
            menuItemId: item.id,
            title: 'Test Burger',
            price: item.base_price,
            quantity: 1,
            modifiers: []
        }];
    }

    const res = await dispatchRestoOrder(payload);
    console.log("RESULT:", res);
}

run().catch(console.error);
