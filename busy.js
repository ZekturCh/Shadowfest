const pending=new Map();
export async function withBusy(button,label,work,key=button){
  if(pending.has(key))return;
  const promise=(async()=>{const original=button.textContent,disabled=button.disabled;button.disabled=true;button.setAttribute('aria-busy','true');button.textContent=label;try{return await work();}finally{button.textContent=original;button.disabled=disabled;button.removeAttribute('aria-busy');pending.delete(key);}})();pending.set(key,promise);return promise;
}
export const isBusy=()=>pending.size>0;
