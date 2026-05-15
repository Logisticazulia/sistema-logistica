/**
* CONSULTA DE VEHÍCULOS - PLANILLA
*/
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
let allVehicles = [];
let filteredVehicles = [];
let currentPage = 1;
const itemsPerPage = 20;
let currentVehicle = null;
let filterTipo, filterClase, filterSituacion, filterEstatus, filterUnidad, filterEPM, filterEPP, searchInput;

function getDOMElements() {
filterTipo = document.getElementById('filterTipo');
filterClase = document.getElementById('filterClase');
filterSituacion = document.getElementById('filterSituacion');
filterEstatus = document.getElementById('filterEstatus');
filterUnidad = document.getElementById('filterUnidad');
filterEPM = document.getElementById('filterEPM');
filterEPP = document.getElementById('filterEPP');
searchInput = document.getElementById('searchInput');
}

async function cargarVehiculos() {
try {
const { data, error } = await supabaseClient.from('vehiculos').select('*').order('marca', { ascending: true });
if (error) throw error;
allVehicles = data || [];
filteredVehicles = [...allVehicles];
populateFilters();
aplicarFiltros();
} catch (error) {
document.getElementById('vehiclesTableBody').innerHTML = `
<tr><td colspan="11" style="text-align: center; color: #dc2626;">Error al cargar: ${error.message}</td></tr>`;
}
}

function populateFilters() {
if (filterUnidad) {
const unidadValues = [...new Set(allVehicles.map(v => v.unidad_administrativa).filter(Boolean))].sort();
unidadValues.forEach(v => {
const opt = document.createElement('option'); opt.value = v.trim().toUpperCase(); opt.textContent = v.trim(); filterUnidad.appendChild(opt);
});
}
if (filterEPP && filterEPP.options.length <= 1) {
const eppValues = [...new Set(allVehicles.map(v => v.epp).filter(Boolean))].sort();
eppValues.forEach(v => {
const opt = document.createElement('option'); opt.value = v.trim().toUpperCase(); opt.textContent = v.trim(); filterEPP.appendChild(opt);
});
}
}

function buscarPorPlacaFacsímil() {
if (!searchInput) getDOMElements();
const searchTerm = searchInput.value.trim().toUpperCase();
if (!searchTerm) { aplicarFiltros(); return; }
filteredVehicles = allVehicles.filter(v => 
(v.placa && v.placa.toUpperCase().includes(searchTerm)) ||
(v.facsimil && v.facsimil.toUpperCase().includes(searchTerm)) ||
(v.s_carroceria && v.s_carroceria.toUpperCase().includes(searchTerm)) ||
(v.s_motor && v.s_motor.toUpperCase().includes(searchTerm))
);
currentPage = 1;
renderTable(); renderPagination();
}

function setupSearchEnter() {
if (searchInput) {
searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') buscarPorPlacaFacsímil(); });
}
}

function aplicarFiltros() {
if (!filterTipo) getDOMElements();
const fT = filterTipo.value.trim().toUpperCase();
const fC = filterClase.value.trim().toUpperCase();
const fS = filterSituacion.value.trim().toUpperCase();
const fE = filterEstatus.value.trim().toUpperCase();
const fU = filterUnidad.value.trim().toUpperCase();
const fEPM = filterEPM.value.trim().toUpperCase();
const fEPP = filterEPP.value.trim().toUpperCase();

filteredVehicles = allVehicles.filter(v => {
return (!fT || (v.tipo && v.tipo.toUpperCase() === fT)) &&
       (!fC || (v.clase && v.clase.toUpperCase() === fC)) &&
       (!fS || (v.situacion && v.situacion.toUpperCase() === fS)) &&
       (!fE || (v.estatus && v.estatus.toUpperCase() === fE)) &&
       (!fU || (v.unidad_administrativa && v.unidad_administrativa.toUpperCase() === fU)) &&
       (!fEPM || (v.epm && v.epm.toUpperCase() === fEPM)) &&
       (!fEPP || (v.epp && v.epp.toUpperCase() === fEPP));
});
currentPage = 1;
renderTable(); renderPagination();
}

function limpiarFiltros() {
if (filterTipo) filterTipo.value = '';
if (filterClase) filterClase.value = '';
if (filterSituacion) filterSituacion.value = '';
if (filterEstatus) filterEstatus.value = '';
if (filterUnidad) filterUnidad.value = '';
if (filterEPM) filterEPM.value = '';
if (filterEPP) filterEPP.value = '';
if (searchInput) searchInput.value = '';
aplicarFiltros();
}

