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
        // 1️⃣ Verificar que Supabase esté disponible
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

        // 5️⃣ Cargar fichas desde Supabase
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

        // 7️⃣ Renderizar todos los gráficos (9 en total)
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
            console.error('❌ Error cerrando sesión:', error);
            window.location.href = '../index.html';
        }
    });
}

// ========================================
// FUNCIONES DE ESTADÍSTICAS
// ========================================

function calculateStats(fichas) {
    // === Estadísticas Principales ===
    safeUpdate('totalFichas', fichas.length);
    
    const operativas = fichas.filter(f => 
        f.estatus_ficha && f.estatus_ficha.toUpperCase() === 'OPERATIVA'
    ).length;
    const inoperativas = fichas.filter(f => 
        f.estatus_ficha && f.estatus_ficha.toUpperCase() === 'INOPERATIVA'
    ).length;
    const desincorporadas = fichas.filter(f => 
        f.estatus_ficha && f.estatus_ficha.toUpperCase() === 'DESINCORPORADA'
    ).length;
    
    safeUpdate('fichasOperativas', operativas);
    safeUpdate('fichasInoperativas', inoperativas);
    safeUpdate('fichasDesincorporadas', desincorporadas);

    // === Tarjetas Resumen ===
    safeUpdate('countMoto', fichas.filter(f => 
        f.tipo && f.tipo.toUpperCase() === 'MOTO'
    ).length);
    safeUpdate('countCamioneta', fichas.filter(f => 
        f.tipo && f.tipo.toUpperCase() === 'CAMIONETA'
    ).length);
    safeUpdate('countAutomovil', fichas.filter(f => 
        f.tipo && f.tipo.toUpperCase() === 'AUTOMOVIL'
    ).length);
    safeUpdate('countCamion', fichas.filter(f => 
        f.tipo && f.tipo.toUpperCase() === 'CAMION'
    ).length);

    const conFotos = fichas.filter(f => 
        f.foto1_url || f.foto2_url || f.foto3_url || f.foto4_url
    ).length;
    safeUpdate('countConFotos', conFotos);
    safeUpdate('countSinFotos', fichas.length - conFotos);
}

function safeUpdate(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ========================================
// FUNCIONES DE GRÁFICOS
// ========================================

function renderAllCharts(fichas) {
    renderChartEstatus(fichas);
    renderChartTipo(fichas);
    renderChartClase(fichas);
    renderChartMarcas(fichas);
    renderChartDependencia(fichas);
    renderChartColor(fichas);
    renderChartMes(fichas);
    renderChartFotos(fichas);
    renderChartMecanico(fichas);
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

// 🚗 2. Por Tipo de Vehículo - Bar
function renderChartTipo(fichas) {
    const counts = {};
    fichas.forEach(f => {
        const key = (f.tipo || 'SIN_TIPO').toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    createChart('chartTipo', 'bar', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Cantidad',
            data: sorted.map(([,v]) => v),
            backgroundColor: ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#264653'],
            borderRadius: 4,
            borderSkipped: false
        }]
    }, {
        plugins: { 
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => `Cantidad: ${ctx.raw}`
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
                ticks: { font: { size: 8 }, maxRotation: 45, minRotation: 45 },
                grid: { display: false }
            }
        }
    });
}

// 🏁 3. Por Clase - Pie
function renderChartClase(fichas) {
    const counts = {};
    fichas.forEach(f => {
        const key = (f.clase || 'SIN_CLASE').toUpperCase();
        counts[key] = (counts[key] || 0) + 1;
    });
    
    createChart('chartClase', 'pie', {
        labels: Object.keys(counts),
        datasets: [{
            data: Object.values(counts),
            backgroundColor: ['#003366', '#005b96', '#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    }, {
        plugins: {
            legend: { 
                position: 'bottom', 
                labels: { font: { size: 9 }, padding: 10 } 
            },
            tooltip: {
                callbacks: {
                    label: ctx => `${ctx.label}: ${ctx.raw}`
                }
            }
        }
    });
}

// 🏷️ 4. Marcas Top 10 - Horizontal Bar
function renderChartMarcas(fichas) {
    const counts = {};
    fichas.forEach(f => {
        const key = (f.marca || 'SIN_MARCA').toUpperCase().trim();
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    createChart('chartMarcas', 'bar', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Vehículos',
            data: sorted.map(([,v]) => v),
            backgroundColor: '#2a9d8f',
            borderRadius: 4,
            borderSkipped: false
        }]
    }, {
        indexAxis: 'y',
        plugins: { 
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => `Vehículos: ${ctx.raw}`
                }
            }
        },
        scales: {
            x: { 
                beginAtZero: true, 
                ticks: { font: { size: 9 } },
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            y: { 
                ticks: { font: { size: 9 } },
                grid: { display: false }
            }
        }
    });
}

// 🏢 5. Por Dependencia - Bar Horizontal (Top 8)
function renderChartDependencia(fichas) {
    const counts = {};
    fichas.forEach(f => {
        let key = (f.dependencia || 'SIN_DEPENDENCIA').trim();
        const keyUpper = key.toUpperCase();
        
        if (keyUpper.includes('BRIGADA MOTORIZADA')) key = 'BRIM';
        else if (keyUpper.includes('ESTACION PARROQUIAL')) key = 'Est. Parroquial';
        else if (keyUpper.includes('ESTACION MUNICIPAL')) key = 'Est. Municipal';
        else if (keyUpper.includes('ESTACION POLICIAL')) key = 'Est. Policial';
        else if (keyUpper.includes('ORDEN PUBLICO') || keyUpper.includes('CRPM')) key = 'Orden Público';
        else if (keyUpper.includes('POLICIA JUDICIAL')) key = 'Policía Judicial';
        else if (keyUpper.includes('POLICIA MARITIMA')) key = 'Policía Marítima';
        else if (keyUpper.includes('POLICIA RURAL')) key = 'Policía Rural';
        else if (keyUpper.includes('POLICIA TURISTICA')) key = 'Policía Turística';
        
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    createChart('chartDependencia', 'bar', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Fichas',
            data: sorted.map(([,v]) => v),
            backgroundColor: '#e9c46a',
            borderRadius: 4,
            borderSkipped: false
        }]
    }, {
        indexAxis: 'y',
        plugins: { 
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => `Fichas: ${ctx.raw}`
                }
            }
        },
        scales: {
            x: { 
                beginAtZero: true, 
                ticks: { font: { size: 9 } },
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            y: { 
                ticks: { font: { size: 8 } },
                grid: { display: false }
            }
        }
    });
}

