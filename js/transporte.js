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
const terrestresVehiclesEl = document.getElementById('terrestresVehicles'); // Auto/Bus/Camión
const motosVehiclesEl = document.getElementById('motosVehicles');
const traccionSangreEl = document.getElementById('traccionSangreVehicles');
const operativosVehiclesEl = document.getElementById('operativosVehicles');
const inoperativosVehiclesEl = document.getElementById('inoperativosVehicles');
const desincorporadosVehiclesEl = document.getElementById('desincorporadosVehicles');

// ================= FUNCIONES DE UTILIDAD =================
async function mostrarUsuarioAutenticado() {
  try {
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
    // ✅ Seleccionamos solo las columnas necesarias para optimizar la query
    const { data, error } = await supabaseClient
      .from('vehiculos')
      .select('clase, estatus')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error al cargar vehículos:', error);
      throw error;
    }

    const vehiculos = data || [];
    console.log(`📊 Total de vehículos en BD: ${vehiculos.length}`);

    // ✅ CALCULAR ESTADÍSTICAS
    const total = vehiculos.length;

    // 1. Vehículos terrestres (Autobús, Automóvil, Camión, Camioneta)
    const terrestres = vehiculos.filter(v => {
      const c = (v.clase || '').trim().toUpperCase();
      return ['AUTOBUS', 'AUTOMOVIL', 'CAMION', 'CAMIONETA'].includes(c);
    }).length;

    // 2. Motos
    const motos = vehiculos.filter(v =>
      (v.clase || '').trim().toUpperCase() === 'MOTO'
    ).length;

    // 3. Tracción de Sangre
    const traccionSangre = vehiculos.filter(v =>
      (v.clase || '').trim().toUpperCase() === 'TRACCION DE SANGRE'
    ).length;

    // 4. Operativos
    const operativos = vehiculos.filter(v =>
      (v.estatus || '').trim().toUpperCase() === 'OPERATIVA'
    ).length;

    // 5. Inoperativos
    const inoperativos = vehiculos.filter(v =>
      (v.estatus || '').trim().toUpperCase() === 'INOPERATIVA'
    ).length;

    // 6. Desincorporados (incluye variante con typo 'DESINCOPORADA' presente en tu CSV)
    const desincorporados = vehiculos.filter(v => {
      const e = (v.estatus || '').trim().toUpperCase();
      return e.includes('DESINCORPORADA') || e.includes('DESINCOPORADA');
    }).length;

    // ✅ ACTUALIZAR DOM
    if (totalVehiclesEl) totalVehiclesEl.textContent = total;
    if (terrestresVehiclesEl) terrestresVehiclesEl.textContent = terrestres;
    if (motosVehiclesEl) motosVehiclesEl.textContent = motos;
    if (traccionSangreEl) traccionSangreEl.textContent = traccionSangre;
    if (operativosVehiclesEl) operativosVehiclesEl.textContent = operativos;
    if (inoperativosVehiclesEl) inoperativosVehiclesEl.textContent = inoperativos;
    if (desincorporadosVehiclesEl) desincorporadosVehiclesEl.textContent = desincorporados;

    console.log('📊 Estadísticas calculadas:', { 
      total, terrestres, motos, traccionSangre, operativos, inoperativos, desincorporados 
    });
  } catch (error) {
    console.error('❌ Error en cargarEstadisticas:', error);
    // Mostrar ceros en caso de error para mantener la UI limpia
    const elements = [totalVehiclesEl, terrestresVehiclesEl, motosVehiclesEl, traccionSangreEl, operativosVehiclesEl, inoperativosVehiclesEl, desincorporadosVehiclesEl];
    elements.forEach(el => { if (el) el.textContent = '0'; });
  }
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Inicializando módulo de Transporte...');
  if (supabaseClient) {
    mostrarUsuarioAutenticado();
    cargarEstadisticas();
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', cerrarSesion);
  }
  console.log('✅ Módulo de Transporte inicializado');
});
