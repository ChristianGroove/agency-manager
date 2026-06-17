export function parseMetaOAuthState(state: string): { ok: true; state: Record<string, any> } | { ok: false; error: string } {
    try {
        const parsed = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        if (!parsed || typeof parsed !== 'object') {
            return { ok: false, error: 'Invalid state format' };
        }
        return { ok: true, state: parsed };
    } catch (e: any) {
        return { ok: false, error: e.message };
    }
}

export function createMetaOAuthState(data: Record<string, any>): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
}
