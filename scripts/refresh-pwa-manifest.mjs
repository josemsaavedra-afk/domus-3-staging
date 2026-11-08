// Run: node scripts/refresh-pwa-manifest.mjs
// Regenerates SHA-256 values for assets already listed in DOMUS3_ASSETS,
// adding the Plans importer as a mandatory offline asset.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
const root=path.resolve('domus-3');
const manifestFile=path.join(root,'asset-manifest.js');
const source=fs.readFileSync(manifestFile,'utf8');
const context={self:{}};vm.runInNewContext(source,context);
const build=context.self.DOMUS3_BUILD;
const assets=[...context.self.DOMUS3_ASSETS];
if(!assets.includes('src/treasury/plan-import.js'))assets.push('src/treasury/plan-import.js');
const hashes={};
for(const file of assets){
 const full=path.resolve(root,file);
 if(!full.startsWith(root+path.sep))throw Error('Unsafe asset path: '+file);
 hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
}
const output='self.DOMUS3_BUILD='+JSON.stringify(build)+';\n'+
 'self.DOMUS3_ASSETS='+JSON.stringify(assets)+';\n'+
 'self.DOMUS3_ASSET_HASHES='+JSON.stringify(hashes)+';\n';
fs.writeFileSync(manifestFile,output);
console.log('Updated '+assets.length+' asset hashes for build '+build);
