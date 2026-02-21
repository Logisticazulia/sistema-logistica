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
            .select('tipo, estatus, situacion')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error al cargar vehículos:', error);
            throw error;
        }
        
        const vehiculos = data || [];
        console.log(`📊 Total de vehículos en BD: ${vehiculos.length}`);
        
        // ✅ CALCULAR ESTADÍSTICAS
        const total = vehiculos.length;
        
        const automoviles = vehiculos.filter(v => 
            v.tipo && v.tipo.trim().toUpperCase() === 'AUTOMOVIL'
        ).length;
        
        const motos = vehiculos.filter(v => 
            v.tipo && v.tipo.trim().toUpperCase() === 'MOTO'
        ).length;
        
        const operativos = vehiculos.filter(v => 
            v.estatus && v.estatus.trim().toUpperCase() === 'OPERATIVA'
        ).length;
        
        const inoperativos = vehiculos.filter(v => 
            v.estatus && v.estatus.trim().toUpperCase() === 'INOPERATIVA'
        ).length;
        
        // ✅ ACTUALIZAR DOM
        if (totalVehiclesEl) totalVehiclesEl.textContent = total;
        if (automovilVehiclesEl) automovilVehiclesEl.textContent = automoviles;
        if (motosVehiclesEl) motosVehiclesEl.textContent = motos;
        if (operativosVehiclesEl) operativosVehiclesEl.textContent = operativos;
        if (inoperativosVehiclesEl) inoperativosVehiclesEl.textContent = inoperativos;
        
        console.log('📊 Estadísticas:', { total, automoviles, motos, operativos, inoperativos });
        
    } catch (error) {
        console.error('❌ Error en cargarEstadisticas:', error);
        // Mostrar ceros en caso de error
        if (totalVehiclesEl) totalVehiclesEl.textContent = '0';
        if (automovilVehiclesEl) automovilVehiclesEl.textContent = '0';
        if (motosVehiclesEl) motosVehiclesEl.textContent = '0';
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
