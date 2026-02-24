/**
 * ========================================
 * MÓDULO: Partes Generales (Solo Gráficos)
 * FUENTE: Supabase - Tabla: vehiculos
 * ========================================
 */

// ========================================
// VARIABLES GLOBALES
// ========================================
let globalVehicles = [];
const charts = {}; // Almacena instancias de gráficos para destruir/recrear

// ========================================
// INICIALIZACIÓN PRINCIPAL
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // 1️⃣ Verificar que Supabase esté disponible
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase no está cargado. Verifica que el SDK esté incluido.');
        }

        // 2️⃣ Crear cliente de Supabase
        const supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_KEY
        );

        // 3️⃣ Mostrar email del usuario autenticado
        await mostrarUsuarioAutenticado(supabaseClient);

        // 4️⃣ Configurar botón de cerrar sesión
        configurarCerrarSesion(supabaseClient);

        // 5️⃣ Cargar vehículos desde Supabase
        console.log('🔄 Cargando vehículos desde Supabase...');
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('No se encontraron vehículos en la base de datos');
        }

        console.log(`✅ ${data.length} vehículos cargados`);
        globalVehicles = data;

        // 6️⃣ Calcular y mostrar estadísticas
        calculateStats(data);

        // 7️⃣ Renderizar TODOS los gráficos (9 en total)
        renderAllCharts(data);

    } catch (error) {
        console.error('❌ Error crítico:', error);
        showErrorMessage(error.message);
    }
});

// ========================================
// FUNCIONES DE AUTENTICACIÓN
// ========================================

/**
 * Muestra el email del usuario autenticado en el navbar
 */
async function mostrarUsuarioAutenticado(supabaseClient) {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Error obteniendo sesión:', error);
            return;
        }

        const userEmail = document.getElementById('userEmail');
        
        if (session?.user?.email) {
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
            userEmail.title = 'No hay sesión activa';
            console.log('⚠️ No hay sesión activa');
        }
    } catch (err) {
        console.error('Error mostrando usuario:', err);
    }
}

/**
 * Configura el evento de cerrar sesión
 */
