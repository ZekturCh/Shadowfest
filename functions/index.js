import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createService } from './service.js';
initializeApp();const supremeCode=defineSecret('SHADOWFEST_SUPREME_CODE');
export const shadowfestApi=onRequest({region:'us-central1',secrets:[supremeCode],maxInstances:10,timeoutSeconds:30},async(req,res)=>{
  res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({error:'Usa POST.'});
  if(!req.is('application/json')||Number(req.headers['content-length']||0)>16384)return res.status(400).json({error:'Solicitud inválida.'});
  try {const data=req.body||{};const token=(req.get('Authorization')||'').replace(/^Bearer /,'');const result=await createService(getFirestore(),supremeCode.value())(data.action,data,token,req.ip);res.json(result);}
  catch(error){if(!error.status)console.error('ShadowFest operation failed',error.code||error.name);res.status(error.status||500).json({error:error.status?error.message:'No se pudo completar la operación. Intenta nuevamente.'});}
});
