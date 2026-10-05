import { request, login, logout, showMode } from './platform.js';
export function setupAccess(roles,onReady){
  showMode();const gate=document.querySelector('#access-gate'),content=document.querySelector('#staff-content'),feedback=document.querySelector('#access-status');
  async function enter(actor){if(!roles.includes(actor.role))throw new Error('Tu código no tiene acceso a este panel.');document.querySelector('#actor-name').textContent=actor.name;await onReady(actor);gate.classList.add('hidden');content.classList.remove('hidden');}
  document.querySelector('#access-form').addEventListener('submit',async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{await enter(await login(new FormData(e.target).get('code').trim()));e.target.reset();}catch(error){feedback.textContent=error.message;}finally{button.disabled=false;}});
  document.querySelector('#logout').addEventListener('click',logout);
  request('me').then(enter).catch(()=>{});
}