function configurarCerrarSesion(supabaseClient) {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        if (!confirm('¿Estás seguro de que deseas cerrar sesión?')) {
            return;
        }

        try {
            console.log('🔄 Cerrando sesión...');
            
            const { error } = await supabaseClient.auth.signOut();
            
            if (error) throw error;
            
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

function calculateStats(vehicles) {
    safeUpdate('totalVehiculos', vehicles.length);
    
    const motos = vehicles.filter(v => 
        (v.tipo && v.tipo.toUpperCase() === 'MOTO') || 
        (v.clase && v.clase.toUpperCase() === 'MOTO')
    ).length;
    safeUpdate('totalMotos', motos);
    
    const operativos = vehicles.filter(v => v.estatus === 'OPERATIVA').length;
    const inoperativos = vehicles.filter(v => v.estatus === 'INOPERATIVA').length;
    const desincorporados = vehicles.filter(v => v.estatus === 'DESINCORPORADA').length;
    
    safeUpdate('operativos', operativos);
    safeUpdate('inoperativos', inoperativos);
    safeUpdate('desincorporados', desincorporados);
    
    safeUpdate('countMoto', vehicles.filter(v => 
        (v.tipo || v.clase)?.toUpperCase() === 'MOTO'
    ).length);
    safeUpdate('countCamioneta', vehicles.filter(v => v.clase === 'CAMIONETA').length);
    safeUpdate('countAutomovil', vehicles.filter(v => v.clase === 'AUTOMOVIL').length);
    safeUpdate('countCamion', vehicles.filter(v => v.clase === 'CAMION').length);
    safeUpdate('countCCPEM', vehicles.filter(v => 
        v.ubicacion_fisica?.toUpperCase().includes('CCPEM')
    ).length);
    safeUpdate('countDesincorporada', desincorporados);
}

function safeUpdate(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ========================================
// FUNCIONES DE GRÁFICOS (9 EN TOTAL)
// ========================================

/**
 * Renderiza TODOS los gráficos incluyendo Color
 */
function renderAllCharts(vehicles) {
    renderChartEstatus(vehicles);
    renderChartSituacion(vehicles);
    renderChartClase(vehicles);
    renderChartTipo(vehicles);
    renderChartMarcas(vehicles);
    renderChartUbicacion(vehicles);
    renderChartAno(vehicles);
    renderChartUnidad(vehicles);
    renderChartColor(vehicles); // ✅ 9no gráfico - POR COLOR
}

/**
 * Función genérica para crear gráficos Chart.js
 */
function createChart(canvasId, type, dataConfig, optionsConfig) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) {
        console.warn(`⚠️ Canvas ${canvasId} no encontrado o Chart.js no cargado`);
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

// 📊 1. Estado del Parque (estatus) - Doughnut
function renderChartEstatus(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const key = v.estatus || 'SIN_DATO';
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

// 🔧 2. Situación Actual - Bar Horizontal
function renderChartSituacion(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const key = v.situacion || v.estatus || 'SIN_DATO';
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    createChart('chartSituacion', 'bar', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Vehículos',
            data: sorted.map(([,v]) => v),
            backgroundColor: '#005b96',
            borderRadius: 4,
            borderSkipped: false
        }]
    }, {
        indexAxis: 'y',
        plugins: { 
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: ctx => `Cantidad: ${ctx.raw}`
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

// 🚗 3. Distribución por Clase - Pie
function renderChartClase(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const key = v.clase || 'SIN_CLASE';
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

// 🏁 4. Distribución por Tipo - Bar
function renderChartTipo(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const key = (v.tipo || v.clase || 'SIN_TIPO').toUpperCase();
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

// 🏷️ 5. Marcas Más Comunes - Horizontal Bar (Top 10)
function renderChartMarcas(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const key = (v.marca || 'SIN_MARCA').toUpperCase().trim();
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

// 📍 6. Ubicación Física - Doughnut (Agrupado)
function renderChartUbicacion(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        let key = 'OTROS';
        const ubi = (v.ubicacion_fisica || '').toUpperCase();
        
        if (ubi.includes('CCPEM')) key = 'CCPEM';
        else if (ubi.includes('DESTACAMENTO 71')) key = 'Dest. 71';
        else if (ubi.includes('RESGUARDO')) key = 'Resguardo';
        else if (ubi.includes('BRIGADA') || ubi.includes('BRIM')) key = 'BRIM';
        else if (ubi.includes('ESTACION')) key = 'Estación';
        else if (ubi.includes('SEDE')) key = 'Sede';
        else if (ubi.includes('ARTILLEROS') || ubi.includes('ASTIMARCAS')) key = 'Astimarcas';
        else if (ubi.includes('KM 18')) key = 'KM 18';
        else if (ubi.includes('MUELLE')) key = 'Muelle';
        
        counts[key] = (counts[key] || 0) + 1;
    });
    
    createChart('chartUbicacion', 'doughnut', {
        labels: Object.keys(counts),
        datasets: [{
            data: Object.values(counts),
            backgroundColor: ['#003366', '#005b96', '#e9c46a', '#2a9d8f', '#e76f51', '#6c757d', '#adb5bd', '#ced4da', '#dee2e6'],
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
        },
        cutout: '60%'
    });
}

// 📅 7. Vehículos por Año - Line
function renderChartAno(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const ano = v.ano || 'S/D';
        counts[ano] = (counts[ano] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a, b) => {
        const na = parseInt(a[0]), nb = parseInt(b[0]);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        if (!isNaN(na)) return -1;
        if (!isNaN(nb)) return 1;
        return a[0].localeCompare(b[0]);
    });
    
    createChart('chartAno', 'line', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Vehículos',
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
                    label: ctx => `Año ${ctx.label}: ${ctx.raw} vehículos`
                }
            }
        },
        scales: {
            y: { 
                beginAtZero: true, 
                ticks: { font: { size: 9 }, stepSize: 50 },
                grid: { color: 'rgba(0,0,0,0.05)' },
                title: { display: true, text: 'Cantidad', font: { size: 10 } }
            },
            x: { 
                ticks: { font: { size: 9 } },
                grid: { display: false },
                title: { display: true, text: 'Año', font: { size: 10 } }
            }
        }
    });
}

// 🏢 8. Unidad Administrativa - Bar Horizontal (Top 8)
function renderChartUnidad(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        let key = (v.unidad_administrativa || 'SIN_UNIDAD').trim();
        
        const keyUpper = key.toUpperCase();
        if (keyUpper.includes('BRIGADA MOTORIZADA')) key = 'BRIM';
        else if (keyUpper.includes('ESTACION PARROQUIAL')) key = 'Est. Parroquial';
        else if (keyUpper.includes('ESTACION MUNICIPAL')) key = 'Est. Municipal';
        else if (keyUpper.includes('ESTACION POLICIAL')) key = 'Est. Policial';
        else if (keyUpper.includes('COORDINADOR')) key = 'Coordinación';
        else if (keyUpper.includes('ORDEN PUBLICO') || keyUpper.includes('CRPM')) key = 'Orden Público';
        else if (keyUpper.includes('POLICIA JUDICIAL')) key = 'Policía Judicial';
        else if (keyUpper.includes('POLICIA MARITIMA')) key = 'Policía Marítima';
        else if (keyUpper.includes('POLICIA RURAL')) key = 'Policía Rural';
        else if (keyUpper.includes('POLICIA TURISTICA')) key = 'Policía Turística';
        else if (keyUpper === 'OCCIDENTAL' || keyUpper === 'CENTRAL') key = keyUpper;
        
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    createChart('chartUnidad', 'bar', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Vehículos',
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
                ticks: { font: { size: 8 } },
                grid: { display: false }
            }
        }
    });
}

