/**
 * CONSULTA DE VEHÍCULOS - PLANILLA
 */

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let allVehicles = [];
let filteredVehicles = [];

// Cargar vehículos
async function loadVehicles() {
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('marca', { ascending: true });

        if (error) throw error;

        allVehicles = data || [];
        filteredVehicles = [...allVehicles];
        
        populateFilters();
        renderTable();
        updateResultsCount();
        updateLastUpdate();
        
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        document.getElementById('vehiclesTableBody').innerHTML = `
            <tr>
                <td colspan="20" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Llenar filtros
function populateFilters() {
    const marcas = [...new Set(allVehicles.map(v => v.marca).filter(Boolean))].sort();
    const tipos = [...new Set(allVehicles.map(v => v.tipo).filter(Boolean))].sort();
    
    const filterMarca = document.getElementById('filterMarca');
    const filterTipo = document.getElementById('filterTipo');
    
    marcas.forEach(m => {
        const option = document.createElement('option');
        option.value = m;
        option.textContent = m;
        filterMarca.appendChild(option);
    });
    
    tipos.forEach(t => {
        const option = document.createElement('option');
        option.value = t;
        option.textContent = t;
        filterTipo.appendChild(option);
    });
}

// Renderizar tabla
function renderTable() {
    const tbody = document.getElementById('vehiclesTableBody');
    
    if (filteredVehicles.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="20" style="text-align: center; color: #666;">
                    No se encontraron vehículos
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredVehicles.map(v => `
        <tr>
            <td>${v.placa || 'N/A'}</td>
            <td>${v.facsimil || 'N/A'}</td>
            <td>${v.marca || 'N/A'}</td>
            <td>${v.modelo || 'N/A'}</td>
            <td>${v.tipo || 'N/A'}</td>
            <td>${v.clase || 'N/A'}</td>
            <td>${v.ano || 'N/A'}</td>
            <td>${v.color || 'N/A'}</td>
            <td>${v.s_carroceria || 'N/A'}</td>
            <td>${v.s_motor || 'N/A'}</td>
            <td>${v.n_identificacion || 'N/A'}</td>
            <td>${v.situacion || 'N/A'}</td>
            <td>${v.unidad_administrativa || 'N/A'}</td>
            <td>${v.redip || 'N/A'}</td>
            <td>${v.ccpe || 'N/A'}</td>
            <td>${v.epm || 'N/A'}</td>
            <td>${v.epp || 'N/A'}</td>
            <td>${v.ubicacion_fisica || 'N/A'}</td>
            <td>${v.asignacion || 'N/A'}</td>
            <td>${getEstatusBadge(v.estatus)}</td>
        </tr>
    `).join('');
}

// Badge de estatus
function getEstatusBadge(estatus) {
    if (!estatus) return '<span class="badge">N/A</span>';
    
    const e = estatus.toUpperCase();
    let className = '';
    
    if (e.includes('OPERATIVA') && !e.includes('INOPERATIVA')) className = 'badge-operativa';
    else if (e.includes('INOPERATIVA')) className = 'badge-inoperativa';
    else if (e.includes('REPARACION')) className = 'badge-reparacion';
    
    return `<span class="badge ${className}">${estatus}</span>`;
}

// Actualizar contador
function updateResultsCount() {
    const count = filteredVehicles.length;
    document.getElementById('resultsCount').textContent = `${count} vehículo${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
}

// Actualizar fecha
function updateLastUpdate() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = `Actualizado: ${now.toLocaleTimeString('es-VE')}`;
}

// Búsqueda por placa o facsímil
function searchVehicles() {
    const searchTerm = document.getElementById('searchInput').value.trim().toUpperCase();
    const searchType = document.querySelector('input[name="searchType"]:checked').value;
    
    if (!searchTerm) {
        applyFilters();
        return;
    }
    
    let searched = allVehicles.filter(v => {
        const placa = (v.placa || '').toUpperCase();
        const facsimil = (v.facsimil || '').toUpperCase();
        
        if (searchType === 'placa') {
            return placa.includes(searchTerm);
        } else if (searchType === 'facsimil') {
            return facsimil.includes(searchTerm);
        } else {
            return placa.includes(searchTerm) || facsimil.includes(searchTerm);
        }
    });
    
    filteredVehicles = searched;
    applyFilters();
}

// Aplicar filtros
function applyFilters() {
    const filterMarca = document.getElementById('filterMarca').value;
    const filterTipo = document.getElementById('filterTipo').value;
    const filterSituacion = document.getElementById('filterSituacion').value;
    const filterEstatus = document.getElementById('filterEstatus').value;
    
    filteredVehicles = allVehicles.filter(v => {
        return (!filterMarca || v.marca === filterMarca) &&
               (!filterTipo || v.tipo === filterTipo) &&
               (!filterSituacion || (v.situacion && v.situacion.includes(filterSituacion))) &&
               (!filterEstatus || (v.estatus && v.estatus.includes(filterEstatus)));
    });
    
    renderTable();
    updateResultsCount();
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
});