// 🎨 6. Por Color - Pie (Top 8 + Otros)
function renderChartColor(fichas) {
    const counts = {};
    fichas.forEach(f => {
        let color = (f.color || '').toUpperCase().trim();
        
        if (!color || color === 'SIN_COLOR' || color.length < 2) {
            color = 'SIN_DATO';
        }
        
        if (color.includes('NEGRO')) color = 'NEGRO';
        else if (color.includes('BLANCO')) color = 'BLANCO';
        else if (color.includes('GRIS') || color.includes('SILVER') || color.includes('PLATA')) color = 'GRIS';
        else if (color.includes('ROJO') || color.includes('BURDEOS') || color.includes('VINOTINTO')) color = 'ROJO';
        else if (color.includes('AZUL') || color.includes('CELESTE')) color = 'AZUL';
        else if (color.includes('VERDE')) color = 'VERDE';
        else if (color.includes('AMARILLO') || color.includes('DORADO')) color = 'AMARILLO';
        else if (color.includes('NARANJA')) color = 'NARANJA';
        else if (color.includes('BEIGE') || color.includes('CREMA')) color = 'BEIGE';
        
        counts[color] = (counts[color] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topColors = sorted.slice(0, 7);
    const others = sorted.slice(7);
    
    const labels = topColors.map(([k]) => k);
    const dataValues = topColors.map(([,v]) => v);
    
    if (others.length > 0) {
        labels.push('Otros');
        dataValues.push(others.reduce((sum, [,v]) => sum + v, 0));
    }
    
    const colorMap = {
        'NEGRO': '#1a1a1a',
        'BLANCO': '#f8f9fa',
        'GRIS': '#6c757d',
        'ROJO': '#dc3545',
        'AZUL': '#0d6efd',
        'VERDE': '#198754',
        'AMARILLO': '#ffc107',
        'NARANJA': '#fd7e14',
        'BEIGE': '#d4b896',
        'SIN_DATO': '#adb5bd',
        'Otros': '#6c757d'
    };
    
    const backgroundColors = labels.map(label => colorMap[label] || '#6c757d');
    
    createChart('chartColor', 'pie', {
        labels: labels,
        datasets: [{
            data: dataValues,
            backgroundColor: backgroundColors,
            borderWidth: 2,
            borderColor: '#fff'
        }]
    }, {
        plugins: {
            legend: { 
                position: 'bottom', 
                labels: { 
                    font: { size: 8 },
                    padding: 8
                } 
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
        }
    });
}

// 📅 7. Fichas por Mes - Line
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

// 📸 8. Con/Sin Fotos - Doughnut
function renderChartFotos(fichas) {
    const conFotos = fichas.filter(f => 
        f.foto1_url || f.foto2_url || f.foto3_url || f.foto4_url
    ).length;
    const sinFotos = fichas.length - conFotos;
    
    createChart('chartFotos', 'doughnut', {
        labels: ['Con Fotos', 'Sin Fotos'],
        datasets: [{
            data: [conFotos, sinFotos],
            backgroundColor: ['#2a9d8f', '#e76f51'],
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

// 📋 9. Estado Mecánico - Bar Horizontal
function renderChartMecanico(fichas) {
    const counts = {
        'Con Causa': 0,
        'Sin Causa': 0
    };
    
    fichas.forEach(f => {
        if (f.causa && f.causa.trim().length > 5) {
            counts['Con Causa']++;
        } else {
            counts['Sin Causa']++;
        }
    });
    
    createChart('chartMecanico', 'bar', {
        labels: Object.keys(counts),
        datasets: [{
            label: 'Fichas',
            data: Object.values(counts),
            backgroundColor: ['#2a9d8f', '#e9c46a'],
            borderRadius: 4,
            borderSkipped: false
        }]
    }, {
        indexAxis: 'y',
        plugins: { 
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => `Fichas: ${ctx.raw}`
                }
            }
        },
        scales: {
            x: { 
                beginAtZero: true, 
                ticks: { font: { size: 9 } },
                grid: { color: 'rgba(0,0,0,0.05)' }
            },
            y: { 
                ticks: { font: { size: 9 } },
                grid: { display: false }
            }
        }
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
    console.log('🔄 Recargando datos desde Supabase...');
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
        alert('❌ Error recargando datos:\n' + err.message);
    }
};

// ========================================
// FIN DEL MÓDULO
// ========================================
console.log('✅ Módulo ficha-partes.js cargado correctamente');
console.log('📊 9 gráficos disponibles:', Object.keys(charts).length);
