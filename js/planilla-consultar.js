/**
 * CONSULTA DE VEHÍCULOS - PLANILLA
 */

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let allVehicles = [];
let filteredVehicles = [];
let currentPage = 1;
const itemsPerPage = 20;

// Referencias
const searchInput = document.getElementById('searchInput');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const resultsCount = document.getElementById('resultsCount');
const pageInfo = document.getElementById('pageInfo');
const pagination = document.getElementById('pagination');
const vehicleModal = document.getElementById('vehicleModal');
const modalTitle = document.getElementById('modalTitle');
const fichaContent = document.getElementById('fichaContent');

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
        
        updatePagination();
        renderTable();
        
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Renderizar tabla
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageVehicles = filteredVehicles.slice(start, end);

    if (pageVehicles.length === 0) {
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: #666;">
                    No hay vehículos que mostrar
                </td>
            </tr>
        `;
        return;
    }

    vehiclesTableBody.innerHTML = pageVehicles.map(v => `
        <tr onclick="openFicha('${v.placa || ''}', '${v.facsimil || ''}')">
            <td>${v.placa || 'N/A'}</td>
            <td>${v.facsimil || 'N/A'}</td>
            <td>${v.marca || 'N/A'}</td>
            <td>${v.modelo || 'N/A'}</td>
            <td>${v.tipo || 'N/A'}</td>
            <td>${v.clase || 'N/A'}</td>
            <td>${v.ano || 'N/A'}</td>
            <td>${v.color || 'N/A'}</td>
            <td>${truncateText(v.s_carroceria, 15)}</td>
            <td>${truncateText(v.s_motor, 15)}</td>
            <td>${getEstatusBadge(v.estatus)}</td>
        </tr>
    `).join('');

    updateResultsInfo();
}

// Actualizar información de resultados
function updateResultsInfo() {
    const total = filteredVehicles.length;
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, total);
    
    resultsCount.textContent = `${total} vehículos encontrados`;
    pageInfo.textContent = `Mostrando ${start}-${end} de ${total}`;
}

// Actualizar paginación
function updatePagination() {
    const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
    
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
            html += `<span class="page-info">...</span>`;
        }
    }

    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
        <button onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>»</button>
    `;

    pagination.innerHTML = html;
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
}

// Cambiar página
function changePage(page) {
    const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderTable();
    updatePagination();
    
    // Scroll to top of table
    document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth' });
}

// Abrir ficha modal
function openFicha(placa, facsimil) {
    const vehicle = allVehicles.find(v => 
        (v.placa && v.placa.trim() === placa.trim()) || 
        (v.facsimil && v.facsimil.trim() === facsimil.trim())
    );
    
    if (!vehicle) return;

    modalTitle.textContent = `Ficha: ${vehicle.placa || vehicle.facsimil || 'Sin Identificación'}`;
    
    fichaContent.innerHTML = `
        ${createFichaItem('Placa', vehicle.placa)}
        ${createFichaItem('Facsímil', vehicle.facsimil)}
        ${createFichaItem('Marca', vehicle.marca)}
        ${createFichaItem('Modelo', vehicle.modelo)}
        ${createFichaItem('Tipo', vehicle.tipo)}
        ${createFichaItem('Clase', vehicle.clase)}
        ${createFichaItem('Año', vehicle.ano)}
        ${createFichaItem('Color', vehicle.color)}
        ${createFichaItem('S/Carrocería', vehicle.s_carroceria)}
        ${createFichaItem('S/Motor', vehicle.s_motor)}
        ${createFichaItem('N/Identificación', vehicle.n_identificacion)}
        ${createFichaItem('Situación', vehicle.situacion)}
        ${createFichaItem('Unidad Administrativa', vehicle.unidad_administrativa)}
        ${createFichaItem('REDIP', vehicle.redip)}
        ${createFichaItem('CCPE', vehicle.ccpe)}
        ${createFichaItem('EPM', vehicle.epm)}
        ${createFichaItem('EPP', vehicle.epp)}
        ${createFichaItem('Ubicación Física', vehicle.ubicacion_fisica)}
        ${createFichaItem('Fecha Asignación', vehicle.asignacion)}
        ${createFichaItem('Estatus', vehicle.estatus)}
        ${createFichaItem('Certificado Origen', vehicle.certificado_origen, true)}
        ${createFichaItem('Fecha Inspección', vehicle.fecha_inspeccion)}
        ${createFichaItem('N/Trámite', vehicle.n_tramite)}
        ${createFichaItem('Ubicación Título', vehicle.ubicacion_titulo, true)}
        ${createFichaItem('Observación', vehicle.observacion, true)}
        ${createFichaItem('Observación Extra', vehicle.observacion_extra, true)}
    `;

    vehicleModal.classList.add('active');
}

// Crear item de ficha
function createFichaItem(label, value, isFullWidth = false) {
    if (!value || value === 'N/A' || value === '' || value === 'N/P') return '';
    
    return `
        <div class="ficha-item ${isFullWidth ? 'full-width' : ''}">
            <div class="ficha-label">${label}</div>
            <div class="ficha-value">${value}</div>
        </div>
    `;
}

// Cerrar modal
function closeModal() {
    vehicleModal.classList.remove('active');
}

// Buscar vehículos
function searchVehicles() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        filteredVehicles = [...allVehicles];
    } else {
        filteredVehicles = allVehicles.filter(v => 
            (v.placa && v.placa.toLowerCase().includes(searchTerm)) ||
            (v.facsimil && v.facsimil.toLowerCase().includes(searchTerm)) ||
            (v.marca && v.marca.toLowerCase().includes(searchTerm)) ||
            (v.modelo && v.modelo.toLowerCase().includes(searchTerm))
        );
    }
    
    currentPage = 1;
    updatePagination();
    renderTable();
}

// Badge de estatus
function getEstatusBadge(estatus) {
    if (!estatus) return '<span class="badge">N/A</span>';
    
    const e = estatus.toLowerCase();
    let className = '';
    
    if (e.includes('operativa') && !e.includes('inoperativa')) className = 'badge-operativa';
    else if (e.includes('inoperativa')) className = 'badge-inoperativa';
    else if (e.includes('reparacion')) className = 'badge-reparacion';
    
    return `<span class="badge ${className}">${estatus}</span>`;
}

// Truncar texto
function truncateText(text, maxLength) {
    if (!text || text === 'N/A' || text === 'N/P') return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Event Listeners
searchInput.addEventListener('input', searchVehicles);

// Cerrar modal con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Cerrar modal al hacer clic fuera
vehicleModal.addEventListener('click', (e) => {
    if (e.target === vehicleModal) {
        closeModal();
    }
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
});
