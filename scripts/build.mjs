import { mkdir, cp, readdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root);await mkdir(dist,{recursive:true});
await build({entryPoints:[new URL('src/firebase-platform.js',root).pathname.replace(/^\/(.:)/,'$1')],outfile:new URL('platform-firebase.js',root).pathname.replace(/^\/(.:)/,'$1'),bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof'});
for(const name of ['qr-scanner.min.js','qr-scanner-worker.min.js'])await cp(new URL('node_modules/qr-scanner/'+name,root),new URL('vendor/'+name,root));
await cp(new URL('node_modules/qr-scanner/LICENSE',root),new URL('vendor/qr-scanner.LICENSE',root));
const excluded=new Set(['platform-demo.js','demo-store.js']);
for(const name of await readdir(root)){if(/\.(html|css|js)$/.test(name)&&!excluded.has(name))await cp(new URL(name,root),new URL(name,dist));}
for(const dir of ['assets','vendor'])await cp(new URL(dir+'/',root),new URL(dir+'/',dist),{recursive:true});
// Deployed build always uses Firebase; local test records are never published.
await writeFile(new URL('runtime.js',dist),"export const localDemo=false;\n");
console.log('Build listo en dist. La vista previa local no se publica.');
