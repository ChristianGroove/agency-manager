export function parseMetaOAuthState(state: string): Record<string, any> {
    try {
        return JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    } catch (e) {
        return {};
    }
}

export function createMetaOAuthState(data: Record<string, any>): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
}
