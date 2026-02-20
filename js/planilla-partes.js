// ================= CONFIGURACIÓN =================
let currentUser = null;
let allVehiclesData = [];
let charts = {};
let supabaseClient = null;

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', async () => {
    await initializeSupabase();
    await checkAuth();
    await loadVehicleData();
});

async function initializeSupabase() {
    if (typeof window.supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY) {
        supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_KEY
        );
    } else {
        console.error('❌ Supabase no está configurado correctamente');
        showAlert('error', 'Error de configuración de base de datos');
    }
}

async function checkAuth() {
    if (!supabaseClient) {
        console.error('❌ Cliente de Supabase no inicializado');
        return;
    }
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    currentUser = session.user;
    document.getElementById('userEmail').textContent = currentUser.email;
}

// ================= CARGAR DATOS =================
async function loadVehicleData() {
    showLoading();
    
    if (!supabaseClient) {
        hideLoading();
        showAlert('error', 'Cliente de Supabase no inicializado');
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allVehiclesData = data || [];
        hideLoading();
        updateMetrics();
        createCharts();
    } catch (error) {
        console.error('Error:', error);
        hideLoading();
        showAlert('error', 'Error al cargar los datos: ' + error.message);
    }
}

function showLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'none';
}

function showAlert(type, message) {
    const alertEl = document.getElementById('alertError');
    const messageEl = document.getElementById('errorMessage');
    if (alertEl && messageEl) {
        messageEl.textContent = message;
        alertEl.style.display = 'flex';
        setTimeout(() => {
            alertEl.style.display = 'none';
        }, 5000);
    }
}

// ================= ACTUALIZAR MÉTRICAS =================
function updateMetrics() {
    const data = allVehiclesData;
    
    const total = data.length;
    const operativos = data.filter(v => v.estatus === 'OPERATIVA').length;
    const inoperativos = data.filter(v => 
        v.estatus === 'INOPERATIVA' || v.situacion === 'REPARACION' || v.situacion === 'TALLER'
    ).length;
    const reparacion = data.filter(v => 
        v.situacion === 'REPARACION' || v.situacion === 'TALLER'
    ).length;
    const desincorporados = data.filter(v => v.estatus === 'DESINCORPORADA').length;

    document.getElementById('totalVehiculos').textContent = total.toLocaleString();
    document.getElementById('totalOperativos').textContent = operativos.toLocaleString();
    document.getElementById('totalInoperativos').textContent = inoperativos.toLocaleString();
    document.getElementById('totalReparacion').textContent = reparacion.toLocaleString();
    document.getElementById('totalDesincorporados').textContent = desincorporados.toLocaleString();
}

// ================= CREAR GRÁFICOS =================
function createCharts() {
    createEstatusChart();
    createTipoChart();
    createMarcasChart();
    createAnoChart();
    createUnidadesChart();
}

// ================= GRÁFICO 1: ESTATUS (BARRA) =================
function createEstatusChart() {
    const ctx = document.getElementById('chartEstatus');
    if (!ctx) return;
    
    const data = allVehiclesData;
    const statusCounts = countByField(data, 'estatus');

    charts.estatus = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                label: 'Cantidad',
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#2a9d8f', // OPERATIVA
                    '#e76f51', // INOPERATIVA
                    '#6c757d'  // DESINCORPORADA
                ],
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// ================= GRÁFICO 2: TIPO (BARRA) =================
function createTipoChart() {
    const ctx = document.getElementById('chartTipo');
    if (!ctx) return;
    
    const data = allVehiclesData;
    const tipoCounts = countByField(data, 'tipo');
    const sorted = sortObjectByValue(tipoCounts);

    charts.tipo = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(sorted),
            datasets: [{
                label: 'Cantidad',
                data: Object.values(sorted),
                backgroundColor: '#005b96',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

// ================= GRÁFICO 3: MARCAS (BARRA HORIZONTAL) =================
function createMarcasChart() {
    const ctx = document.getElementById('chartMarcas');
    if (!ctx) return;
    
    const data = allVehiclesData;
    const marcaCounts = countByField(data, 'marca');
    const top10 = getTopN(markaCounts, 10);

    charts.marcas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(top10),
            datasets: [{
                label: 'Vehículos',
                data: Object.values(top10),
                backgroundColor: '#2a9d8f',
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

// ================= GRÁFICO 4: AÑO (BARRA) =================
function createAnoChart() {
    const ctx = document.getElementById('chartAno');
    if (!ctx) return;
    
    const data = allVehiclesData;
    const anoCounts = countByField(data, 'ano');
    const sorted = sortObjectByKey(anoCounts);

    charts.ano = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(sorted),
            datasets: [{
                label: 'Vehículos',
                data: Object.values(sorted),
                backgroundColor: '#e9c46a',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ================= GRÁFICO 5: UNIDADES (BARRA HORIZONTAL) =================
function createUnidadesChart() {
    const ctx = document.getElementById('chartUnidades');
    if (!ctx) return;
    
    const data = allVehiclesData;
    const unidadCounts = countByField(data, 'unidad_administrativa');
    const top15 = getTopN(unidadCounts, 15);

    charts.unidades = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(top15),
            datasets: [{
                label: 'Vehículos',
                data: Object.values(top15),
                backgroundColor: '#e76f51',
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true }
            }
        }
    });
}

// ================= UTILIDADES =================
function countByField(data, field) {
    return data.reduce((acc, item) => {
        const value = item[field] || 'SIN DATO';
        acc[value] = (acc[value] || 0) + 1;
        return acc;
    }, {});
}

function sortObjectByValue(obj) {
    return Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
}

function sortObjectByKey(obj) {
    return Object.entries(obj)
        .sort((a, b) => a[0] - b[0])
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
}

function getTopN(obj, n) {
    return Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {});
}

// ================= ACCIONES =================
function refreshData() {
    showLoading();
    loadVehicleData();
}

function exportReport() {
    const data = allVehiclesData;
    if (!data || data.length === 0) {
        showAlert('error', 'No hay datos para exportar');
        return;
    }
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(e => Object.values(e).join(',')).join('\n');
    const csvContent = 'text/csv;charset=utf-8,' + headers + '\n' + rows;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'reporte_vehiculos_' + new Date().toISOString().split('T')[0] + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function handleLogout() {
    if (supabaseClient) {
        await supabaseClient.auth.signOut();
    }
    window.location.href = '../login.html';
}

document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
