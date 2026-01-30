
const url = "https://amwlwmkejdjskukdfwut.supabase.co/storage/v1/object/public/branding/c3b2058f-487c-442f-a9a0-c1c7d3fb0883/1767727799596_31q50zayx.svg";

async function check() {
    try {
        const res = await fetch(url, { method: 'HEAD' });
        console.log('Status:', res.status);
        console.log('Content-Type:', res.headers.get('content-type'));
        console.log('Content-Length:', res.headers.get('content-length'));

        if (res.status !== 200) {
            console.log('Failed status!');
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

check();
