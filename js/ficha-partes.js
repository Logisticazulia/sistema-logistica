/**
 * ========================================
 * MÓDULO: Partes de Fichas Técnicas
 * FUENTE: Supabase - Tabla: fichas_tecnicas
 * ========================================
 */

// ========================================
// VARIABLES GLOBALES
// ========================================
let globalFichas = [];
const charts = {};
let supabaseClient = null;

// ========================================
// INICIALIZACIÓN PRINCIPAL
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 1️ Verificar que Supabase esté disponible
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase no está cargado');
        }

        // 2️⃣ Crear cliente de Supabase
        supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_KEY
        );

        // 3️⃣ Mostrar email del usuario autenticado
        await mostrarUsuarioAutenticado();

        // 4️⃣ Configurar botón de cerrar sesión
        configurarCerrarSesion();

        // 5️ Cargar fichas desde Supabase
        console.log('🔄 Cargando fichas técnicas desde Supabase...');
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('No se encontraron fichas técnicas en la base de datos');
        }

        console.log(`✅ ${data.length} fichas cargadas`);
        globalFichas = data;

        // 6️⃣ Calcular y mostrar estadísticas
        calculateStats(data);

        // 7️ Renderizar todos los gráficos (4 en total: 2x2)
        renderAllCharts(data);

    } catch (error) {
        console.error('❌ Error crítico:', error);
        showErrorMessage(error.message);
    }
});

// ========================================
// FUNCIONES DE AUTENTICACIÓN
// ========================================
async function mostrarUsuarioAutenticado() {
    try {
        const sessionData = await supabaseClient.auth.getSession();
        const session = sessionData.data ? sessionData.data.session : null;
        const userEmail = document.getElementById('userEmail');
        
        if (session && session.user && session.user.email) {
            const email = session.user.email;
            const nombreMostrar = email.length > 25 
                ? email.split('@')[0].substring(0, 22) + '...' 
                : email;
            userEmail.textContent = nombreMostrar;
            userEmail.title = email;
            userEmail.style.cursor = 'help';
            console.log('✅ Usuario autenticado:', email);
        } else {
            userEmail.textContent = 'Invitado';
            console.log('⚠️ No hay sesión activa');
        }
    } catch (err) {
        console.error('Error mostrando usuario:', err);
    }
}

function configurarCerrarSesion() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        if (!confirm('¿Está seguro de que desea cerrar sesión?')) {
            return;
        }
        try {
            console.log('🔄 Cerrando sesión...');
            const logoutData = await supabaseClient.auth.signOut();
            if (logoutData.error) throw logoutData.error;
            localStorage.clear();
            sessionStorage.clear();
            console.log('✅ Sesión cerrada');
            window.location.href = '../index.html';
        } catch (error) {
            console.error(' Error cerrando sesión:', error);
            window.location.href = '../index.html';
        }
    });
}

// ========================================
// FUNCIONES DE ESTADÍSTICAS (ACTUALIZADAS)
// ========================================
function calculateStats(fichas) {
    // === Estadísticas Principales ===
    safeUpdate('totalFichas', fichas.length);
    
    // ✅ Conteo robusto para Operativas e Inoperativas
    const operativas = fichas.filter(f => {
        if (!f.estatus_ficha) return false;
        const est = f.estatus_ficha.toString().trim().toUpperCase();
        return est === 'OPERATIVA' || est === 'OPERATIVO';
    }).length;
    
    const inoperativas = fichas.filter(f => {
        if (!f.estatus_ficha) return false;
        const est = f.estatus_ficha.toString().trim().toUpperCase();
        return est === 'INOPERATIVA' || est === 'INOPERATIVO';
    }).length;
    
    safeUpdate('fichasOperativas', operativas);
    safeUpdate('fichasInoperativas', inoperativas);

    // === Tarjetas Resumen ===
    
    // Motos
    safeUpdate('countMoto', fichas.filter(f => 
        f.tipo && f.tipo.toString().trim().toUpperCase() === 'MOTO'
    ).length);
    
    // ✅ Tracción de Sangre
    safeUpdate('countTraccion', fichas.filter(f => {
        if (!f.tipo) return false;
        const tipo = f.tipo.toString().trim().toUpperCase();
        return tipo.includes('TRACCION') || tipo.includes('SANGRE');
    }).length);

    // ✅ Parque Automotor (Suma de Camioneta, Camión, Autobús, Automóvil)
    const parqueAutomotor = fichas.filter(f => {
        if (!f.tipo) return false;
        const tipo = f.tipo.toString().trim().toUpperCase();
        return tipo === 'CAMIONETA' || 
               tipo === 'CAMION' || 
               tipo === 'AUTOBUS' || 
               tipo === 'AUTOMOVIL';
    }).length;
    safeUpdate('countParque', parqueAutomotor);

    // Fotos (opcional, si las mantienes en las tarjetas)
    const conFotos = fichas.filter(f => 
        f.foto1_url || f.foto2_url || f.foto3_url || f.foto4_url
    ).length;
    safeUpdate('countConFotos', conFotos);
}

