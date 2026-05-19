/**
 * TRANSPORTE - DASHBOARD PRINCIPAL
 * Muestra estadísticas del parque automotor
 */
(function() {
    'use strict';

    // ================= CONFIGURACIÓN =================
    const SUPABASE_URL = window.SUPABASE_URL;
    const SUPABASE_KEY = window.SUPABASE_KEY;

    // Verificar que Supabase SDK y configuración estén listos
    if (!window.supabase || !SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Error: Supabase SDK o configuración no disponible');
        return;
    }

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // ================= REFERENCIAS AL DOM =================
    let userEmailEl, logoutBtn, statsElements;

    function initDOMReferences() {
        userEmailEl = document.getElementById('userEmail');
        logoutBtn = document.getElementById('logoutBtn');
        
        statsElements = {
            total: document.getElementById('totalVehicles'),
            autoBusCamion: document.getElementById('autoBusCamion'),
            motos: document.getElementById('motosVehicles'),
            traccionSangre: document.getElementById('traccionSangre'),
            especial: document.getElementById('especialVehicles'),
            operativos: document.getElementById('operativosVehicles'),
            inoperativos: document.getElementById('inoperativosVehicles'),
            desincorporados: document.getElementById('desincorporadosVehicles')
        };
    }

    // Helper para normalizar texto
    const normalize = (txt) => (txt || '').trim().toUpperCase().replace(/\s+/g, ' ');

    // ================= MOSTRAR USUARIO AUTENTICADO =================
    async function mostrarUsuarioAutenticado() {
        try {
            console.log('🔍 Verificando sesión de usuario...');
            
            // Esperar un pequeño delay para asegurar que Supabase restauró la sesión
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
                console.warn('⚠️ Error obteniendo sesión:', error.message);
                if (userEmailEl) userEmailEl.textContent = 'Error de sesión';
                return;
            }
            
            if (session?.user?.email) {
                console.log('✅ Usuario autenticado:', session.user.email);
                userEmailEl.textContent = session.user.email;
            } else {
                console.warn('⚠️ No hay sesión activa');
                // Redirigir al login si no hay sesión
                if (userEmailEl) userEmailEl.textContent = 'No autenticado';
                // Opcional: window.location.href = '../index.html';
            }
        } catch (err) {
            console.error('❌ Error crítico en mostrarUsuarioAutenticado:', err);
            if (userEmailEl) userEmailEl.textContent = 'Error';
        }
    }

    // ================= CERRAR SESIÓN =================
    async function cerrarSesion() {
        try {
            console.log('🚪 Cerrando sesión...');
            await supabase.auth.signOut();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '../index.html';
        }
    }

    // ================= CARGAR ESTADÍSTICAS =================
    async function cargarEstadisticas() {
        try {
            console.log('📡 Obteniendo datos de Supabase...');
            
            const { data, error } = await supabase
                .from('vehiculos')
                .select('clase, estatus');
                
            if (error) throw error;

            const rows = data || [];
            console.log(`📦 Registros recibidos: ${rows.length}`);

            // 1️⃣ TOTAL: Todos los registros
            const total = rows.length;

            // 2️⃣ DESINCORPORADOS (se cuentan aparte)
            const desincorporados = rows.filter(r => normalize(r.estatus) === 'DESINCORPORADA').length;
            
            // 3️⃣ ACTIVOS: Excluye desincorporados para el resto de contadores
            const activos = rows.filter(r => normalize(r.estatus) !== 'DESINCORPORADA');

            // 4️⃣ CATEGORÍAS POR CLASE (solo activos)
            const autoBusCamion = activos.filter(r => 
                ['AUTOBUS', 'AUTOMOVIL', 'CAMION', 'CAMIONETA'].includes(normalize(r.clase))
            ).length;
            
            const motos = activos.filter(r => normalize(r.clase) === 'MOTO').length;
            const traccionSangre = activos.filter(r => normalize(r.clase) === 'TRACCION DE SANGRE').length;
            const especial = activos.filter(r => normalize(r.clase) === 'ESPECIAL').length;

            // 5️⃣ ESTADOS OPERATIVOS (solo activos)
            const operativos = activos.filter(r => normalize(r.estatus) === 'OPERATIVA').length;
            const inoperativos = activos.filter(r => normalize(r.estatus) === 'INOPERATIVA').length;

            console.log('✅ Cálculo final:', { total, autoBusCamion, motos, traccionSangre, especial, operativos, inoperativos, desincorporados });

            // 🟢 ACTUALIZAR DOM
            const statsMap = { total, autoBusCamion, motos, traccionSangre, especial, operativos, inoperativos, desincorporados };
            Object.entries(statsMap).forEach(([key, val]) => {
                if (statsElements[key]) {
                    statsElements[key].textContent = val;
                }
            });

        } catch (err) {
            console.error('❌ Error cargando estadísticas:', err);
            Object.values(statsElements).forEach(el => { if (el) el.textContent = '0'; });
        }
    }

    // ================= INICIALIZACIÓN =================
    document.addEventListener('DOMContentLoaded', async () => {
        console.log('🚀 Inicializando módulo de Transporte...');
        
        initDOMReferences();
        
        // Verificar referencias DOM
        if (!userEmailEl) {
            console.warn('⚠️ Elemento #userEmail no encontrado en el DOM');
            return;
        }

        // Ejecutar en paralelo
        await Promise.all([
            mostrarUsuarioAutenticado(),
            cargarEstadisticas()
        ]);

        // Event listener para logout
        if (logoutBtn) {
            logoutBtn.addEventListener('click', cerrarSesion);
            console.log('✅ Listener de logout activado');
        }
        
        console.log('✅ Módulo de Transporte inicializado correctamente');
    });
})();
