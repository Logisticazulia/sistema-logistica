/**
 * Módulo: Partes Generales
 * Carga datos CSV, calcula estadísticas, renderiza tabla y gráficos
 */

let globalVehicles = [];
let chartClaseInstance = null;
let chartTipoInstance = null;

document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch('../data/vehiculos_rows.csv');
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        
        const csvText = await response.text();
        globalVehicles = parseCSV(csvText);
        
        calculateStats(globalVehicles);
        renderCharts(globalVehicles);
        renderTable(globalVehicles);
        setupFilters(globalVehicles);
        
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('partesTableBody').innerHTML = `
            <tr><td colspan="10" style="text-align:center;padding:30px;color:#dc3545;">
                ❌ Error cargando datos: ${error.message}
            </td></tr>`;
    }
});

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length >= headers.length) {
            const obj = {};
            headers.forEach((header, idx) => {
                let val = values[idx] ? values[idx].trim().replace(/^"|"$/g, '') : '';
                obj[header] = val;
            });
            data.push(obj);
        }
    }
    return data;
}

function calculateStats(vehicles) {
    // Totales principales
    safeUpdate('totalVehiculos', vehicles.length);
    
    // Por tipo/clave
    const motos = vehicles.filter(v => v.tipo === 'MOTO' || v.clase === 'MOTO').length;
    safeUpdate('totalMotos', motos);
    
    // Por estatus
    const operativos = vehicles.filter(v => v.estatus === 'OPERATIVA').length;
    const inoperativos = vehicles.filter(v => v.estatus === 'INOPERATIVA').length;
    const desincorporados = vehicles.filter(v => v.estatus === 'DESINCORPORADA').length;
    const reparacion = vehicles.filter(v => 
        v.situacion === 'REPARACION' || v.situacion === 'TALLER' || v.estatus === 'INOPERATIVA'
    ).length;
    
    safeUpdate('vehiculosOperativos', operativos);
    safeUpdate('vehiculosInoperativos', inoperativos);
    safeUpdate('vehiculosDesincorporados', desincorporados);
    safeUpdate('vehiculosReparacion', reparacion);
    
    // Tarjeta Estado
    safeUpdate('countOperativa', operativos);
    safeUpdate('countInoperativa', inoperativos);
    safeUpdate('countReparacion', vehicles.filter(v => v.situacion === 'REPARACION').length);
    safeUpdate('countTaller', vehicles.filter(v => v.situacion === 'TALLER').length);
    safeUpdate('countDesincorporada', desincorporados);
    
    // Tarjeta Tipo
    safeUpdate('countMoto', vehicles.filter(v => v.tipo === 'MOTO' || v.clase === 'MOTO').length);
    safeUpdate('countCamioneta', vehicles.filter(v => v.clase === 'CAMIONETA').length);
    safeUpdate('countAutomovil', vehicles.filter(v => v.clase === 'AUTOMOVIL').length);
    safeUpdate('countCamion', vehicles.filter(v => v.clase === 'CAMION').length);
    safeUpdate('countAutobus', vehicles.filter(v => v.clase === 'AUTOBUS').length);
    
    // Ubicaciones
    const cc = vehicles.filter(v => v.ubicacion_fisica?.includes('CCPEM')).length;
    const d71 = vehicles.filter(v => v.ubicacion_fisica?.includes('DESTACAMENTO 71')).length;
    const brim = vehicles.filter(v => v.unidad_administrativa?.includes('BRIM')).length;
    const resg = vehicles.filter(v => v.ubicacion_fisica?.includes('RESGUARDO')).length;
    safeUpdate('countCCPEM', cc);
    safeUpdate('countDest71', d71);
    safeUpdate('countBRIM', brim);
    safeUpdate('countResguardo', resg);
    safeUpdate('countOtros', vehicles.length - (cc + d71 + brim + resg));
    
    // Novedades
    safeUpdate('countConObs', vehicles.filter(v => v.observacion?.length > 15).length);
    safeUpdate('countSinObs', vehicles.filter(v => !v.observacion || v.observacion.length <= 15).length);
    
    // Fecha
    if (vehicles.length > 0 && vehicles[vehicles.length-1].created_at) {
        const d = new Date(vehicles[vehicles.length-1].created_at);
        safeUpdate('lastUpdate', d.toLocaleDateString('es-VE'));
    }
}