function exportarExcel() {
if (filteredVehicles.length === 0) { alert('No hay datos para exportar'); return; }
const datosCompletos = filteredVehicles.map(v => ({
id: v.id || '', marca: v.marca || '', modelo: v.modelo || '', tipo: v.tipo || '',
clase: v.clase || '', ano: v.ano || '', color: v.color || '', s_carroceria: v.s_carroceria || '',
s_motor: v.s_motor || '', placa: v.placa || '', facsimil: v.facsimil || '',
n_identificacion: v.n_identificacion || '', situacion: v.situacion || '',
unidad_administrativa: v.unidad_administrativa || '', redip: v.redip || '',
ccpe: v.ccpe || '', epm: v.epm || '', epp: v.epp || '',
ubicacion_fisica: v.ubicacion_fisica || '', asignacion: v.asignacion || '',
estatus: v.estatus || '', observacion: v.observacion || '',
certificado_origen: v.certificado_origen || '', fecha_inspeccion: v.fecha_inspeccion || '',
n_tramite: v.n_tramite || '', ubicacion_titulo: v.ubicacion_titulo || '',
observacion_extra: v.observacion_extra || '', cuadrante: v.cuadrante || '',
comuna: v.comuna || '', created_at: v.created_at || ''
}));
const ws = XLSX.utils.json_to_sheet(datosCompletos);
ws['!cols'] = [{wch:10},{wch:20},{wch:20},{wch:15},{wch:15},{wch:10},{wch:15},{wch:25},{wch:25},{wch:15},{wch:15},{wch:15},{wch:20},{wch:40},{wch:15},{wch:15},{wch:20},{wch:30},{wch:30},{wch:15},{wch:15},{wch:50},{wch:20},{wch:20},{wch:20},{wch:30},{wch:50},{wch:25},{wch:15},{wch:15},{wch:25}];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Vehículos');
XLSX.writeFile(wb, `Vehiculos_${new Date().toISOString().slice(0,10)}_${filteredVehicles.length}registros.xlsx`);
}

function renderTable() {
const start = (currentPage - 1) * itemsPerPage;
const pageVehicles = filteredVehicles.slice(start, start + itemsPerPage);
if (pageVehicles.length === 0) {
document.getElementById('vehiclesTableBody').innerHTML = `<tr><td colspan="11" style="text-align: center; color: #666;">No hay vehículos que mostrar</td></tr>`;
document.getElementById('resultsCount').textContent = '0 vehículos encontrados';
return;
}
document.getElementById('vehiclesTableBody').innerHTML = pageVehicles.map(v => `
<tr onclick="openFicha('${v.id || ''}')">
<td>${v.placa||'N/A'}</td><td>${v.facsimil||'N/A'}</td><td>${v.marca||'N/A'}</td><td>${v.modelo||'N/A'}</td>
<td>${v.tipo||'N/A'}</td><td>${v.clase||'N/A'}</td><td>${v.ano||'N/A'}</td><td>${v.color||'N/A'}</td>
<td>${v.s_carroceria||'N/A'}</td><td>${v.s_motor||'N/A'}</td><td>${getEstatusBadge(v.estatus)}</td>
</tr>`).join('');
document.getElementById('resultsCount').textContent = `${filteredVehicles.length} vehículos encontrados`;
document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${Math.ceil(filteredVehicles.length / itemsPerPage)}`;
}

// ✅ ESTABILIDAD: Mantiene espacio en paginación
function renderPagination() {
const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
const pagination = document.getElementById('pagination');
if (totalPages <= 1) {
// No borramos el HTML, dejamos un texto estático para que no colapse el contenedor
pagination.innerHTML = '<span style="color:#666; font-size:0.85rem;">Página 1 de 1</span>';
return;
}
let html = `<button onclick="changePage(1)" ${currentPage===1?'disabled':''}>«</button>
<button onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;
for (let i = 1; i <= totalPages; i++) {
if (i===1 || i===totalPages || (i>=currentPage-2 && i<=currentPage+2)) {
html += `<button onclick="changePage(${i})" class="${i===currentPage?'active':''}">${i}</button>`;
} else if (i===currentPage-3 || i===currentPage+3) {
html += `<span style="padding:0 5px;">...</span>`;
}
}
html += `<button onclick="changePage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>
<button onclick="changePage(${totalPages})" ${currentPage===totalPages?'disabled':''}>»</button>`;
pagination.innerHTML = html;
}

function changePage(page) {
const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
if (page<1 || page>totalPages) return;
currentPage = page; renderTable(); renderPagination();
}

