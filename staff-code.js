const letters='ABCDEFGHJKLMNPQRSTUVWXYZ';
const sellerPattern=/^[A-Z]26[A-Z]{3}$/;
function initial(name){return String(name||'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().match(/^[A-Z]/)?.[0]||'';}
export function normalizeAccessCode(value){const code=String(value||'').trim();return sellerPattern.test(code.toUpperCase())?code.toUpperCase():code;}
export function newSellerAccessCode(name){const first=initial(name);if(!first)throw new Error('Escribe primero el nombre del vendedor.');let suffix='';while(suffix.length<3){for(const n of crypto.getRandomValues(new Uint8Array(6))){if(n<240)suffix+=letters[n%letters.length];if(suffix.length===3)break;}}return first+'26'+suffix;}
export function validStaffCode(name,value,role){const code=normalizeAccessCode(value);if(!['seller','validator'].includes(role))return false;if(/^\S{8,64}$/.test(code))return true;return role==='seller'&&sellerPattern.test(code)&&code[0]===initial(name);}
