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

// Mostrar usuario autenticado
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

// Cerrar sesión
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
        
        // ✅ CONSULTAR TODOS LOS VEHÍCULOS
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
        
        // ✅ ACTUALIZAR DOM CON ANIMACIÓN
        actualizarContador(totalVehiclesEl, total);
        actualizarContador(automovilVehiclesEl, automoviles);
        actualizarContador(motosVehiclesEl, motos);
        actualizarContador(operativosVehiclesEl, operativos);
        actualizarContador(inoperativosVehiclesEl, inoperativos);
        
        console.log('📊 Estadísticas:', {
            total,
            automoviles,
            motos,
            operativos,
            inoperativos
        });
        
    } catch (error) {
        console.error('❌ Error en cargarEstadisticas:', error);
        // Mostrar ceros en caso de error
        totalVehiclesEl.textContent = '0';
        automovilVehiclesEl.textContent = '0';
        motosVehiclesEl.textContent = '0';
        operativosVehiclesEl.textContent = '0';
        inoperativosVehiclesEl.textContent = '0';
    }
}

// Animación de contador
function actualizarContador(elemento, valorFinal) {
    if (!elemento) return;
    
    let valorActual = 0;
    const duracion = 1000; // 1 segundo
    const pasos = 30;
    const incremento = valorFinal / pasos;
    const intervalo = duracion / pasos;
    
    const timer = setInterval(() => {
        valorActual += incremento;
        if (valorActual >= valorFinal) {
            valorActual = valorFinal;
            clearInterval(timer);
        }
        elemento.textContent = Math.floor(valorActual);
    }, intervalo);
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando módulo de Transporte...');
    
    mostrarUsuarioAutenticado();
    cargarEstadisticas();
    
    // Event listener para logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    console.log('✅ Módulo de Transporte inicializado');
});
