
import { filterRoutesByModules } from '../src/lib/module-config'

const modules = ['core_clients', 'core_settings'] // Minimal set

// Test Case 1: Client Member
const routesClientMember = filterRoutesByModules(
    modules,
    'member',
    'client',
    undefined,
    {}
)

const hasOrgAccessClientMember = routesClientMember.some(r => r.key === 'reseller_tenants')
console.log('Client Member has Organizations Access:', hasOrgAccessClientMember)


// Test Case 2: Client Admin
const routesClientAdmin = filterRoutesByModules(
    modules,
    'admin',
    'client',
    undefined,
    {}
)
const hasOrgAccessClientAdmin = routesClientAdmin.some(r => r.key === 'reseller_tenants')
console.log('Client Admin has Organizations Access:', hasOrgAccessClientAdmin)

// Test Case 3: Reseller Member
const routesResellerMember = filterRoutesByModules(
    modules,
    'member',
    'reseller', // NOT client
    undefined,
    {}
)
const hasOrgAccessResellerMember = routesResellerMember.some(r => r.key === 'reseller_tenants')
console.log('Reseller Member has Organizations Access:', hasOrgAccessResellerMember)

// Test Case 4: Reseller Admin
const routesResellerAdmin = filterRoutesByModules(
    modules,
    'admin',
    'reseller',
    undefined,
    {}
)
const hasOrgAccessResellerAdmin = routesResellerAdmin.some(r => r.key === 'reseller_tenants')
console.log('Reseller Admin has Organizations Access:', hasOrgAccessResellerAdmin)