// 🎨 9. Color de Vehículos - Pie (TOP 8 + Otros)
function renderChartColor(vehicles) {
    console.log('🎨 Renderizando gráfico de Color...');
    
    const counts = {};
    vehicles.forEach(v => {
        let color = (v.color || '').toUpperCase().trim();
        
        // Si está vacío o es inválido, usar "SIN_DATO"
        if (!color || color === 'SIN_COLOR' || color === 'N/A' || color.length < 2) {
            color = 'SIN_DATO';
        }
        
        // Agrupar colores similares
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
    
    console.log('📊 Datos de color:', counts);
    
    // Ordenar y tomar top 7 + "Otros"
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const topColors = sorted.slice(0, 7);
    const others = sorted.slice(7);
    
    const labels = topColors.map(([k]) => k);
    const dataValues = topColors.map(([,v]) => v);
    
    if (others.length > 0) {
        labels.push('Otros');
        dataValues.push(others.reduce((sum, [,v]) => sum + v, 0));
    }
    
    // Verificar canvas
    const canvas = document.getElementById('chartColor');
    if (!canvas) {
        console.error('❌ Canvas chartColor no encontrado en el HTML');
        return;
    }
    
    if (labels.length === 0 || dataValues.every(v => v === 0)) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '14px Roboto';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('Sin datos de color disponibles', canvas.width/2, canvas.height/2);
        console.warn('⚠️ No hay datos de color para mostrar');
        return;
    }
    
    // Paleta de colores realista
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
    
    // Destruir instancia previa
    if (charts.chartColor) {
        charts.chartColor.destroy();
    }
    
    // Crear gráfico
    charts.chartColor = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'bottom', 
                    labels: { 
                        font: { size: 8 },
                        padding: 8,
                        generateLabels: function(chart) {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                                    return {
                                        text: `${label}: ${value} (${pct}%)`,
                                        fillStyle: backgroundColors[i],
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
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
        }
    });
    
    console.log('✅ Gráfico de Color renderizado exitosamente');
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
                    <li>✓ Tabla "vehiculos" existe en Supabase</li>
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
    
    document.querySelectorAll('.stat-value, .summary-value, .partes-stat-value').forEach(el => {
        if (!el.querySelector('.loading')) el.textContent = '-';
    });
}

// ========================================
// FUNCIÓN DE RECARGA MANUAL (DEBUG)
// ========================================

window.refreshPartesData = async function() {
    console.log('🔄 Recargando datos desde Supabase...');
    try {
        const supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_KEY
        );
        
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        globalVehicles = data;
        calculateStats(data);
        renderAllCharts(data);
        
        console.log(`✅ Datos actualizados: ${data.length} vehículos`);
        alert(`✅ Datos actualizados: ${data.length} vehículos`);
        
    } catch (err) {
        console.error('❌ Error recargando:', err);
        alert('❌ Error recargando datos:\n' + err.message);
    }
};
/**
 * Imprime los gráficos optimizados para tamaño carta
 */
function imprimirGraficos() {
    console.log('🖨️ Iniciando impresión (Tamaño Carta)...');
    
    // 1. Forzar redimensionamiento de gráficos antes de imprimir
    if (window.Chart) {
        Object.values(charts).forEach(chart => {
            if (chart && chart.resize) {
                chart.resize();
            }
        });
    }
    
    // 2. Esperar renderizado y ejecutar impresión
    setTimeout(() => {
        // 3. Abrir diálogo de impresión
        window.print();
        
        // 4. Restaurar gráficos después de imprimir
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
// FIN DEL MÓDULO
// ========================================
console.log('✅ Módulo Partes Generales cargado correctamente');
console.log('📊 9 gráficos disponibles:', Object.keys(charts).length);
