(function() {
    'use strict';

    // ================= CONFIGURACIÓN =================
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_KEY = window.SUPABASE_KEY;

    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Configuración de Supabase o SDK no disponible.');
        return;
    }

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // ================= REFERENCIAS AL DOM =================
    // ✅ IDs exactos que coinciden con el HTML de abajo
    const els = {
        total: document.getElementById('totalVehicles'),
        autoBusCamion: document.getElementById('autoBusCamion'),
        motos: document.getElementById('motosVehicles'),
        traccionSangre: document.getElementById('traccionSangre'),
        especial: document.getElementById('especialVehicles'),
        operativos: document.getElementById('operativosVehicles'),
        inoperativos: document.getElementById('inoperativosVehicles'),
        desincorporados: document.getElementById('desincorporadosVehicles')
    };

    // Helper para normalizar texto (ignora espacios, acentos y mayúsculas/minúsculas)
    const normalize = (txt) => (txt || '').trim().toUpperCase().replace(/\s+/g, ' ');

    // ================= CARGAR ESTADÍSTICAS =================
    async function cargarEstadisticas() {
        try {
            console.log('📡 Obteniendo datos de Supabase...');
            
            // ⚡ Solo traemos las columnas necesarias para optimizar la red
            const { data, error } = await supabase.from('vehiculos').select('clase, estatus');
            if (error) throw error;

            const rows = data || [];
            console.log(`📦 Registros recibidos: ${rows.length}`);

            const total = rows.length;

            // 1️⃣ DESINCORPORADOS (Conteo separado)
            const desincorporados = rows.filter(r => normalize(r.estatus) === 'DESINCORPORADA').length;
            
            // 2️⃣ ACTIVOS (Excluye desincorporados para el resto de contadores)
            const activos = rows.filter(r => normalize(r.estatus) !== 'DESINCORPORADA');

            // 3️⃣ CATEGORÍAS POR CLASE (Solo sobre activos)
            const autoBusCamion = activos.filter(r => 
                ['AUTOBUS', 'AUTOMOVIL', 'CAMION', 'CAMIONETA'].includes(normalize(r.clase))
            ).length;
            
            const motos = activos.filter(r => normalize(r.clase) === 'MOTO').length;
            const traccionSangre = activos.filter(r => normalize(r.clase) === 'TRACCION DE SANGRE').length;
            const especial = activos.filter(r => normalize(r.clase) === 'ESPECIAL').length;

            // 4️⃣ ESTADOS OPERATIVOS (Solo sobre activos)
            const operativos = activos.filter(r => normalize(r.estatus) === 'OPERATIVA').length;
            const inoperativos = activos.filter(r => normalize(r.estatus) === 'INOPERATIVA').length;

            console.log('✅ Cálculo final:', { total, autoBusCamion, motos, traccionSangre, especial, operativos, inoperativos, desincorporados });

            // 🟢 ACTUALIZACIÓN SEGURA DEL DOM
            Object.entries({
                total, autoBusCamion, motos, traccionSangre, especial, operativos, inoperativos, desincorporados
            }).forEach(([key, val]) => {
                if (els[key]) {
                    els[key].textContent = val; // Reemplaza el ⏳ por el número
                } else {
                    console.warn(`⚠️ Elemento HTML no encontrado en el DOM: ${key}`);
                }
            });

        } catch (err) {
            console.error('❌ Error crítico cargando estadísticas:', err);
            // Fallback: pone 0 en todos los que existan para que no quede el loader
            Object.values(els).forEach(el => { if (el) el.textContent = '0'; });
        }
    }

    // ================= INICIALIZACIÓN =================
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Inicializando módulo de Transporte...');
        cargarEstadisticas();

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await supabase.auth.signOut();
                window.location.href = '../index.html';
            });
        }
    });
})();
