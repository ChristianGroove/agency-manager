const fs = require('fs');

let content = fs.readFileSync('src/modules/features/messaging/conversation-actions.ts', 'utf8');
let serviceContent = fs.readFileSync('src/modules/features/messaging/services/conversation.service.ts', 'utf8');

const funcsToMigrate = [
    'archiveConversation',
    'deleteConversation',
    'markAsRead',
    'unarchiveConversation',
    'snoozeConversation',
    'getLeadConversationPreview',
    'completeConversation'
];

let newMethods = '';

for (const func of funcsToMigrate) {
    const regex = new RegExp('export async function ' + func + '\\((.*?)\\) \\{[\\s\\S]*?^\\}', 'm');
    const match = content.match(regex);
    if (match) {
        let body = match[0];
        
        // Remove export and change to async method
        body = body.replace('export async function ' + func, 'async ' + func);
        
        // Replace createClient and getCurrentOrganizationId
        body = body.replace(/const supabase = await createClient\(\)\s*/, '');
        body = body.replace(/const orgId = await getCurrentOrganizationId\(\)\s*if \(!orgId\) return[^\{]*\n/, 'if (!this.orgId) throw new Error("No organization");\n');
        body = body.replace(/const orgId = await getCurrentOrganizationId\(\)\s*/, 'if (!this.orgId) throw new Error("No organization");\n        const orgId = this.orgId;\n');
        
        // Replace supabase with this.supabase
        body = body.replace(/supabase\./g, 'this.supabase.');
        
        // Remove revalidatePath
        body = body.replace(/revalidatePath\([^\)]+\)\s*/g, '');
        
        newMethods += '\n    ' + body.split('\n').join('\n    ') + '\n';
        
        // Now update the original actions to just call the service!
        const actionArgs = match[1];
        let argNames = actionArgs.split(',').map(s => s.split(':')[0].split('=')[0].trim()).join(', ');
        const replacementAction = `export async function ${func}(${actionArgs}) {
    const supabase = await createClient()
    const orgId = await getCurrentOrganizationId()
    if (!orgId) return { success: false, error: "No organization" }

    const service = container.get<ConversationService>('ConversationService')
    const result = await service.${func}(${argNames})
    revalidatePath('/messaging')
    return result
}`;
        content = content.replace(match[0], replacementAction);
    }
}

serviceContent = serviceContent.replace('// This is just a PoC for Phase 3! Real extraction will follow progressively.', newMethods + '\n    // This is just a PoC for Phase 3! Real extraction will follow progressively.');
fs.writeFileSync('src/modules/features/messaging/services/conversation.service.ts', serviceContent);
fs.writeFileSync('src/modules/features/messaging/conversation-actions.ts', content);

console.log('Migrated messaging actions!');
