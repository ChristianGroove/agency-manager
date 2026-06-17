import { Project, SyntaxKind, CallExpression, Identifier } from 'ts-morph';
import path from 'path';

const project = new Project({
    tsConfigFilePath: path.join(__dirname, '../tsconfig.json'),
});

// Get all files in src/modules
const sourceFiles = project.getSourceFiles("src/**/*.ts").concat(project.getSourceFiles("src/**/*.tsx"));

const excludePaths = [
    'src/app/api/webhooks',
    'src/app/api/cron',
    'src/modules/core/database/supabase-admin.ts',
    'src/modules/infrastructure/logging/services/event-logger.ts', // Need to keep admin here
    'src/modules/core/iam/services/platform-roles.ts' // Usually needs admin
];

let modifiedFilesCount = 0;

for (const sourceFile of sourceFiles) {
    const filePath = sourceFile.getFilePath();
    
    // Skip exclusions
    if (excludePaths.some(p => filePath.replace(/\\/g, '/').includes(p))) continue;
    
    // Skip test files
    if (filePath.includes('.test.ts') || filePath.includes('.test.tsx')) continue;

    // Check if file imports supabaseAdmin
    const imports = sourceFile.getImportDeclarations();
    const adminImport = imports.find(i => 
        i.getNamedImports().some(ni => ni.getName() === 'supabaseAdmin')
    );

    if (!adminImport) continue;

    let modified = false;

    // Find all usages of supabaseAdmin
    const adminUsages = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
        .filter(id => id.getText() === 'supabaseAdmin');

    if (adminUsages.length > 0) {
        // Need to ensure createClient is imported
        const serverImport = imports.find(i => 
            i.getModuleSpecifierValue().includes('supabase-server')
        );

        if (!serverImport) {
            sourceFile.addImportDeclaration({
                namedImports: ['createClient'],
                moduleSpecifier: '@/modules/core/database/supabase-server'
            });
        } else {
            const hasCreateClient = serverImport.getNamedImports().some(ni => ni.getName() === 'createClient');
            if (!hasCreateClient) {
                serverImport.addNamedImport('createClient');
            }
        }
        
        for (const usage of adminUsages) {
            // Only replace if it's not in an import declaration
            if (usage.getFirstAncestorByKind(SyntaxKind.ImportDeclaration)) continue;
            
            // Check if it's inside an async function
            const asyncFunc = usage.getFirstAncestor(node => 
                (node.getKind() === SyntaxKind.FunctionDeclaration || 
                 node.getKind() === SyntaxKind.ArrowFunction ||
                 node.getKind() === SyntaxKind.MethodDeclaration) &&
                node.getModifiers().some(m => m.getKind() === SyntaxKind.AsyncKeyword)
            );

            if (asyncFunc) {
                usage.replaceWithText('(await createClient())');
                modified = true;
            } else {
                console.warn(`WARNING: supabaseAdmin used in non-async scope in ${filePath}`);
            }
        }

        // Remove supabaseAdmin from import if no longer used
        if (modified) {
            const remaining = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
                .filter(id => id.getText() === 'supabaseAdmin');
            
            if (remaining.length === 1) { // Only the import is left
                const namedImport = adminImport.getNamedImports().find(ni => ni.getName() === 'supabaseAdmin');
                if (namedImport) {
                    namedImport.remove();
                    if (adminImport.getNamedImports().length === 0) {
                        adminImport.remove();
                    }
                }
            }
        }
    }

    if (modified) {
        sourceFile.saveSync();
        modifiedFilesCount++;
        console.log(`Updated ${filePath}`);
    }
}

console.log(`\nRefactored ${modifiedFilesCount} files.`);