function safeUpdate(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ========================================
// FUNCIONES DE GRÁFICOS (4 PRINCIPALES)
// ========================================
function renderAllCharts(fichas) {
    renderChartEstatus(fichas);
    renderChartMes(fichas);
    renderChartMotosVehiculos(fichas);  // ✅ NUEVO
    renderChartCausas(fichas);           // ✅ NUEVO
}

function createChart(canvasId, type, dataConfig, optionsConfig) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) {
        console.warn(`⚠️ Canvas ${canvasId} no encontrado`);
        return;
    }
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    charts[canvasId] = new Chart(canvas, {
        type: type,
        data: dataConfig,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 600,
                easing: 'easeOutQuart'
            },
            ...optionsConfig
        }
    });
}

// 📊 1. Estatus de Fichas - Doughnut
function renderChartEstatus(fichas) {
    const counts = {};
    fichas.forEach(f => {
        const key = (f.estatus_ficha || 'SIN_ESTADO').toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
    });
    
    createChart('chartEstatus', 'doughnut', {
        labels: Object.keys(counts),
        datasets: [{
            data: Object.values(counts),
            backgroundColor: ['#2a9d8f', '#e76f51', '#e9c46a', '#264653', '#6c757d'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    }, {
        plugins: {
            legend: {
                position: 'bottom',
                labels: { font: { size: 9 }, padding: 12 }
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${label}: ${value} (${pct}%)`;
                    }
                }
            }
        },
        cutout: '65%'
    });
}

//  2. Fichas por Mes - Line
function renderChartMes(fichas) {
    const counts = {};
    fichas.forEach(f => {
        const fecha = f.fecha_creacion || f.created_at;
        if (fecha) {
            const date = new Date(fecha);
            const mes = date.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
            counts[mes] = (counts[mes] || 0) + 1;
        }
    });
    
    const sorted = Object.entries(counts).sort((a, b) => {
        const dateA = new Date('01 ' + a[0]);
        const dateB = new Date('01 ' + b[0]);
        return dateA - dateB;
    });
    
    createChart('chartMes', 'line', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Fichas',
            data: sorted.map(([,v]) => v),
            borderColor: '#005b96',
            backgroundColor: 'rgba(0, 91, 150, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: '#fff',
            pointBorderColor: '#005b96',
            pointBorderWidth: 2
        }]
    }, {
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => `Fichas: ${ctx.raw}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: { font: { size: 9 } },
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: {
                ticks: { font: { size: 9 } },
                grid: { display: false }
            }
        }
    });
}

// 🏍️ 3. NUEVO: Motos vs Vehículos - Bar comparativo
function renderChartMotosVehiculos(fichas) {
    let motos = 0;
    let vehiculos = 0;
    
    fichas.forEach(f => {
        const tipo = (f.tipo || '').toString().trim().toUpperCase();
        if (tipo === 'MOTO') {
            motos++;
        } else if (['AUTOMOVIL', 'CAMION', 'CAMIONETA', 'AUTOBUS', 'MINIBUS', 'PICKUP', 'TRIMOVIL', 'VAM', 'SPORTWAGON', 'ENDURO', 'MACHITO', 'ESPECIAL', 'BLINDADO'].includes(tipo)) {
            vehiculos++;
        }
    });
    
    createChart('chartMotosVehiculos', 'bar', {
        labels: ['🏍️ Motos', '🚗 Vehículos'],
        datasets: [{
            label: 'Cantidad',
            data: [motos, vehiculos],
            backgroundColor: ['#2a9d8f', '#005b96'],
            borderRadius: 6,
            borderSkipped: false
        }]
    }, {
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => `Total: ${ctx.raw}`
                }
            }
        },
        scales: {
            y: { 
                beginAtZero: true, 
                ticks: { font: { size: 9 } },
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            x: { 
                ticks: { font: { size: 10 } }, 
                grid: { display: false } 
            }
        }
    });
}

// 📋 4. NUEVO: Con Causa vs Sin Causa - Doughnut
function renderChartCausas(fichas) {
    const conCausa = fichas.filter(f => {
        const causa = (f.causa || '').toString().trim();
        // Consideramos "con causa" si tiene texto significativo (>3 caracteres)
        return causa && causa.length > 3;
    }).length;
    
    const sinCausa = fichas.length - conCausa;
    
    createChart('chartCausas', 'doughnut', {
        labels: ['Con Causa', 'Sin Causa'],
        datasets: [{
            data: [conCausa, sinCausa],
            backgroundColor: ['#e76f51', '#2a9d8f'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    }, {
        plugins: {
            legend: { 
                position: 'bottom', 
                labels: { font: { size: 9 }, padding: 12 } 
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        return `${label}: ${value} (${pct}%)`;
                    }
                }
            }
        },
        cutout: '65%'
    });
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================
function showErrorMessage(message) {
    const main = document.querySelector('.dashboard-main');
    if (!main) return;
    main.innerHTML = `
        <div style="text-align:center;padding:40px;max-width:600px;margin:0 auto;">
            <div style="font-size:3rem;margin-bottom:10px;">⚠️</div>
            <div style="color:#dc3545;font-size:1.2rem;font-weight:600;margin-bottom:15px;">
                Error cargando datos
            </div>
            <div style="color:#666;margin-bottom:20px;font-size:0.95rem;">
                ${message}
            </div>
            <details style="text-align:left;font-size:0.85rem;color:#888;margin-bottom:20px;">
                <summary style="cursor:pointer;font-weight:500;">Verificar:</summary>
                <ul style="margin-top:10px;padding-left:20px;">
                    <li>✓ Conexión a internet activa</li>
                    <li>✓ Credenciales de Supabase válidas en config.js</li>
                    <li>✓ Tabla "fichas_tecnicas" existe en Supabase</li>
                    <li>✓ Políticas RLS permiten lectura</li>
                    <li>✓ El usuario tiene permisos para leer la tabla</li>
                </ul>
            </details>
            <button onclick="location.reload()"
                style="padding:10px 24px;background:#003366;color:white;border:none;border-radius:6px;cursor:pointer;font-size:0.9rem;font-weight:500;display:inline-flex;align-items:center;gap:8px;">
                <span>🔄</span> Reintentar
            </button>
        </div>
    `;
    document.querySelectorAll('.stat-value, .summary-value').forEach(el => {
        if (!el.querySelector('.loading')) el.textContent = '-';
    });
}

// ========================================
// FUNCIÓN DE IMPRESIÓN
// ========================================
function imprimirGraficos() {
    console.log('🖨️ Iniciando impresión...');
    if (window.Chart) {
        Object.values(charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }
    setTimeout(() => {
        window.print();
        setTimeout(() => {
            if (window.Chart) {
                Object.values(charts).forEach(chart => {
                    if (chart && chart.resize) {
                        chart.resize();
                    }
                });
            }
        }, 1000);
    }, 500);
}

// ========================================
// FUNCIÓN DE RECARGA MANUAL (DEBUG)
// ========================================
window.refreshFichasData = async function() {
    console.log(' Recargando datos desde Supabase...');
    try {
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .order('fecha_creacion', { ascending: false });
        if (error) throw error;
        globalFichas = data;
        calculateStats(data);
        renderAllCharts(data);
        console.log(`✅ Datos actualizados: ${data.length} fichas`);
        alert(`✅ Datos actualizados: ${data.length} fichas`);
    } catch (err) {
        console.error('❌ Error recargando:', err);
        alert('❌ Error recargando datos: ' + err.message);
    }
};

// ========================================
// FIN DEL MÓDULO
// ========================================
console.log('✅ Módulo ficha-partes.js cargado correctamente');
console.log('📊 4 gráficos disponibles:', Object.keys(charts).length);
