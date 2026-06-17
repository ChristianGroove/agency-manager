const fs = require('fs');

const filesToPatch = [
  'src/app/api/seed-integrations/route.ts',
  'src/app/api/debug-connection/route.ts',
  'src/app/api/debug/trigger-test/route.ts',
  'src/app/api/diagnostics/org-check/route.ts',
  'src/app/api/test-isolation/route.ts',
  'src/app/api/diagnostics/connections/route.ts',
  'src/app/api/diagnostics/logs/route.ts',
  'src/app/api/diagnostics/test-action/route.ts',
  'src/app/api/seed/route.ts'
];

for (const file of filesToPatch) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('requireProductionInternalAccess')) {
    content = 'import { requireProductionInternalAccess } from "@/app/api/_guards/request-guards"\n' + content;
  }
  
  // Replace methods with args like GET(req: Request)
  content = content.replace(/export async function (GET|POST|DELETE)\(([^)]+)\)\s*\{/g, (match, method, args) => {
    // If it already has the guard, skip
    if (content.substring(content.indexOf(match)).includes('requireProductionInternalAccess(req')) return match;
    const reqArg = args.split(':')[0].trim();
    return `${match}\n    const guard = requireProductionInternalAccess(${reqArg})\n    if (guard) return guard;\n`;
  });
  
  // Replace methods without args like GET()
  content = content.replace(/export async function (GET|POST|DELETE)\(\)\s*\{/g, (match, method) => {
    return `export async function ${method}(req: Request) {\n    const guard = requireProductionInternalAccess(req)\n    if (guard) return guard;\n`;
  });
  
  fs.writeFileSync(file, content);
}

const adminFiles = [
  'src/app/api/integrations/meta/sync/route.ts',
  'src/app/api/meta/flows/route.ts',
  'src/app/api/meta/webhook/subscribe/route.ts'
];

for (const file of adminFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('requirePlatformAdminOrInternalSecret')) {
    content = 'import { requirePlatformAdminOrInternalSecret } from "@/app/api/_guards/request-guards"\n' + content;
  }
  
  content = content.replace(/export async function (GET|POST|DELETE)\(([^)]+)\)\s*\{/g, (match, method, args) => {
    const reqArg = args.split(':')[0].trim();
    return `${match}\n    const guard = await requirePlatformAdminOrInternalSecret(${reqArg})\n    if (guard) return guard;\n`;
  });
  
  content = content.replace(/export async function (GET|POST|DELETE)\(\)\s*\{/g, (match, method) => {
    return `export async function ${method}(req: Request) {\n    const guard = await requirePlatformAdminOrInternalSecret(req)\n    if (guard) return guard;\n`;
  });
  
  fs.writeFileSync(file, content);
}
console.log('Done!');
