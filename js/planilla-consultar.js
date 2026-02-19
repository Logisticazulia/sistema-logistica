/**
 * CONSULTA DE VEHÍCULOS - PLANILLA
 * VERSIÓN CON BÚSQUEDA Y EXPORTACIÓN
 */

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let allVehicles = [];
let filteredVehicles = [];
let currentPage = 1;
const itemsPerPage = 20;

// Referencias a elementos del DOM
let filterTipo, filterClase, filterSituacion, filterEstatus, filterEPM, filterEPP, searchInput;

// Obtener referencias a elementos del DOM
function getDOMElements() {
    filterTipo = document.getElementById('filterTipo');
    filterClase = document.getElementById('filterClase');
    filterSituacion = document.getElementById('filterSituacion');
    filterEstatus = document.getElementById('filterEstatus');
    filterEPM = document.getElementById('filterEPM');
    filterEPP = document.getElementById('filterEPP');
    searchInput = document.getElementById('searchInput');
}

// Cargar vehículos
async function cargarVehiculos() {
    try {
        console.log('Cargando vehículos desde Supabase...');
        
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('marca', { ascending: true });

        if (error) {
            console.error('Error al cargar:', error);
            throw error;
        }

        console.log(`Vehículos cargados: ${data ? data.length : 0}`);
        allVehicles = data || [];
        filteredVehicles = [...allVehicles];
        
        // Aplicar filtros iniciales
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

// Buscar vehículos
function buscarVehiculos() {
    aplicarFiltros();
}

// Aplicar filtros
function aplicarFiltros() {
    if (!filterTipo) getDOMElements();
    
    // Obtener valor de búsqueda
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filterTipoValue = filterTipo ? filterTipo.value.trim().toUpperCase() : '';
    const filterClaseValue = filterClase ? filterClase.value.trim().toUpperCase() : '';
    const filterSituacionValue = filterSituacion ? filterSituacion.value.trim().toUpperCase() : '';
    const filterEstatusValue = filterEstatus ? filterEstatus.value.trim().toUpperCase() : '';
    const filterEPMValue = filterEPM ? filterEPM.value.trim().toUpperCase() : '';
    const filterEPPValue = filterEPP ? filterEPP.value.trim().toUpperCase() : '';

    filteredVehicles = allVehicles.filter(v => {
        // Búsqueda general
        const matchesSearch = !searchTerm || 
            (v.placa && v.placa.toLowerCase().includes(searchTerm)) ||
            (v.facsimil && v.facsimil.toLowerCase().includes(searchTerm)) ||
            (v.marca && v.marca.toLowerCase().includes(searchTerm)) ||
            (v.modelo && v.modelo.toLowerCase().includes(searchTerm));
        
        // Filtros individuales
        const matchesTipo = !filterTipoValue || (v.tipo && v.tipo.toUpperCase().includes(filterTipoValue));
        const matchesClase = !filterClaseValue || (v.clase && v.clase.toUpperCase().includes(filterClaseValue));
        const matchesSituacion = !filterSituacionValue || (v.situacion && v.situacion.toUpperCase().includes(filterSituacionValue));
        const matchesEstatus = !filterEstatusValue || (v.estatus && v.estatus.toUpperCase().includes(filterEstatusValue));
        const matchesEPM = !filterEPMValue || (v.epm && v.epm.toUpperCase().includes(filterEPMValue));
        const matchesEPP = !filterEPPValue || (v.epp && v.epp.toUpperCase().includes(filterEPPValue));
        
        return matchesSearch && matchesTipo && matchesClase && matchesSituacion && matchesEstatus && matchesEPM && matchesEPP;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

// Limpiar filtros
function limpiarFiltros() {
    if (searchInput) searchInput.value = '';
    if (filterTipo) filterTipo.value = '';
    if (filterClase) filterClase.value = '';
    if (filterSituacion) filterSituacion.value = '';
    if (filterEstatus) filterEstatus.value = '';
    if (filterEPM) filterEPM.value = '';
    if (filterEPP) filterEPP.value = '';
    
    aplicarFiltros();
}

// Exportar a Excel
function exportarExcel() {
    if (filteredVehicles.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    // Crear contenido CSV
    const headers = [
        'Placa', 'Facsímil', 'Marca', 'Modelo', 'Tipo', 'Clase', 'Año', 'Color',
        'S/Carrocería', 'S/Motor', 'N/Identificación', 'Situación', 'Unidad Administrativa',
        'REDIP', 'CCPE', 'EPM', 'EPP', 'Ubicación Física', 'Asignación', 'Estatus',
        'Observación', 'Certificado Origen', 'Fecha Inspección', 'N/Trámite', 'Ubicación Título'
    ];

    const rows = filteredVehicles.map(v => [
        v.placa || '',
        v.facsimil || '',
        v.marca || '',
        v.modelo || '',
        v.tipo || '',
        v.clase || '',
        v.ano || '',
        v.color || '',
        v.s_carroceria || '',
        v.s_motor || '',
        v.n_identificacion || '',
        v.situacion || '',
        v.unidad_administrativa || '',
        v.redip || '',
        v.ccpe || '',
        v.epm || '',
        v.epp || '',
        v.ubicacion_fisica || '',
        v.asignacion || '',
        v.estatus || '',
        v.observacion || '',
        v.certificado_origen || '',
        v.fecha_inspeccion || '',
        v.n_tramite || '',
        v.ubicacion_titulo || ''
    ]);

    // Crear CSV
    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    // Crear blob y descargar
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vehiculos_filtrados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    console.log('Inicializando consulta de vehículos...');
    getDOMElements();
    cargarVehiculos();
    
    // Event listeners para filtros
    if (filterTipo) filterTipo.addEventListener('change', aplicarFiltros);
    if (filterClase) filterClase.addEventListener('change', aplicarFiltros);
    if (filterSituacion) filterSituacion.addEventListener('change', aplicarFiltros);
    if (filterEstatus) filterEstatus.addEventListener('change', aplicarFiltros);
    if (filterEPM) filterEPM.addEventListener('change', aplicarFiltros);
    if (filterEPP) filterEPP.addEventListener('change', aplicarFiltros);
    
    // Permitir buscar con Enter
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                buscarVehiculos();
            }
        });
    }
});
