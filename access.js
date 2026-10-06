import { request, login, logout, showMode } from './platform.js?v=20261006b';
import {withBusy} from './busy.js?v=20261006b';
export function setupAccess(roles,onReady){
  showMode();const gate=document.querySelector('#access-gate'),content=document.querySelector('#staff-content'),feedback=document.querySelector('#access-status');
  async function enter(actor){if(!roles.includes(actor.role))throw new Error('Tu código no tiene acceso a este panel.');document.querySelector('#actor-name').textContent=actor.name;await onReady(actor);gate.classList.add('hidden');content.classList.remove('hidden');}
  document.querySelector('#access-form').addEventListener('submit',e=>{e.preventDefault();const form=e.target;return withBusy(form.querySelector('button'),'Entrando…',async()=>{feedback.textContent='Comprobando tu acceso…';try{await enter(await login(new FormData(form).get('code').trim()));form.reset();feedback.textContent='';}catch(error){feedback.textContent=error.message;}},'login');});
  document.querySelector('#logout').addEventListener('click',e=>withBusy(e.currentTarget,'Saliendo…',logout,'logout'));
  request('me').then(enter).catch(()=>{});
}
