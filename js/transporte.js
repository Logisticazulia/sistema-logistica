(function() {
    'use strict';

    // ================= CONFIGURACIÓN =================
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_KEY = window.SUPABASE_KEY;

    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Error: Configuración de Supabase o SDK no disponible.');
        return; // Detiene la ejecución si falta la config o el SDK no cargó
    }

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // ================= REFERENCIAS AL DOM =================
    const userEmailEl = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    const statsElements = {
        total: document.getElementById('totalVehicles'),
        automoviles: document.getElementById('automovilVehicles'),
        motos: document.getElementById('motosVehicles'),
        operativos: document.getElementById('operativosVehicles'),
        inoperativos: document.getElementById('inoperativosVehicles')
    };

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

    // Helper para normalizar texto (maneja acentos, mayúsculas y espacios)
    const normalizeText = (str) => (str || '').trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

    // ================= CARGAR ESTADÍSTICAS =================
    async function cargarEstadisticas() {
        try {
            console.log('📊 Cargando estadísticas de vehículos...');
            
            // Se eliminó 'situacion' ya que no se usa en el cálculo.
            const { data, error } = await supabaseClient
                .from('vehiculos')
                .select('tipo, estatus');

            if (error) throw error;

            const vehiculos = data || [];
            console.log(`📊 Total de vehículos en BD: ${vehiculos.length}`);

            // ✅ CÁLCULO DE ESTADÍSTICAS CON NORMALIZACIÓN ROBUSTA
            const total = vehiculos.length;
            const automoviles = vehiculos.filter(v => normalizeText(v.tipo) === 'AUTOMOVIL').length;
            const motos = vehiculos.filter(v => normalizeText(v.tipo) === 'MOTO').length;
            // ⚠️ NOTA: Ajusta 'OPERATIVA'/'INOPERATIVA' si en tu BD usan 'OPERATIVO'/'INOPERATIVO'
            const operativos = vehiculos.filter(v => normalizeText(v.estatus) === 'OPERATIVA').length;
            const inoperativos = vehiculos.filter(v => normalizeText(v.estatus) === 'INOPERATIVA').length;

            // ✅ ACTUALIZACIÓN SEGURA DEL DOM
            Object.entries(statsElements).forEach(([key, el]) => {
                if (el) {
                    el.textContent = { total, automoviles, motos, operativos, inoperativos }[key];
                }
            });

            console.log('📊 Estadísticas renderizadas:', { total, automoviles, motos, operativos, inoperativos });
        } catch (error) {
            console.error('❌ Error en cargarEstadisticas:', error);
            // Fallback seguro en caso de error
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
        console.log('✅ Módulo de Transporte inicializado correctamente.');
    });
})();
