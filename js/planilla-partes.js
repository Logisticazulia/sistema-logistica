// ================= CONFIGURACIÓN =================
let supabase;
let currentUser = null;
let allVehiclesData = [];
let charts = {};

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', async () => {
    await initializeSupabase();
    await checkAuth();
    await loadVehicleData();
});

async function initializeSupabase() {
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_ANON_KEY
        );
    }
}

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '../login.html';
        return;
    }
    currentUser = session.user;
    document.getElementById('userEmail').textContent = currentUser.email;
}

// ================= CARGAR DATOS =================
async function loadVehicleData() {
    try {
        const { data, error } = await supabase
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
        showError('Error al cargar los datos: ' + error.message);
        hideLoading();
    }
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function showError(message) {
    const alertEl = document.getElementById('alertError');
    document.getElementById('errorMessage').textContent = message;
    alertEl.style.display = 'flex';
    setTimeout(() => {
        alertEl.style.display = 'none';
    }, 5000);
}

// ================= ACTUALIZAR MÉTRICAS =================
function updateMetrics() {
    const filteredData = getFilteredData();
    
    const total = filteredData.length;
    const operativos = filteredData.filter(v => v.estatus === 'OPERATIVA').length;
    const inoperativos = filteredData.filter(v => 
        v.estatus === 'INOPERATIVA' || v.situacion === 'REPARACION' || v.situacion === 'TALLER'
    ).length;
    const reparacion = filteredData.filter(v => 
        v.situacion === 'REPARACION' || v.situacion === 'TALLER'
    ).length;
    const desincorporados = filteredData.filter(v => v.estatus === 'DESINCORPORADA').length;

    document.getElementById('totalVehiculos').textContent = total.toLocaleString();
    document.getElementById('totalOperativos').textContent = operativos.toLocaleString();
    document.getElementById('totalInoperativos').textContent = inoperativos.toLocaleString();
    document.getElementById('totalReparacion').textContent = reparacion.toLocaleString();
}

// ================= FILTROS =================
function getFilteredData() {
    let data = [...allVehiclesData];
    
    const redip = document.getElementById('filterRedip').value;
    const ccpe = document.getElementById('filterCcpe').value;
    const estatus = document.getElementById('filterEstatus').value;
    const tipo = document.getElementById('filterTipo').value;

    if (redip) data = data.filter(v => v.redip === redip);
    if (ccpe) data = data.filter(v => v.ccpe === ccpe);
    if (estatus) data = data.filter(v => v.estatus === estatus);
    if (tipo) data = data.filter(v => v.tipo === tipo);

    return data;
}

function applyFilters() {
    updateMetrics();
    updateCharts();
}

// ================= CREAR GRÁFICOS =================
function createCharts() {
    createEstatusChart();
    createTipoChart();
    createMarcasChart();
    createAnoChart();
    createUnidadesChart();
}

function updateCharts() {
    const data = getFilteredData();
    updateEstatusChart(data);
    updateTipoChart(data);
    updateMarcasChart(data);
    updateAnoChart(data);
    updateUnidadesChart(data);
}

// ================= GRÁFICO 1: ESTATUS =================
function createEstatusChart() {
    const ctx = document.getElementById('chartEstatus').getContext('2d');
    const data = getFilteredData();
    const statusCounts = countByField(data, 'estatus');

    charts.estatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: [
                    '#2a9d8f', // OPERATIVA
                    '#e76f51', // INOPERATIVA
                    '#e9c46a', // REPARACION
                    '#6c757d', // DESINCORPORADA
                    '#005b96'  // OTROS
                ],
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
                    labels: { padding: 15, font: { size: 11 } }
                }
            }
        }
    });
}

function updateEstatusChart(data) {
    const statusCounts = countByField(data, 'estatus');
    charts.estatus.data.labels = Object.keys(statusCounts);
    charts.estatus.data.datasets[0].data = Object.values(statusCounts);
    charts.estatus.update();
}

// ================= GRÁFICO 2: TIPO =================
function createTipoChart() {
    const ctx = document.getElementById('chartTipo').getContext('2d');
    const data = getFilteredData();
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

function updateTipoChart(data) {
    const tipoCounts = countByField(data, 'tipo');
    const sorted = sortObjectByValue(tipoCounts);
    charts.tipo.data.labels = Object.keys(sorted);
    charts.tipo.data.datasets[0].data = Object.values(sorted);
    charts.tipo.update();
}

// ================= GRÁFICO 3: MARCAS =================
function createMarcasChart() {
    const ctx = document.getElementById('chartMarcas').getContext('2d');
    const data = getFilteredData();
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

function updateMarcasChart(data) {
    const marcaCounts = countByField(data, 'marca');
    const top10 = getTopN(markaCounts, 10);
    charts.marcas.data.labels = Object.keys(top10);
    charts.marcas.data.datasets[0].data = Object.values(top10);
    charts.marcas.update();
}

// ================= GRÁFICO 4: AÑO =================
function createAnoChart() {
    const ctx = document.getElementById('chartAno').getContext('2d');
    const data = getFilteredData();
    const anoCounts = countByField(data, 'ano');
    const sorted = sortObjectByKey(anoCounts);

    charts.ano = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(sorted),
            datasets: [{
                label: 'Vehículos',
                data: Object.values(sorted),
                borderColor: '#e9c46a',
                backgroundColor: 'rgba(233, 196, 106, 0.2)',
                fill: true,
                tension: 0.4
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

function updateAnoChart(data) {
    const anoCounts = countByField(data, 'ano');
    const sorted = sortObjectByKey(anoCounts);
    charts.ano.data.labels = Object.keys(sorted);
    charts.ano.data.datasets[0].data = Object.values(sorted);
    charts.ano.update();
}

// ================= GRÁFICO 5: UNIDADES =================
function createUnidadesChart() {
    const ctx = document.getElementById('chartUnidades').getContext('2d');
    const data = getFilteredData();
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

function updateUnidadesChart(data) {
    const unidadCounts = countByField(data, 'unidad_administrativa');
    const top15 = getTopN(unidadCounts, 15);
    charts.unidades.data.labels = Object.keys(top15);
    charts.unidades.data.datasets[0].data = Object.values(top15);
    charts.unidades.update();
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
    document.getElementById('loadingOverlay').style.display = 'flex';
    loadVehicleData();
}

function exportReport() {
    const data = getFilteredData();
    const csvContent = "data:text/csv;charset=utf-8," 
        + Object.keys(data[0] || {}).join(",") + "\n"
        + data.map(e => Object.values(e).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "reporte_vehiculos_" + new Date().toISOString().split('T')[0] + ".csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '../login.html';
}

document.getElementById('logoutBtn').addEventListener('click', handleLogout);
