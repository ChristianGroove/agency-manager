
const dotenv = require('dotenv');
dotenv.config({ path: '.env.production' });

async function checkVersion() {
    const token = process.env.META_PERMANENT_ACCESS_TOKEN;
    const versions = ['v20.0', 'v21.0', 'v22.0', 'v24.0'];

    console.log("--- Testing Meta API Versions ---");
    for (const v of versions) {
        try {
            const res = await fetch(`https://graph.facebook.com/${v}/me?access_token=${token}`);
            const data = await res.json();
            console.log(`${v}: ${res.status} ${res.statusText} ${data.name ? 'SUCCESS' : 'FAILED: ' + (data.error?.message || 'Unknown error')}`);
        } catch (e) {
            console.log(`${v}: Error - ${e.message}`);
        }
    }
}

checkVersion();
