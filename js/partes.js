/**
 * ========================================
 * MÓDULO: Partes Generales
 * FUENTE: Supabase - Tabla: vehiculos
 * ========================================
 */

let globalVehicles = [];
let chartClaseInstance = null;
let chartTipoInstance = null;

// ✅ NO declarar 'supabase' como variable local - usar window.supabase del CDN

document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Verificar que Supabase esté disponible
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase no está cargado. Verifica que el SDK esté incluido antes de este script.');
        }
        
        // ✅ Usar window.supabase directamente (ya inicializado por el CDN + config.js)
        const supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_KEY
        );
        
        console.log('🔄 Cargando vehículos desde Supabase...');
        
        // Obtener datos desde Supabase
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error('No se encontraron vehículos en la base de datos');
        }
        
        console.log(`✅ ${data.length} vehículos cargados desde Supabase`);
        globalVehicles = data;
        
        // Procesar y mostrar datos
        calculateStats(data);
        renderCharts(data);
        renderTable(data);
        setupFilters(data);
        
    } catch (error) {
        console.error('❌ Error crítico:', error);
        showErrorMessage(error.message);
    }
});

/**
 * Muestra mensaje de error amigable
 */
function showErrorMessage(message) {
    const tbody = document.getElementById('partesTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center;padding:30px;">
                    <div style="color:#dc3545;margin-bottom:15px;font-weight:600;">
                        ❌ Error cargando datos
                    </div>
                    <div style="color:#666;font-size:0.9rem;margin-bottom:15px;">
                        ${message}
                    </div>
                    <details style="font-size:0.8rem;color:#888;">
                        <summary>Verificar:</summary>
                        <ul style="text-align:left;margin-top:10px;">
                            <li>✓ Conexión a internet activa</li>
                            <li>✓ Credenciales de Supabase válidas en config.js</li>
                            <li>✓ Tabla "vehiculos" existe en Supabase</li>
                            <li>✓ Políticas RLS permiten lectura pública</li>
                        </ul>
                    </details>
                    <button onclick="location.reload()" 
                            style="margin-top:15px;padding:8px 16px;background:#003366;color:white;border:none;border-radius:4px;cursor:pointer;">
                        🔄 Reintentar
                    </button>
                </td>
            </tr>
        `;
    }
    // Limpiar estadísticas
    document.querySelectorAll('.stat-value, .partes-stat-value').forEach(el => {
        if (!el.querySelector('.loading')) el.textContent = '-';
    });
}

/**
 * Calcula estadísticas y actualiza el DOM
 */
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
    const reparacion = vehicles.filter(v => 
        v.situacion === 'REPARACION' || 
        v.situacion === 'TALLER' || 
        v.estatus === 'INOPERATIVA'
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
    safeUpdate('countMoto', vehicles.filter(v => 
        (v.tipo && v.tipo.toUpperCase() === 'MOTO') || 
        (v.clase && v.clase.toUpperCase() === 'MOTO')
    ).length);
    safeUpdate('countCamioneta', vehicles.filter(v => v.clase === 'CAMIONETA').length);
    safeUpdate('countAutomovil', vehicles.filter(v => v.clase === 'AUTOMOVIL').length);
    safeUpdate('countCamion', vehicles.filter(v => v.clase === 'CAMION').length);
    safeUpdate('countAutobus', vehicles.filter(v => v.clase === 'AUTOBUS').length);
    
    // Ubicaciones
    const cc = vehicles.filter(v => v.ubicacion_fisica?.toUpperCase().includes('CCPEM')).length;
    const d71 = vehicles.filter(v => v.ubicacion_fisica?.toUpperCase().includes('DESTACAMENTO 71')).length;
    const brim = vehicles.filter(v => v.unidad_administrativa?.toUpperCase().includes('BRIM') || 
                                     v.ubicacion_fisica?.toUpperCase().includes('BRIGADA MOTORIZADA')).length;
    const resg = vehicles.filter(v => v.ubicacion_fisica?.toUpperCase().includes('RESGUARDO')).length;
    
    safeUpdate('countCCPEM', cc);
    safeUpdate('countDest71', d71);
    safeUpdate('countBRIM', brim);
    safeUpdate('countResguardo', resg);
    safeUpdate('countOtros', Math.max(0, vehicles.length - (cc + d71 + brim + resg)));
    
    // Novedades
    safeUpdate('countConObs', vehicles.filter(v => v.observacion && v.observacion.trim().length > 15).length);
    safeUpdate('countSinObs', vehicles.filter(v => !v.observacion || v.observacion.trim().length <= 15).length);
    
    // Fecha
    if (vehicles.length > 0 && vehicles[0].created_at) {
        const date = new Date(vehicles[0].created_at);
        safeUpdate('lastUpdate', date.toLocaleDateString('es-VE', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        }));
    }
}

function safeUpdate(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

/**
 * Renderiza gráficos con Chart.js - ✅ Sintaxis corregida
 */
function renderCharts(vehicles) {
    // Datos por CLASE
    const claseCounts = {};
    vehicles.forEach(v => {
        const key = (v.clase || 'SIN_CLASE').toUpperCase();
        claseCounts[key] = (claseCounts[key] || 0) + 1;
    });
    
    // Datos por TIPO
    const tipoCounts = {};
    vehicles.forEach(v => {
        const key = (v.tipo || v.clase || 'SIN_TIPO').toUpperCase();
        tipoCounts[key] = (tipoCounts[key] || 0) + 1;
    });
    
    const colors = ['#003366', '#005b96', '#0077b6', '#0096c7', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8'];
    
    // 📊 Gráfico Clase (Doughnut) - ✅ data: agregado
    const ctxClase = document.getElementById('chartClase');
    if (ctxClase && window.Chart) {
        if (chartClaseInstance) chartClaseInstance.destroy();
        chartClaseInstance = new Chart(ctxClase, {
            type: 'doughnut',
            data: {  // ✅ CORREGIDO: faltaba 'data:'
                labels: Object.keys(claseCounts),
                datasets: [{
                    data: Object.values(claseCounts),  // ✅ CORREGIDO: faltaba 'data:'
                    backgroundColor: colors.slice(0, Object.keys(claseCounts).length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${pct}%)`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
    
    // 📊 Gráfico Tipo (Bar) - ✅ data: agregado
    const ctxTipo = document.getElementById('chartTipo');
    if (ctxTipo && window.Chart) {
        if (chartTipoInstance) chartTipoInstance.destroy();
        chartTipoInstance = new Chart(ctxTipo, {
            type: 'bar',
            data: {  // ✅ CORREGIDO: faltaba 'data:'
                labels: Object.keys(tipoCounts),
                datasets: [{
                    label: 'Cantidad',
                    data: Object.values(tipoCounts),  // ✅ CORREGIDO: faltaba 'data:'
                    backgroundColor: colors.slice(0, Object.keys(tipoCounts).length),
                    borderWidth: 1,
                    borderColor: '#003366'
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

/**
 * Renderiza tabla de vehículos
 */
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
        const obs = v.observacion ? 
            (v.observacion.length > 45 ? v.observacion.substring(0, 45) + '…' : v.observacion) 
            : '-';
        
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
    const e = estatus.toUpperCase();
    if (e === 'OPERATIVA') return 'status-operativa';
    if (e === 'INOPERATIVA') return 'status-inoperativa';
    if (e === 'DESINCORPORADA') return 'status-desincorporada';
    return 'status-reparacion';
}

/**
 * Configura filtros de la tabla
 */
function setupFilters(vehicles) {
    const fEstado = document.getElementById('filterEstado');
    const fTipo = document.getElementById('filterTipo');
    const fClase = document.getElementById('filterClase');
    const fPlaca = document.getElementById('searchPlaca');
    
    if (!fEstado || !fTipo || !fClase || !fPlaca) return;
    
    function applyFilters() {
        const estado = fEstado.value?.toUpperCase();
        const tipo = fTipo.value?.toUpperCase();
        const clase = fClase.value?.toUpperCase();
        const placa = fPlaca.value?.toUpperCase();
        
        const filtered = vehicles.filter(v => {
            const matchEstado = !estado || v.estatus?.toUpperCase() === estado;
            const matchTipo = !tipo || (v.tipo?.toUpperCase() === tipo || v.clase?.toUpperCase() === tipo);
            const matchClase = !clase || v.clase?.toUpperCase() === clase;
            const matchPlaca = !placa || (v.placa && v.placa.toUpperCase().includes(placa));
            return matchEstado && matchTipo && matchClase && matchPlaca;
        });
        
        renderTable(vehicles, filtered);
    }
    
    fEstado.addEventListener('change', applyFilters);
    fTipo.addEventListener('change', applyFilters);
    fClase.addEventListener('change', applyFilters);
    fPlaca.addEventListener('input', applyFilters);
}

/**
 * 🔁 Función para recargar datos manualmente
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
        renderCharts(data);
        renderTable(data);
        console.log('✅ Datos actualizados');
    } catch (err) {
        console.error('❌ Error:', err);
        alert('Error: ' + err.message);
    }
};
