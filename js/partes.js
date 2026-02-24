/**
 * ========================================
 * MÓDULO: Partes Generales (Solo Gráficos)
 * FUENTE: Supabase - Tabla: vehiculos
 * ========================================
 */

let globalVehicles = [];
const charts = {};

document.addEventListener('DOMContentLoaded', async function() {
    try {
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase no está cargado');
        }
        
        const supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_KEY
        );
        
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
        
        calculateStats(data);
        renderAllCharts(data);
        
    } catch (error) {
        console.error('❌ Error crítico:', error);
        showErrorMessage(error.message);
    }
});

function showErrorMessage(message) {
    const main = document.querySelector('.dashboard-main');
    if (main) {
        main.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <div style="color:#dc3545;font-size:1.2rem;margin-bottom:15px;">❌ Error cargando datos</div>
                <div style="color:#666;margin-bottom:20px;">${message}</div>
                <button onclick="location.reload()" style="padding:10px 20px;background:#003366;color:white;border:none;border-radius:6px;cursor:pointer;">🔄 Reintentar</button>
            </div>
        `;
    }
}

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
    
    safeUpdate('countMoto', vehicles.filter(v => (v.tipo || v.clase)?.toUpperCase() === 'MOTO').length);
    safeUpdate('countCamioneta', vehicles.filter(v => v.clase === 'CAMIONETA').length);
    safeUpdate('countAutomovil', vehicles.filter(v => v.clase === 'AUTOMOVIL').length);
    safeUpdate('countCamion', vehicles.filter(v => v.clase === 'CAMION').length);
    safeUpdate('countCCPEM', vehicles.filter(v => v.ubicacion_fisica?.toUpperCase().includes('CCPEM')).length);
    safeUpdate('countDesincorporada', desincorporados);
}

function safeUpdate(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function renderAllCharts(vehicles) {
    renderChartEstatus(vehicles);
    renderChartSituacion(vehicles);
    renderChartClase(vehicles);
    renderChartTipo(vehicles);
    renderChartMarcas(vehicles);
    renderChartUbicacion(vehicles);
    renderChartAno(vehicles);
    renderChartUnidad(vehicles);
    renderChartColor(vehicles); // ✅ Nuevo gráfico de color
}

// 📊 1. Estado (estatus) - Doughnut
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
            legend: { position: 'bottom', labels: { font: { size: 8 } } },
            tooltip: {
                callbacks: {
                    label: ctx => `${ctx.label}: ${ctx.raw} (${((ctx.raw/vehicles.length)*100).toFixed(1)}%)`
                }
            }
        },
        cutout: '65%'
    });
}

// 🔧 2. Situación - Bar Horizontal
function renderChartSituacion(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const key = v.situacion || v.estatus || 'SIN_DATO';
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 8);
    
    createChart('chartSituacion', 'bar', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Vehículos',
            data: sorted.map(([,v]) => v),
            backgroundColor: '#005b96',
            borderRadius: 4
        }]
    }, {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, ticks: { font: { size: 8 } } },
            y: { ticks: { font: { size: 8 } } }
        }
    });
}

// 🚗 3. Clase - Pie
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
            legend: { position: 'bottom', labels: { font: { size: 8 } } }
        }
    });
}

// 🏁 4. Tipo - Bar
function renderChartTipo(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const key = v.tipo || v.clase || 'SIN_TIPO';
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
    
    createChart('chartTipo', 'bar', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Cantidad',
            data: sorted.map(([,v]) => v),
            backgroundColor: ['#e76f51', '#f4a261', '#e9c46a', '#2a9d8f', '#264653'],
            borderRadius: 4
        }]
    }, {
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, ticks: { font: { size: 8 } } },
            x: { ticks: { font: { size: 7 }, maxRotation: 45, minRotation: 45 } }
        }
    });
}

// 🏷️ 5. Marcas - Horizontal Bar (Top 10)
function renderChartMarcas(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const key = v.marca?.toUpperCase() || 'SIN_MARCA';
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10);
    
    createChart('chartMarcas', 'bar', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Vehículos',
            data: sorted.map(([,v]) => v),
            backgroundColor: '#2a9d8f',
            borderRadius: 4
        }]
    }, {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, ticks: { font: { size: 8 } } },
            y: { ticks: { font: { size: 8 } } }
        }
    });
}

// 📍 6. Ubicación Física - Doughnut
function renderChartUbicacion(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        let key = 'OTROS';
        const ubi = v.ubicacion_fisica?.toUpperCase() || '';
        if (ubi.includes('CCPEM')) key = 'CCPEM';
        else if (ubi.includes('DESTACAMENTO 71')) key = 'Dest. 71';
        else if (ubi.includes('RESGUARDO')) key = 'Resguardo';
        else if (ubi.includes('BRIGADA') || ubi.includes('BRIM')) key = 'BRIM';
        else if (ubi.includes('ESTACION')) key = 'Estación';
        else if (ubi.includes('SEDE')) key = 'Sede';
        
        counts[key] = (counts[key] || 0) + 1;
    });
    
    createChart('chartUbicacion', 'doughnut', {
        labels: Object.keys(counts),
        datasets: [{
            data: Object.values(counts),
            backgroundColor: ['#003366', '#005b96', '#e9c46a', '#2a9d8f', '#e76f51', '#6c757d', '#adb5bd'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    }, {
        plugins: { legend: { position: 'bottom', labels: { font: { size: 8 } } } },
        cutout: '60%'
    });
}

// 📅 7. Año de Fabricación - Line
function renderChartAno(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const ano = v.ano || 'S/D';
        counts[ano] = (counts[ano] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a, b) => {
        const na = parseInt(a[0]), nb = parseInt(b[0]);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
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
            pointHoverRadius: 5
        }]
    }, {
        plugins: { legend: { display: false } },
        scales: {
            y: { beginAtZero: true, ticks: { font: { size: 8 } } },
            x: { ticks: { font: { size: 8 } } }
        }
    });
}

// 🏢 8. Unidad Administrativa - Bar Horizontal
function renderChartUnidad(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        let key = v.unidad_administrativa || 'SIN_UNIDAD';
        if (key.toUpperCase().includes('BRIGADA MOTORIZADA')) key = 'BRIM';
        else if (key.toUpperCase().includes('ESTACION PARROQUIAL')) key = 'Est. Parroquial';
        else if (key.toUpperCase().includes('ESTACION MUNICIPAL')) key = 'Est. Municipal';
        
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 8);
    
    createChart('chartUnidad', 'bar', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            label: 'Vehículos',
            data: sorted.map(([,v]) => v),
            backgroundColor: '#e9c46a',
            borderRadius: 4
        }]
    }, {
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
            x: { beginAtZero: true, ticks: { font: { size: 8 } } },
            y: { ticks: { font: { size: 7 } } }
        }
    });
}

// 🎨 9. Color de Vehículos - Pie (NUEVO)
function renderChartColor(vehicles) {
    const counts = {};
    vehicles.forEach(v => {
        const key = v.color?.toUpperCase().trim() || 'SIN_COLOR';
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 8);
    
    createChart('chartColor', 'pie', {
        labels: sorted.map(([k]) => k),
        datasets: [{
            data: sorted.map(([,v]) => v),
            backgroundColor: ['#ffffff', '#000000', '#c0c0c0', '#e76f51', '#2a9d8f', '#005b96', '#e9c46a', '#6c757d'],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    }, {
        plugins: {
            legend: { position: 'bottom', labels: { font: { size: 8 } } }
        }
    });
}

/**
 * Función genérica para crear gráficos
 */
function createChart(canvasId, type, dataConfig, optionsConfig) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    charts[canvasId] = new Chart(canvas, {
        type,
        data: dataConfig,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: 'easeOutQuart' },
            ...optionsConfig
        }
    });
}

/**
 * 🔁 Recargar datos manualmente
 */
window.refreshPartesData = async function() {
    console.log('🔄 Recargando datos...');
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
        console.log('✅ Datos actualizados');
    } catch (err) {
        console.error('❌ Error:', err);
        alert('Error recargando: ' + err.message);
    }
};
