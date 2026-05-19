/**
 * TRANSPORTE - DASHBOARD PRINCIPAL
 * Muestra estadísticas del parque automotor
 */
// ================= CONFIGURACIÓN =================
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
console.error('❌ Error: Configuración de Supabase no encontrada');
}
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= REFERENCIAS AL DOM =================
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Elementos de estadísticas
const totalVehiclesEl = document.getElementById('totalVehicles');
const automovilVehiclesEl = document.getElementById('automovilVehicles');
const motosVehiclesEl = document.getElementById('motosVehicles');
const especialesVehiclesEl = document.getElementById('especialesVehicles'); // ✅ NUEVO ELEMENTO
const operativosVehiclesEl = document.getElementById('operativosVehicles');
const inoperativosVehiclesEl = document.getElementById('inoperativosVehicles');

// ================= FUNCIONES DE UTILIDAD =================
async function mostrarUsuarioAutenticado() {
try {
// ✅ SINTAXIS CORRECTA: data: { session }
const { data: { session }, error } = await supabaseClient.auth.getSession();
if (session?.user?.email) {
userEmail.textContent = session.user.email;
} else {
userEmail.textContent = 'Usuario no autenticado';
}
} catch (err) {
console.error('Error obteniendo sesión:', err);
userEmail.textContent = 'Error de sesión';
}
}

async function cerrarSesion() {
try {
await supabaseClient.auth.signOut();
window.location.href = '../index.html';
} catch (error) {
console.error('Error al cerrar sesión:', error);
window.location.href = '../index.html';
}
}

// ================= CARGAR ESTADÍSTICAS =================
async function cargarEstadisticas() {
try {
console.log('📊 Cargando estadísticas de vehículos...');
const { data, error } = await supabaseClient
.from('vehiculos')
.select('tipo, clase, estatus')
.order('created_at', { ascending: false });

if (error) {
console.error('❌ Error al cargar vehículos:', error);
throw error;
}

const vehiculos = data || [];
console.log(`📊 Total de vehículos en BD: ${vehiculos.length}`);

// ✅ CALCULAR ESTADÍSTICAS

// 1. Total: Contamos todo lo que NO sea desincorporado para que el dashboard refleje flota activa
const total = vehiculos.filter(v => 
!v.estatus || v.estatus.trim().toUpperCase() !== 'DESINCORPORADA'
).length;

// 2. Automóviles: Solo los operativos
const automoviles = vehiculos.filter(v => {
   const tipo = (v.tipo || '').trim().toUpperCase();
   const estatus = (v.estatus || '').trim().toUpperCase();
   return tipo === 'AUTOMOVIL' && estatus === 'OPERATIVA';
}).length;

// 3. Motos: SOLO operativas (Excluye desincorporadas y reparación)
const motos = vehiculos.filter(v => {
   const tipo = (v.tipo || '').trim().toUpperCase();
   const clase = (v.clase || '').trim().toUpperCase();
   const estatus = (v.estatus || '').trim().toUpperCase();

   // Es moto si la clase es MOTO o el tipo incluye MOTO
   const esMoto = clase === 'MOTO' || tipo.includes('MOTO');
   const esOperativa = estatus === 'OPERATIVA';

   return esMoto && esOperativa;
}).length;

// 4. Especiales (Embarcaciones): Solo operativas
const especiales = vehiculos.filter(v => {
   const tipo = (v.tipo || '').trim().toUpperCase();
   const clase = (v.clase || '').trim().toUpperCase();
   const estatus = (v.estatus || '').trim().toUpperCase();

   // Es especial si la clase o tipo es ESPECIAL
   const esEspecial = clase === 'ESPECIAL' || tipo === 'ESPECIAL';
   const esOperativa = estatus === 'OPERATIVA';

   return esEspecial && esOperativa;
}).length;

// 5. Totales de estado (Operativos vs Inoperativos)
const operativos = vehiculos.filter(v =>
   v.estatus && v.estatus.trim().toUpperCase() === 'OPERATIVA'
).length;

const inoperativos = vehiculos.filter(v =>
   v.estatus && (v.estatus.trim().toUpperCase() === 'INOPERATIVA' || v.estatus.trim().toUpperCase() === 'DESINCORPORADA')
).length;

// ✅ ACTUALIZAR DOM
if (totalVehiclesEl) totalVehiclesEl.textContent = total;
if (automovilVehiclesEl) automovilVehiclesEl.textContent = automoviles;
if (motosVehiclesEl) motosVehiclesEl.textContent = motos;
if (especialesVehiclesEl) especialesVehiclesEl.textContent = especiales; // ✅ ACTUALIZAR ESPECIALES
if (operativosVehiclesEl) operativosVehiclesEl.textContent = operativos;
if (inoperativosVehiclesEl) inoperativosVehiclesEl.textContent = inoperativos;

console.log('📊 Estadísticas:', { total, automoviles, motos, especiales, operativos, inoperativos });

} catch (error) {
console.error('❌ Error en cargarEstadisticas:', error);
// Mostrar ceros en caso de error
if (totalVehiclesEl) totalVehiclesEl.textContent = '0';
if (automovilVehiclesEl) automovilVehiclesEl.textContent = '0';
if (motosVehiclesEl) motosVehiclesEl.textContent = '0';
if (especialesVehiclesEl) especialesVehiclesEl.textContent = '0';
if (operativosVehiclesEl) operativosVehiclesEl.textContent = '0';
if (inoperativosVehiclesEl) inoperativosVehiclesEl.textContent = '0';
}
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
console.log('🚀 Inicializando módulo de Transporte...');
if (supabaseClient) {
mostrarUsuarioAutenticado();
cargarEstadisticas();
}

// Event listener para logout
if (logoutBtn) {
logoutBtn.addEventListener('click', cerrarSesion);
}

console.log('✅ Módulo de Transporte inicializado');
});