function safeUpdate(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderCharts(vehicles) {
    // Datos por CLASE
    const claseCounts = {};
    vehicles.forEach(v => {
        const c = v.clase || 'SIN_CLASE';
        claseCounts[c] = (claseCounts[c] || 0) + 1;
    });
    
    // Datos por TIPO
    const tipoCounts = {};
    vehicles.forEach(v => {
        const t = v.tipo || 'SIN_TIPO';
        tipoCounts[t] = (tipoCounts[t] || 0) + 1;
    });
    
    // Configurar colores
    const colors = ['#003366', '#005b96', '#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8'];
    
    // Gráfico Clase (Doughnut)
    const ctxClase = document.getElementById('chartClase');
    if (ctxClase) {
        if (chartClaseInstance) chartClaseInstance.destroy();
        chartClaseInstance = new Chart(ctxClase, {
            type: 'doughnut',
            data: {
                labels: Object.keys(claseCounts),
                datasets: [{
                    data: Object.values(claseCounts),
                    backgroundColor: colors.slice(0, Object.keys(claseCounts).length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10 } } }
                },
                cutout: '60%'
            }
        });
    }
    
    // Gráfico Tipo (Bar)
    const ctxTipo = document.getElementById('chartTipo');
    if (ctxTipo) {
        if (chartTipoInstance) chartTipoInstance.destroy();
        chartTipoInstance = new Chart(ctxTipo, {
            type: 'bar',
            data: {
                labels: Object.keys(tipoCounts),
                datasets: [{
                    label: 'Cantidad',
                    data: Object.values(tipoCounts),
                    backgroundColor: colors.slice(0, Object.keys(tipoCounts).length),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { font: { size: 9 } } },
                    x: { ticks: { font: { size: 9 } } }
                }
            }
        });
    }
}

function renderTable(vehicles, filtered = null) {
    const data = filtered || vehicles.slice(0, 100);
    const tbody = document.getElementById('partesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:30px;color:#666;">No hay resultados</td></tr>`;
        return;
    }
    
    data.forEach(v => {
        const row = document.createElement('tr');
        const statusClass = getStatusClass(v.estatus);
        const obs = v.observacion ? (v.observacion.length > 40 ? v.observacion.substring(0,40)+'…' : v.observacion) : '-';
        
        row.innerHTML = `
            <td>${v.id||'-'}</td>
            <td><strong>${v.placa||'-'}</strong></td>
            <td>${v.marca||'-'}</td>
            <td>${v.modelo||'-'}</td>
            <td>${v.tipo||'-'}</td>
            <td>${v.clase||'-'}</td>
            <td>${v.ano||'-'}</td>
            <td><span class="status-badge ${statusClass}">${v.estatus||'-'}</span></td>
            <td>${v.ubicacion_fisica||'-'}</td>
            <td title="${v.observacion||''}">${obs}</td>
        `;
        tbody.appendChild(row);
    });
}

function getStatusClass(estatus) {
    if (!estatus) return 'status-taller';
    switch(estatus.toUpperCase()) {
        case 'OPERATIVA': return 'status-operativa';
        case 'INOPERATIVA': return 'status-inoperativa';
        case 'DESINCORPORADA': return 'status-desincorporada';
        default: return 'status-reparacion';
    }
}

function setupFilters(vehicles) {
    const fEstado = document.getElementById('filterEstado');
    const fTipo = document.getElementById('filterTipo');
    const fClase = document.getElementById('filterClase');
    const fPlaca = document.getElementById('searchPlaca');
    
    if (!fEstado || !fTipo || !fClase || !fPlaca) return;
    
    function apply() {
        const estado = fEstado.value;
        const tipo = fTipo.value;
        const clase = fClase.value;
        const placa = fPlaca.value.toUpperCase();
        
        const filtered = vehicles.filter(v => {
            return (!estado || v.estatus === estado) &&
                   (!tipo || v.tipo === tipo) &&
                   (!clase || v.clase === clase) &&
                   (!placa || (v.placa && v.placa.toUpperCase().includes(placa)));
        });
        
        renderTable(vehicles, filtered);
    }
    
    fEstado.addEventListener('change', apply);
    fTipo.addEventListener('change', apply);
    fClase.addEventListener('change', apply);
    fPlaca.addEventListener('input', apply);
}
