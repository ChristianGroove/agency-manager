// Dry-run by default. --apply-safe invokes DB checks again under row locks.
const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');
const { auditTenantOwnership } = require('./tenant-audit-core.cjs');
async function main() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY mediante --env-file.');
    const client = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    async function all(table, columns) {
        const rows=[];
        for (let offset=0;;offset+=1000) {
            let query=client.from(table).select(columns).order(table==='organizations'?'id':'organization_id');
            if(table==='organization_members') query=query.order('user_id');
            const {data,error}=await query.range(offset,offset+999);
            if (error) throw new Error(`No se pudo consultar ${table}: ${error.message}`);
            rows.push(...data); if(data.length<1000) return rows;
        }
    }
    const [organizations,members]=await Promise.all([
        all('organizations','id,name,slug,owner_id,status,organization_type,deleted_at'),
        all('organization_members','organization_id,user_id,role,status,permissions,deleted_at')
    ]);
    const users=[];
    for(let page=1;;page++) {
        const {data,error}=await client.auth.admin.listUsers({page,perPage:1000});
        if(error) throw new Error('No se pudieron consultar las cuentas de propietarios.');
        users.push(...data.users); if(data.users.length<1000) break;
    }
    const report={environment:new URL(url).host,generated_at:new Date().toISOString(),organizations:organizations.length,
        ...auditTenantOwnership(organizations,members,users)};
    if(process.argv.includes('--apply-safe')) {
        report.applied=[];
        for(const repair of report.repairs) {
            const {data,error}=await client.rpc('repair_tenant_ownership',{p_organization_id:repair.organization_id,p_expected_owner_id:repair.owner_id});
            if(error) throw new Error(`La reparación de ${repair.slug} fue rechazada: ${error.message}`);
            report.applied.push({organization_id:repair.organization_id,result:data});
        }
    }
    const outputIndex=process.argv.indexOf('--output');
    if(outputIndex>=0) fs.writeFileSync(process.argv[outputIndex+1],JSON.stringify(report,null,2));
    console.log(JSON.stringify({environment:report.environment,organizations:report.organizations,safeRepairs:report.repairs.length,
        unresolved:report.unresolved.length,possibleDuplicateGroups:report.duplicateCandidates.length,applied:report.applied?.length||0},null,2));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
