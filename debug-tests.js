const fs = require('fs');
let file = fs.readFileSync('src/modules/core/settings/actions/team.ts', 'utf8');
file = file.replace(/logTeamActionError\('Invite Error:', error\)/g, 'logTeamActionError(\'Invite Error:\', error); console.log(\'THE STACK:\', error.stack)');
fs.writeFileSync('src/modules/core/settings/actions/team.ts', file);

const { execSync } = require('child_process');
try {
    execSync('npx vitest run src/modules/core/settings/actions/team.test.ts', { stdio: 'pipe' });
} catch (e) {
    console.log(e.stdout.toString());
}
file = file.replace(/logTeamActionError\('Invite Error:', error\); console.log\('THE STACK:', error.stack\)/g, 'logTeamActionError(\'Invite Error:\', error)');
fs.writeFileSync('src/modules/core/settings/actions/team.ts', file);
