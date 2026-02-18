/**
 * CONSULTA DE VEHÍCULOS - PLANILLA
 */

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let allVehicles = [];
let filteredVehicles = [];
let currentPage = 1;
const itemsPerPage = 20;

// Referencias
const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const resultsCount = document.getElementById('resultsCount');
const pageInfo = document.getElementById('pageInfo');
const pagination = document.getElementById('pagination');
const fichaOverlay = document.getElementById('fichaOverlay');
const fichaTitle = document.getElementById('fichaTitle');
const fichaBody = document.getElementById('fichaBody');

// Filtros
const filterMarca = document.getElementById('filterMarca');
const filterTipo = document.getElementById('filterTipo');
const filterEstatus = document.getElementById('filterEstatus');
const filterEPM = document.getElementById('filterEPM');
const filterEPP = document.getElementById('filterEPP');

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
        applyFilters();
        
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Llenar filtros con opciones únicas
function populateFilters() {
    const marcas = [...new Set(allVehicles.map(v => v.marca).filter(Boolean))].sort();
    const tipos = [...new Set(allVehicles.map(v => v.tipo).filter(Boolean))].sort();
    const epms = [...new Set(allVehicles.map(v => v.epm).filter(Boolean))].sort();
    const epps = [...new Set(allVehicles.map(v => v.epp).filter(Boolean))].sort();

    marcas.forEach(m => filterMarca.add(new Option(m, m)));
    tipos.forEach(t => filterTipo.add(new Option(t, t)));
    epms.forEach(e => filterEPM.add(new Option(e, e)));
    epps.forEach(e => filterEPP.add(new Option(e, e)));
}

// Aplicar filtros
function applyFilters() {
    const marca = filterMarca.value;
    const tipo = filterTipo.value;
    const estatus = filterEstatus.value;
    const epm = filterEPM.value;
    const epp = filterEPP.value;

    filteredVehicles = allVehicles.filter(v => {
        return (!marca || v.marca === marca) &&
               (!tipo || v.tipo === tipo) &&
               (!estatus || v.estatus === estatus) &&
               (!epm || v.epm === epm) &&
               (!epp || v.epp === epp);
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

// Resetear filtros
function resetFilters() {
    filterMarca.value = '';
    filterTipo.value = '';
    filterEstatus.value = '';
    filterEPM.value = '';
    filterEPP.value = '';
    applyFilters();
}

// Renderizar tabla
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageVehicles = filteredVehicles.slice(start, end);

    if (pageVehicles.length === 0) {
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #666;">
                    No hay vehículos que mostrar
                </td>
            </tr>
        `;
        resultsCount.textContent = '0 vehículos';
        return;
    }

    vehiclesTableBody.innerHTML = pageVehicles.map(v => `
        <tr onclick="openFicha('${v.placa || ''}', '${v.facsimil || ''}')">
            <td><strong>${v.placa || 'N/A'}</strong></td>
            <td>${v.marca || 'N/A'}</td>
            <td>${v.modelo || 'N/A'}</td>
            <td>${v.tipo || 'N/A'}</td>
            <td>${v.ano || 'N/A'}</td>
            <td style="max-width: 150px;">${truncateText(v.situacion, 30)}</td>
            <td>${getEstatusBadge(v.estatus)}</td>
            <td>${v.epm || 'N/A'}</td>
            <td>${v.epp || 'N/A'}</td>
        </tr>
    `).join('');

    resultsCount.textContent = `${filteredVehicles.length} vehículos`;
    pageInfo.textContent = `Página ${currentPage} de ${Math.ceil(filteredVehicles.length / itemsPerPage)}`;
}

// Renderizar paginación
function renderPagination() {
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
            html += `<span>...</span>`;
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
    const vehicle = allVehicles.find(v => v.placa === placa || v.facsimil === facsimil);
    if (!vehicle) return;

    fichaTitle.textContent = `Ficha: ${vehicle.placa || vehicle.facsimil || 'N/A'}`;
    
    fichaBody.innerHTML = `
        <div class="ficha-row"><span class="ficha-label">Placa:</span><span class="ficha-value">${vehicle.placa || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Facsímil:</span><span class="ficha-value">${vehicle.facsimil || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Marca:</span><span class="ficha-value">${vehicle.marca || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Modelo:</span><span class="ficha-value">${vehicle.modelo || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Tipo:</span><span class="ficha-value">${vehicle.tipo || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Clase:</span><span class="ficha-value">${vehicle.clase || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Año:</span><span class="ficha-value">${vehicle.ano || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Color:</span><span class="ficha-value">${vehicle.color || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">S/Carrocería:</span><span class="ficha-value">${vehicle.s_carroceria || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">S/Motor:</span><span class="ficha-value">${vehicle.s_motor || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Situación:</span><span class="ficha-value">${vehicle.situacion || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Estatus:</span><span class="ficha-value">${vehicle.estatus || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Unidad Admin.:</span><span class="ficha-value">${vehicle.unidad_administrativa || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">REDIP:</span><span class="ficha-value">${vehicle.redip || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">CCPE:</span><span class="ficha-value">${vehicle.ccpe || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">EPM:</span><span class="ficha-value">${vehicle.epm || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">EPP:</span><span class="ficha-value">${vehicle.epp || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Ubicación Física:</span><span class="ficha-value">${vehicle.ubicacion_fisica || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Asignación:</span><span class="ficha-value">${vehicle.asignacion || 'N/A'}</span></div>
        <div class="ficha-row"><span class="ficha-label">Observación:</span><span class="ficha-value">${vehicle.observacion || 'N/A'}</span></div>
    `;

    fichaOverlay.classList.add('active');
}

// Cerrar ficha
function closeFicha() {
    fichaOverlay.classList.remove('active');
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

// Truncar texto
function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Event Listeners
filterMarca.addEventListener('change', applyFilters);
filterTipo.addEventListener('change', applyFilters);
filterEstatus.addEventListener('change', applyFilters);
filterEPM.addEventListener('change', applyFilters);
filterEPP.addEventListener('change', applyFilters);

// Cerrar ficha con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFicha();
});

// Cerrar ficha al hacer clic fuera
fichaOverlay.addEventListener('click', (e) => {
    if (e.target === fichaOverlay) closeFicha();
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
});
