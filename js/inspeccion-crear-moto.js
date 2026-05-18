document.addEventListener('DOMContentLoaded', async () => {
async function initSupabase() {
let attempts = 0;
while (!window.supabase && attempts < 50) {
await new Promise(res => setTimeout(res, 100));
attempts++;
}
if (!window.supabase) {
mostrarAlerta('error', '❌ No se cargó Supabase');
return null;
}
if (window.supabase.auth) return window.supabase;
const createFn = window.supabase.createClient || window.createClient;
if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
try {
window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY);
return window.supabase;
} catch (err) {
console.error('❌ Error init', err);
return null;
}
}
return null;
}
const supabase = await initSupabase();
if (!supabase) return;
let usuarioActual = null;
try {
const { data: { user } } = await supabase.auth.getUser();
if (user) {
usuarioActual = user;
const el = document.getElementById('userEmail');
if(el) el.textContent = user.email || 'Usuario';
}
} catch (err) { console.warn('Sesión no verificada'); }
const searchInput = document.getElementById('searchMoto');
const btnSearch = document.getElementById('btnSearch');
const btnSearchText = btnSearch.querySelector('.btn-search-text');
const btnSearchLoader = btnSearch.querySelector('.btn-search-loader');
const inspectionForm = document.getElementById('motoForm');
const btnSubmit = document.getElementById('btnSubmit');
const btnClear = document.getElementById('btnClear');
const motoIdInput = document.getElementById('motoId');
const alertSuccess = document.getElementById('alertSuccess');
const alertError = document.getElementById('alertError');
const alertInfo = document.getElementById('alertInfo');
function mostrarAlerta(tipo, mensaje) {
[alertSuccess, alertError, alertInfo].forEach(el => { if(el) el.style.display = 'none'; });
const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
if(target) {
target.querySelector('span:last-child').textContent = mensaje;
target.style.display = 'flex';
}
}
function toggleFormState(activo) {
inspectionForm.style.opacity = activo ? '1' : '0.6';
inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
btnSubmit.disabled = !activo || !usuarioActual;
}
function generarNInspeccion() {
const now = new Date();
const y = now.getFullYear();
const m = String(now.getMonth()+1).padStart(2,'0');
const d = String(now.getDate()).padStart(2,'0');
const r = String(Math.floor(Math.random()*1000)).padStart(3,'0');
return `PVR-M-${y}${m}${d}-${r}`;
}
function setDefaults() {
const now = new Date();
const f = document.getElementById('fecha_inspeccion');
if(f) f.value = now.toISOString().split('T')[0];
const h = document.getElementById('hora');
if(h) h.value = now.toTimeString().slice(0,5);
const n = document.getElementById('n_inspeccion');
if(n) n.value = generarNInspeccion();
updatePreview();
}

async function buscarMoto() {
const q = searchInput.value.trim();
if(!q) { mostrarAlerta('info', 'Ingrese Placa o Serial para buscar'); return; }
if(btnSearch) {
btnSearch.disabled=true;
btnSearchText.style.display='none';
btnSearchLoader.style.display='inline';
}
mostrarAlerta('info', '🔍 Buscando Moto o Especial...');
try {
const cleanQ = q.replace(/\s+/g, '').toUpperCase();
const { data, error } = await supabase.from('vehiculos').select('*')
.or(`placa.ilike.${cleanQ},facsimil.ilike.${cleanQ},s_carroceria.ilike.${cleanQ},s_motor.ilike.${cleanQ}`)
.limit(1)
.maybeSingle();

if(error) throw error;
if(!data) {
mostrarAlerta('error', '❌ Unidad no encontrada');
toggleFormState(false);
return;
}

// 🔴 Lógica Modificada: Ahora acepta MOTO y ESPECIAL
const tipo = (data.tipo || '').toUpperCase();
const clase = (data.clase || '').toUpperCase();
const esValido = (tipo === 'MOTO' || tipo === 'ESPECIAL' || clase === 'MOTO' || clase === 'ESPECIAL');

if(!esValido) {
mostrarAlerta('error', `⚠️ El vehículo encontrado (${data.tipo || 'Desconocido'}) no está registrado como Moto o Especial.`);
toggleFormState(false);
return;
}

document.getElementById('placa').value = data.placa || '';
document.getElementById('marca').value = data.marca ? data.marca.toUpperCase() : '';
document.getElementById('modelo').value = data.modelo ? data.modelo.toUpperCase() : '';
document.getElementById('color').value = data.color || '';
document.getElementById('s_carroceria').value = data.s_carroceria || '';
document.getElementById('s_motor').value = data.s_motor || '';
document.getElementById('n_identificacion').value = data.n_identificacion || '';
motoIdInput.value = data.id;
setDefaults();
toggleFormState(true);
mostrarAlerta('success', '✅ Unidad encontrada. Complete la inspección y firmas.');
} catch(err) {
console.error(err);
mostrarAlerta('error', `Error: ${err.message}`);
} finally {
if(btnSearch) {
btnSearch.disabled=false;
btnSearchText.style.display='inline';
btnSearchLoader.style.display='none';
}
}
}

function limpiarFormulario() {
searchInput.value = '';
inspectionForm.reset();
motoIdInput.value = '';
toggleFormState(false);
updatePreview();
mostrarAlerta('info', 'Ingrese Placa o Serial para buscar una Moto o Especial');
}

