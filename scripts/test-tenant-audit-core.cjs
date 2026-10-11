const {test}=require('node:test');
const assert=require('node:assert/strict');
const {auditTenantOwnership}=require('./tenant-audit-core.cjs');
const org={id:'org',name:'Empresa',slug:'empresa',status:'active',organization_type:'client',owner_id:null};
const member={organization_id:'org',user_id:'owner',role:'owner',status:'active',permissions:{}};
const user={id:'owner',app_metadata:{}};
test('proposes missing owner_id from a single active owner; never trusts support proxies',()=>{
    assert.equal(auditTenantOwnership([org],[member],[user]).repairs.length,1);
    assert.equal(auditTenantOwnership([org],[{...member,permissions:{is_support_proxy:true}}],[user]).repairs.length,0);
});
test('canonical valid owners may coexist with other owners without being treated as corruption',()=>{
    const result=auditTenantOwnership([{...org,owner_id:'owner'}],[member,{...member,user_id:'other'}],[user,{id:'other'}]);
    assert.equal(result.unresolved.length,0);
    assert.equal(result.repairs.length,0);
});
test('ambiguous, blocked and deleted ownership needs review, never automatic reassignment',()=>{
    for(const members of [[member,{...member,user_id:'other'}],[{...member,status:'blocked'}],[{...member,deleted_at:'2026-01-01'}]]) {
        assert.equal(auditTenantOwnership([org],members,[user,{id:'other'}]).repairs.length,0);
    }
});
test('only trusted app metadata can recover ownership when membership is absent',()=>{
    assert.equal(auditTenantOwnership([org],[],[{...user,user_metadata:{invited_org_id:'org'}}]).repairs.length,0);
    assert.equal(auditTenantOwnership([org],[],[{...user,app_metadata:{invited_org_id:'org'}}]).repairs.length,1);
    assert.equal(auditTenantOwnership([org],[{...member,status:'blocked'}],[{...user,app_metadata:{invited_org_id:'org'}}]).repairs.length,0);
});
test('duplicate candidates are reported without proposing deletion or reassignment',()=>{
    const result=auditTenantOwnership([{...org,owner_id:'owner'},{...org,id:'other-org',slug:'empresa-copy',owner_id:'owner'}],
        [member,{...member,organization_id:'other-org'}],[user]);
    assert.equal(result.duplicateCandidates.length,1);
    assert.equal(result.repairs.length,0);
});
