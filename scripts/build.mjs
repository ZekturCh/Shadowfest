import { mkdir, cp, readdir, writeFile } from 'node:fs/promises';
const root=new URL('../',import.meta.url),dist=new URL('dist/',root);await mkdir(dist,{recursive:true});
const excluded=new Set(['platform-demo.js','demo-store.js']);
for(const name of await readdir(root)){if(/\.(html|css|js)$/.test(name)&&!excluded.has(name))await cp(new URL(name,root),new URL(name,dist));}
for(const dir of ['assets','vendor'])await cp(new URL(dir+'/',root),new URL(dir+'/',dist),{recursive:true});
// Deployed build always uses the real backend, including Firebase emulator Hosting.
await writeFile(new URL('runtime.js',dist),"export const localDemo=false; export const apiEndpoint='/api';\n");
console.log('Build listo en dist. La vista previa local no se publica.');