function updatePreview() {
const v = id => document.getElementById(id).value || '-';
const vs = id => {
const el = document.getElementById(id);
return el.options[el.selectedIndex].text || '-';
};
document.getElementById('pv_n_inspeccion').textContent = v('n_inspeccion');
document.getElementById('pv_fecha').textContent = v('fecha_inspeccion');
document.getElementById('pv_hora').textContent = v('hora');
document.getElementById('pv_motivo').textContent = v('motivo_inspeccion');
document.getElementById('pv_lugar').textContent = `${v('lugar')} - ${v('asignacion')}`;
document.getElementById('pv_placa').textContent = v('placa');
document.getElementById('pv_marca_modelo').textContent = `${v('marca')} ${v('modelo')}`;
document.getElementById('pv_ano_tipo').textContent = `${v('ano')} - ${v('placa') ? 'MOTO/ESPECIAL' : ''}`;
document.getElementById('pv_color').textContent = v('color');
document.getElementById('pv_s_carroceria').textContent = v('s_carroceria');
document.getElementById('pv_s_motor').textContent = v('s_motor');
document.getElementById('pv_n_id').textContent = v('n_identificacion');
document.getElementById('pv_observaciones').textContent = v('observaciones') || 'Sin observaciones.';
document.getElementById('pv_coord_nombre').textContent = v('coord_nombre');
document.getElementById('pv_coord_rango').textContent = vs('coord_rango');
document.getElementById('pv_coord_cedula').textContent = v('coord_cedula');
document.getElementById('pv_insp_nombre').textContent = v('insp_nombre');
document.getElementById('pv_insp_rango').textContent = vs('insp_rango');
document.getElementById('pv_insp_cedula').textContent = v('insp_cedula');

// Componentes dinámicos
const compGrid = document.getElementById('pv_comps_grid');
if(compGrid) {
compGrid.innerHTML = '';
document.querySelectorAll('.inspection-item').forEach(item => {
const label = item.querySelector('.item-label').textContent || '';
const radio = item.querySelector('input:checked');
const val = radio ? radio.value : 'NT';
const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : 'status-NT';
const div = document.createElement('div');
div.className = 'pv-comp';
div.innerHTML = `<div class="pv-comp-label">${label}</div><div class="pv-comp-status ${cls}">${val}</div>`;
compGrid.appendChild(div);
});
}
}

function getComponentesMotoValues() {
const componentes = {};
document.querySelectorAll('.inspection-item input[type=radio]').forEach(r => {
if (!componentes[r.name]) componentes[r.name] = 'NT';
if (r.checked) componentes[r.name] = r.value;
});
return componentes;
}

// 🔵 Event Listeners
btnSearch.addEventListener('click', buscarMoto);
searchInput.addEventListener('keypress', e => { if(e.key==='Enter') buscarMoto(); });
btnClear.addEventListener('click', limpiarFormulario);
inspectionForm.addEventListener('input', updatePreview);
inspectionForm.addEventListener('change', updatePreview);

inspectionForm.addEventListener('submit', async e => {
e.preventDefault();
if(!usuarioActual) { mostrarAlerta('error','🔐 Inicie sesión'); return; }
if(!motoIdInput.value) { mostrarAlerta('error','Busque una moto primero'); return; }
btnSubmit.disabled = true;
try {
// Funciones auxiliares para convertir vacío a null
const toIntOrNull = val => {
const num = parseInt(val, 10);
return isNaN(num) || val === '' ? null : num;
};

const payload = {
vehiculo_id: toIntOrNull(motoIdInput.value),
n_inspeccion: document.getElementById('n_inspeccion').value || null,
fecha_inspeccion: document.getElementById('fecha_inspeccion').value || null,
hora: document.getElementById('hora').value || null,
motivo: document.getElementById('motivo_inspeccion').value || null,
lugar: document.getElementById('lugar').value || null,
asignacion: document.getElementById('asignacion').value || null,
supervision: document.getElementById('supervision').value || null,
placa: document.getElementById('placa').value || null,
marca: document.getElementById('marca').value || null,
modelo: document.getElementById('modelo').value || null,
ano: toIntOrNull(document.getElementById('ano').value),
color: document.getElementById('color').value || null,
s_carroceria: document.getElementById('s_carroceria').value || null,
s_motor: document.getElementById('s_motor').value || null,
n_identificacion: document.getElementById('n_identificacion').value || null,
observaciones: document.getElementById('observaciones').value || null,
coord_nombre: document.getElementById('coord_nombre').value || null,
coord_rango: document.getElementById('coord_rango').value || null,
coord_cedula: document.getElementById('coord_cedula').value || null,
coord_telefono: document.getElementById('coord_telefono').value || null,
insp_nombre: document.getElementById('insp_nombre').value || null,
insp_rango: document.getElementById('insp_rango').value || null,
insp_cedula: document.getElementById('insp_cedula').value || null,
insp_telefono: document.getElementById('insp_telefono').value || null,
inspector: usuarioActual.email || 'sistema',
created_at: new Date().toISOString(),
componentes_moto: getComponentesMotoValues()
};

// Eliminar campos null del payload para limpieza
Object.keys(payload).forEach(key => {
if (payload[key] === null || payload[key] === '') delete payload[key];
});

const { error } = await supabase.from('inspecciones_pvr').insert([payload]);
if(error) throw error;
mostrarAlerta('success', '✅ Inspección de Moto registrada');
alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
setTimeout(() => { limpiarFormulario(); }, 2000);
} catch(err) {
console.error('Error detalle', err);
mostrarAlerta('error', `Error: ${err.message}`);
} finally {
btnSubmit.disabled = false;
}
});

setDefaults();
updatePreview();
mostrarAlerta('info', '🔍 Busque una moto para habilitar el formulario');
});
