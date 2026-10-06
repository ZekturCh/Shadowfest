import { event } from './config.js';
import { request, extractCode } from './platform.js';
import { setupAccess } from './access.js';
setupAccess(['supreme','validator'],async()=>{});
let currentCode = '', stream = null, scanning = false, scanGeneration = 0, lookupGeneration = 0;
const video = document.querySelector('#scanner-video'); const scanStatus = document.querySelector('#scan-status'); const feedback = document.querySelector('#validation-status'); const confirmButton = document.querySelector('#confirm-entry');
async function lookup(value) {
  const generation = ++lookupGeneration;
  currentCode = ''; confirmButton.disabled = true; document.querySelector('#scan-result').classList.remove('hidden'); document.querySelector('#scan-name').textContent = ''; document.querySelector('#scan-package').textContent = '';
  try {
    const code = extractCode(value); const ticket = await request('lookup', { code });
    if (generation !== lookupGeneration) return;
    if (ticket.status === 'pending') throw new Error('Pendiente de aprobación del admin. No autorizar ingreso.');
    document.querySelector('#scan-name').textContent = ticket.name; document.querySelector('#scan-package').textContent = event.packages.find(p => p.id === ticket.packageId)?.name || '';
    if (ticket.status === 'used') throw new Error('QR ya utilizado. No autorizar ingreso.');
    if (ticket.status !== 'valid') throw new Error('Entrada anulada. No autorizar ingreso.');
    currentCode = code; confirmButton.disabled = false; feedback.textContent = 'Entrada válida. Confirma para registrar el ingreso.'; feedback.className = 'status valid';
  } catch (error) { if (generation !== lookupGeneration) return; feedback.textContent = error.message; feedback.className = 'status error'; }
}
document.querySelector('#lookup-form').addEventListener('submit', e => { e.preventDefault(); stopCamera(); lookup(document.querySelector('#code-input').value); });
document.querySelector('#code-input').addEventListener('input', () => { lookupGeneration++; currentCode = ''; confirmButton.disabled = true; document.querySelector('#scan-result').classList.add('hidden'); });
confirmButton.addEventListener('click', async () => {
  if (!currentCode) return; const code = currentCode; currentCode = ''; confirmButton.disabled = true;
  try { await request('validate',{code}); feedback.textContent = 'INGRESO REGISTRADO. Entrada consumida; no permite un segundo acceso.'; feedback.className = 'status valid'; }
  catch (error) { feedback.textContent = error.message; feedback.className = 'status error'; }
});
function stopCamera() { scanning = false; scanGeneration++; stream?.getTracks().forEach(track => track.stop()); stream = null; video.srcObject = null; video.classList.add('hidden'); document.querySelector('#stop-camera').classList.add('hidden'); document.querySelector('#start-camera').disabled = false; }
document.querySelector('#stop-camera').addEventListener('click', stopCamera);
document.querySelector('#start-camera').addEventListener('click', async () => {
  stopCamera(); currentCode = ''; confirmButton.disabled = true; document.querySelector('#scan-result').classList.add('hidden');
  const generation = scanGeneration; document.querySelector('#start-camera').disabled = true;
  try {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador no admite escaneo QR por cámara. Pega el enlace o código para validar.');
    const formats = await window.BarcodeDetector.getSupportedFormats(); if (!formats.includes('qr_code')) throw new Error('No hay lector QR disponible. Usa el código manual.');
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    if (generation !== scanGeneration) { camera.getTracks().forEach(track => track.stop()); return; }
    stream = camera; video.srcObject = stream; video.classList.remove('hidden'); await video.play(); scanning = true; document.querySelector('#stop-camera').classList.remove('hidden'); scanStatus.textContent = 'Apunta al QR de la entrada.';
    async function scan() {
      if (!scanning || generation !== scanGeneration) return;
      try { const results = await detector.detect(video); if (results.length) { const value = results[0].rawValue; stopCamera(); document.querySelector('#code-input').value = value; lookup(value); scanStatus.textContent = 'QR leído. Revisa el resultado antes de confirmar.'; return; } }
      catch { stopCamera(); scanStatus.textContent = 'No se pudo leer la cámara. Usa el código manual.'; return; }
      if (scanning) setTimeout(scan, 250);
    } scan();
  } catch (error) { stopCamera(); scanStatus.textContent = error.message; }
});
window.addEventListener('pagehide', stopCamera); document.addEventListener('visibilitychange', () => { if (document.hidden) stopCamera(); });
window.addEventListener('storage', () => { if (currentCode) lookup(currentCode); });