function openFicha(id) {
const vehicle = allVehicles.find(v => v.id == id);
if (!vehicle) { alert('Vehículo no encontrado'); return; }
currentVehicle = vehicle;
const camposFicha = [
{label:'ID',value:vehicle.id},{label:'Placa',value:vehicle.placa},{label:'Facsímil',value:vehicle.facsimil},
{label:'Marca',value:vehicle.marca},{label:'Modelo',value:vehicle.modelo},{label:'Tipo',value:vehicle.tipo},
{label:'Clase',value:vehicle.clase},{label:'Año',value:vehicle.ano},{label:'Color',value:vehicle.color},
{label:'S/Carrocería',value:vehicle.s_carroceria},{label:'S/Motor',value:vehicle.s_motor},
{label:'N° Identificación',value:vehicle.n_identificacion},{label:'Cuadrante',value:vehicle.cuadrante},
{label:'Comuna',value:vehicle.comuna},{label:'Situación',value:vehicle.situacion},
{label:'Unidad Administrativa',value:vehicle.unidad_administrativa},{label:'REDIP',value:vehicle.redip},
{label:'CCPE',value:vehicle.ccpe},{label:'EPM',value:vehicle.epm},{label:'EPP',value:vehicle.epp},
{label:'Ubicación Física',value:vehicle.ubicacion_fisica},{label:'Asignación',value:vehicle.asignacion},
{label:'Estatus',value:vehicle.estatus},{label:'Certificado de Origen',value:vehicle.certificado_origen},
{label:'Fecha Inspección',value:vehicle.fecha_inspeccion},{label:'N° Trámite',value:vehicle.n_tramite},
{label:'Ubicación Título',value:vehicle.ubicacion_titulo},{label:'Observación Extra',value:vehicle.observacion_extra},
{label:'Creado',value:vehicle.created_at?new Date(vehicle.created_at).toLocaleString():''}
];
document.getElementById('fichaData').innerHTML = camposFicha.map(c => `
<div class="ficha-field"><label>${c.label}</label><span>${c.value||'N/A'}</span></div>`).join('');
const obsDiv = document.getElementById('fichaObservacion');
if (vehicle.observacion) { document.getElementById('observacionText').textContent = vehicle.observacion; obsDiv.style.display='block'; }
else { obsDiv.style.display='none'; }
document.getElementById('modalFicha').style.display='block'; document.body.style.overflow='hidden';
}
function cerrarFicha() { document.getElementById('modalFicha').style.display='none'; document.body.style.overflow='auto'; currentVehicle=null; }
window.onclick = e => { if(e.target===document.getElementById('modalFicha')) cerrarFicha(); };

function exportarPDF() {
if(!currentVehicle) return;
const element = document.getElementById('fichaContent');
const opt = {margin:10, filename:`Ficha_${currentVehicle.placa||currentVehicle.id}.pdf`, image:{type:'jpeg',quality:0.98}, html2canvas:{scale:2}, jsPDF:{unit:'mm',format:'a4',orientation:'portrait'}};
const footer = document.querySelector('.modal-footer'), closeBtn = document.querySelector('.modal-close');
footer.style.display='none'; closeBtn.style.display='none';
html2pdf().set(opt).from(element).save().then(()=>{footer.style.display='flex'; closeBtn.style.display='block';});
}
function imprimirFicha() { window.print(); }
function getEstatusBadge(estatus) {
if(!estatus) return '<span class="badge badge-desincorporada">N/A</span>';
const u = estatus.toUpperCase();
let c = 'badge-desincorporada';
if(u.includes('OPERATIVA')&&!u.includes('INOPERATIVA')) c='badge-operativa';
else if(u.includes('INOPERATIVA')) c='badge-inoperativa';
else if(u.includes('REPARACION')) c='badge-reparacion';
return `<span class="badge ${c}">${estatus}</span>`;
}

document.addEventListener('DOMContentLoaded', () => {
mostrarUsuarioAutenticado(); getDOMElements(); cargarVehiculos(); setupSearchEnter();
const logoutBtn = document.getElementById('logoutBtn');
if(logoutBtn) logoutBtn.addEventListener('click', cerrarSesion);
[filterTipo,filterClase,filterSituacion,filterEstatus,filterUnidad,filterEPM,filterEPP].forEach(el=>{
if(el) el.addEventListener('change', aplicarFiltros);
});
});

async function mostrarUsuarioAutenticado() {
try {
const {data:{session}} = await supabaseClient.auth.getSession();
const userEmail = document.getElementById('userEmail');
if(session?.user?.email) {
const e = session.user.email;
userEmail.textContent = e.length>25?e.split('@')[0].substring(0,22)+'...':e;
userEmail.title = e;
} else { userEmail.textContent='Invitado'; }
} catch(err) { console.error(err); }
}
async function cerrarSesion() {
try { await supabaseClient.auth.signOut(); } catch(e){}
localStorage.clear(); sessionStorage.clear(); window.location.href='../index.html';
}
