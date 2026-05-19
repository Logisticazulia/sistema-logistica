(function() {
    'use strict';

    // ================= CONFIGURACIÓN =================
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_KEY = window.SUPABASE_KEY;

    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Error: Configuración de Supabase o SDK no disponible.');
        return;
    }

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // ================= REFERENCIAS AL DOM =================
    const userEmailEl = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Mapeo exacto a los nuevos IDs del HTML
    const statsElements = {
        total: document.getElementById('totalVehicles'),
        autosBusCamion: document.getElementById('autosBusCamion'),
        motos: document.getElementById('motosVehicles'),
        traccionSangre: document.getElementById('traccionSangre'),
        especial: document.getElementById('especialVehicles'),
        operativos: document.getElementById('operativosVehicles'),
        inoperativos: document.getElementById('inoperativosVehicles')
    };

    // Helper para normalizar texto (ignora mayúsculas/minúsculas y espacios extra)
    const normalize = (str) => (str || '').trim().toUpperCase();

    // ================= FUNCIONES DE UTILIDAD =================
    async function mostrarUsuarioAutenticado() {
        try {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            userEmailEl.textContent = session?.user?.email || 'Usuario no autenticado';
        } catch (err) {
            console.error('Error obteniendo sesión:', err);
            userEmailEl.textContent = 'Error de sesión';
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
            
            // ⚡ Optimización: Solo traemos las columnas que necesitamos
            const { data, error } = await supabaseClient
                .from('vehiculos')
                .select('clase, estatus');

            if (error) throw error;

            const vehiculos = data || [];
            console.log(`📊 Registros obtenidos de BD: ${vehiculos.length}`);

            // 1️⃣ TOTAL: Cuenta todos los registros en la tabla
            const total = vehiculos.length;

            // 🚫 Filtramos vehículos que NO estén DESINCORPORADOS para el resto de contadores
            const activos = vehiculos.filter(v => normalize(v.estatus) !== 'DESINCORPORADA');

            // 2️⃣ AUTO / BUS / CAMIÓN
            const tiposRuedas = ['AUTOBUS', 'AUTOMOVIL', 'CAMION', 'CAMIONETA'];
            const autosBusCamion = activos.filter(v => tiposRuedas.includes(normalize(v.clase))).length;

            // 3️⃣ MOTOS
            const motos = activos.filter(v => normalize(v.clase) === 'MOTO').length;

            // 4️⃣ TRACCIÓN DE SANGRE
            const traccionSangre = activos.filter(v => normalize(v.clase) === 'TRACCION DE SANGRE').length;

            // 5️⃣ ESPECIAL
            const especial = activos.filter(v => normalize(v.clase) === 'ESPECIAL').length;

            // 6️⃣ OPERATIVOS e INOPERATIVOS (Solo desde la columna estatus, excluyendo desincorporados)
            const operativos = activos.filter(v => normalize(v.estatus) === 'OPERATIVA').length;
            const inoperativos = activos.filter(v => normalize(v.estatus) === 'INOPERATIVA').length;

            // ✅ Actualización segura del DOM
            const statsMap = { total, autosBusCamion, motos, traccionSangre, especial, operativos, inoperativos };
            Object.entries(statsElements).forEach(([key, el]) => {
                if (el) el.textContent = statsMap[key] ?? 0;
            });

            console.log('✅ Estadísticas renderizadas:', statsMap);
        } catch (error) {
            console.error('❌ Error en cargarEstadisticas:', error);
            // Fallback seguro
            Object.values(statsElements).forEach(el => { if (el) el.textContent = '0'; });
        }
    }

    // ================= INICIALIZACIÓN =================
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Inicializando módulo de Transporte...');
        mostrarUsuarioAutenticado();
        cargarEstadisticas();

        if (logoutBtn) {
            logoutBtn.addEventListener('click', cerrarSesion);
        }
    });
})();
