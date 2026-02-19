/**
 * CONSULTA DE VEHÍCULOS - PLANILLA
 */

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let allVehicles = [];
let filteredVehicles = [];
let currentPage = 1;
const itemsPerPage = 20;

// Referencias a elementos del DOM
let filterTipo, filterClase, filterSituacion, filterEstatus, filterEPM, filterEPP;

// Obtener referencias a elementos del DOM
function getDOMElements() {
    filterTipo = document.getElementById('filterTipo');
    filterClase = document.getElementById('filterClase');
    filterSituacion = document.getElementById('filterSituacion');
    filterEstatus = document.getElementById('filterEstatus');
    filterEPM = document.getElementById('filterEPM');
    filterEPP = document.getElementById('filterEPP');
}

// Cargar vehículos
async function cargarVehiculos() {
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('marca', { ascending: true });

        if (error) throw error;

        allVehicles = data || [];
        filteredVehicles = [...allVehicles];
        
        // Poblar filtro EPP con valores únicos
        populateEPPFilter();
        
        aplicarFiltros();
        
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        document.getElementById('vehiclesTableBody').innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Poblar filtro EPP con valores únicos de la base de datos
function populateEPPFilter() {
    const eppValues = [...new Set(allVehicles.map(v => v.epp).filter(Boolean))].sort();
    const filterEPPSelect = document.getElementById('filterEPP');
    
    eppValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        filterEPPSelect.appendChild(option);
    });
}

// Aplicar filtros
function aplicarFiltros() {
    // Obtener elementos del DOM si no existen
    if (!filterTipo) getDOMElements();
    
    const filterTipoValue = filterTipo ? filterTipo.value.trim().toUpperCase() : '';
    const filterClaseValue = filterClase ? filterClase.value.trim().toUpperCase() : '';
    const filterSituacionValue = filterSituacion ? filterSituacion.value.trim().toUpperCase() : '';
    const filterEstatusValue = filterEstatus ? filterEstatus.value.trim().toUpperCase() : '';
    const filterEPMValue = filterEPM ? filterEPM.value.trim().toUpperCase() : '';
    const filterEPPValue = filterEPP ? filterEPP.value.trim().toUpperCase() : '';

    console.log('Filtros aplicados:', {
        tipo: filterTipoValue,
        clase: filterClaseValue,
        situacion: filterSituacionValue,
        estatus: filterEstatusValue,
        epm: filterEPMValue,
        epp: filterEPPValue
    });

    filteredVehicles = allVehicles.filter(v => {
        // Verificar cada filtro individualmente
        const matchesTipo = !filterTipoValue || (v.tipo && v.tipo.toUpperCase().includes(filterTipoValue));
        const matchesClase = !filterClaseValue || (v.clase && v.clase.toUpperCase().includes(filterClaseValue));
        const matchesSituacion = !filterSituacionValue || (v.situacion && v.situacion.toUpperCase().includes(filterSituacionValue));
        const matchesEstatus = !filterEstatusValue || (v.estatus && v.estatus.toUpperCase().includes(filterEstatusValue));
        const matchesEPM = !filterEPMValue || (v.epm && v.epm.toUpperCase().includes(filterEPMValue));
        const matchesEPP = !filterEPPValue || (v.epp && v.epp.toUpperCase().includes(filterEPPValue));
        
        // TODOS los filtros activos deben coincidir
        const result = matchesTipo && matchesClase && matchesSituacion && matchesEstatus && matchesEPM && matchesEPP;
        
        if (filterEstatusValue && v.estatus) {
            console.log(`Vehículo ${v.placa}: estatus="${v.estatus}", filtro="${filterEstatusValue}", coincide=${matchesEstatus}`);
        }
        
        return result;
    });

    console.log(`Total filtrados: ${filteredVehicles.length} de ${allVehicles.length}`);
    
    currentPage = 1;
    renderTable();
    renderPagination();
}
// Limpiar filtros
function limpiarFiltros() {
    if (filterTipo) filterTipo.value = '';
    if (filterClase) filterClase.value = '';
    if (filterSituacion) filterSituacion.value = '';
    if (filterEstatus) filterEstatus.value = '';
    if (filterEPM) filterEPM.value = '';
    if (filterEPP) filterEPP.value = '';
    
    aplicarFiltros();
}

// Renderizar tabla
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageVehicles = filteredVehicles.slice(start, end);

    if (pageVehicles.length === 0) {
        document.getElementById('vehiclesTableBody').innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: #666;">
                    No hay vehículos que mostrar
                </td>
            </tr>
        `;
        document.getElementById('resultsCount').textContent = '0 vehículos encontrados';
        return;
    }

    document.getElementById('vehiclesTableBody').innerHTML = pageVehicles.map(v => `
        <tr onclick="openFicha('${v.placa || ''}', '${v.facsimil || ''}')">
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
            <td>${getEstatusBadge(v.estatus)}</td>
        </tr>
    `).join('');

    document.getElementById('resultsCount').textContent = `${filteredVehicles.length} vehículos encontrados`;
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${Math.ceil(filteredVehicles.length / itemsPerPage)}`;
}

// Renderizar paginación
function renderPagination() {
    const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    let html = `
        <button onclick="changePage(1)" ${currentPage === 1 ? 'disabled' : ''}>«</button>
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span style="padding: 0 5px;">...</span>`;
        }
    }

    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
        <button onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>»</button>
    `;

    pagination.innerHTML = html;
}

// Cambiar página
function changePage(page) {
    const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
    renderPagination();
}

// Abrir ficha
function openFicha(placa, facsimil) {
    const vehicle = allVehicles.find(v => 
        (v.placa && v.placa.trim() === placa.trim()) || 
        (v.facsimil && v.facsimil.trim() === facsimil.trim())
    );
    
    if (!vehicle) return;

    alert(`Ficha del Vehículo\n\nPlaca: ${vehicle.placa || 'N/A'}\nMarca: ${vehicle.marca || 'N/A'}\nModelo: ${vehicle.modelo || 'N/A'}`);
}

// Badge de estatus
function getEstatusBadge(estatus) {
    if (!estatus) return '<span class="badge badge-desincorporada">N/A</span>';
    
    const estatusUpper = estatus.toUpperCase();
    let className = 'badge-desincorporada';
    
    if (estatusUpper.includes('OPERATIVA') && !estatusUpper.includes('INOPERATIVA')) className = 'badge-operativa';
    else if (estatusUpper.includes('INOPERATIVA')) className = 'badge-inoperativa';
    else if (estatusUpper.includes('REPARACION')) className = 'badge-reparacion';
    
    return `<span class="badge ${className}">${estatus}</span>`;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    getDOMElements();
    cargarVehiculos();
    
    // Event listeners para filtros
    if (filterTipo) filterTipo.addEventListener('change', aplicarFiltros);
    if (filterClase) filterClase.addEventListener('change', aplicarFiltros);
    if (filterSituacion) filterSituacion.addEventListener('change', aplicarFiltros);
    if (filterEstatus) filterEstatus.addEventListener('change', aplicarFiltros);
    if (filterEPM) filterEPM.addEventListener('change', aplicarFiltros);
    if (filterEPP) filterEPP.addEventListener('change', aplicarFiltros);
});
