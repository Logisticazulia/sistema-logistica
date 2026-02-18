/**
 * CONSULTA DE VEHÍCULOS - PLANILLA
 */

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let allVehicles = [];
let filteredVehicles = [];
let currentPage = 1;
const itemsPerPage = 20;

// Cargar vehículos desde Supabase
async function cargarVehiculos() {
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('marca', { ascending: true });

        if (error) throw error;

        allVehicles = data || [];
        filteredVehicles = [...allVehicles];
        
        aplicarFiltros();
        
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        document.getElementById('vehiclesTableBody').innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Aplicar todos los filtros
function aplicarFiltros() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const filterTipo = document.getElementById('filterTipo').value;
    const filterClase = document.getElementById('filterClase').value;
    const filterEstatus = document.getElementById('filterEstatus').value;
    const filterEPM = document.getElementById('filterEPM').value;
    const filterEPP = document.getElementById('filterEPP').value;

    filteredVehicles = allVehicles.filter(v => {
        const matchesSearch = !searchTerm || 
            (v.placa && v.placa.toLowerCase().includes(searchTerm)) ||
            (v.facsimil && v.facsimil.toLowerCase().includes(searchTerm)) ||
            (v.marca && v.marca.toLowerCase().includes(searchTerm)) ||
            (v.modelo && v.modelo.toLowerCase().includes(searchTerm));
        
        const matchesTipo = !filterTipo || (v.tipo && v.tipo.toUpperCase().includes(filterTipo.toUpperCase()));
        const matchesClase = !filterClase || (v.clase && v.clase.toUpperCase().includes(filterClase.toUpperCase()));
        const matchesEstatus = !filterEstatus || (v.estatus && v.estatus.toUpperCase().includes(filterEstatus.toUpperCase()));
        const matchesEPM = !filterEPM || (v.epm && v.epm.toUpperCase().includes(filterEPM.toUpperCase()));
        const matchesEPP = !filterEPP || (v.epp && v.epp.toUpperCase().includes(filterEPP.toUpperCase()));
        
        return matchesSearch && matchesTipo && matchesClase && matchesEstatus && matchesEPM && matchesEPP;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

// Limpiar todos los filtros
function limpiarFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterTipo').value = '';
    document.getElementById('filterClase').value = '';
    document.getElementById('filterEstatus').value = '';
    document.getElementById('filterEPM').value = '';
    document.getElementById('filterEPP').value = '';
    
    filteredVehicles = [...allVehicles];
    currentPage = 1;
    renderTable();
    renderPagination();
}

// Renderizar tabla con paginación
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageVehicles = filteredVehicles.slice(start, end);

    if (pageVehicles.length === 0) {
        document.getElementById('vehiclesTableBody').innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; color: #666;">
                    No hay vehículos que mostrar
                </td>
            </tr>
        `;
        document.getElementById('resultsCount').textContent = '0 vehículos encontrados';
        return;
    }

    document.getElementById('vehiclesTableBody').innerHTML = pageVehicles.map(v => `
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
            <td>${getEstatusBadge(v.estatus)}</td>
            <td>${v.epm || 'N/A'}</td>
            <td>${v.epp || 'N/A'}</td>
        </tr>
    `).join('');

    document.getElementById('resultsCount').textContent = `${filteredVehicles.length} vehículos encontrados`;
}

// Renderizar paginación
function renderPagination() {
    const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        document.getElementById('pageInfo').textContent = `Página 1 de 1`;
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
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${totalPages}`;
}

// Cambiar página
function changePage(page) {
    const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
    renderPagination();
    
    // Scroll to top of table
    document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth' });
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    cargarVehiculos();
});
