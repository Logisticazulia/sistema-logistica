/**
 * CONSULTA DE VEHÍCULOS - CON PAGINACIÓN
 */

const SUPABASE_URL = window.SUPABASE_URL || 'https://wwrknqfyjelwbvfnfshq.supabase.co';
const SUPABASE_KEY = window.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const searchInput = document.getElementById('searchInput');
const searchTypeRadios = document.querySelectorAll('input[name="searchType"]');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const resultsCount = document.getElementById('resultsCount');
const lastUpdate = document.getElementById('lastUpdate');
const pagination = document.getElementById('pagination');

// Estado
let allVehicles = [];
let filteredVehicles = [];
let currentPage = 1;
const itemsPerPage = 20;

// Cargar vehículos
async function loadVehicles() {
    try {
        resultsCount.textContent = 'Cargando...';
        
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('placa', { ascending: true });

        if (error) throw error;

        allVehicles = data || [];
        filteredVehicles = [...allVehicles];
        
        updateResultsCount();
        updateLastUpdate();
        renderTable();
        renderPagination();
        
    } catch (error) {
        console.error('Error:', error);
        resultsCount.textContent = 'Error al cargar';
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; color: #dc2626;">
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
                <td colspan="10" style="text-align: center; color: #666;">
                    No hay vehículos que mostrar
                </td>
            </tr>
        `;
        return;
    }

    vehiclesTableBody.innerHTML = pageVehicles.map(v => `
        <tr>
            <td><strong>${v.placa || 'N/A'}</strong></td>
            <td>${v.marca || 'N/A'}</td>
            <td>${v.modelo || 'N/A'}</td>
            <td>${v.ano || 'N/A'}</td>
            <td>${v.color || 'N/A'}</td>
            <td>${truncate(v.s_carroceria, 12)}</td>
            <td>${truncate(v.s_motor, 12)}</td>
            <td>${getSituacionBadge(v.situacion)}</td>
            <td>${truncate(v.unidad_administrativa, 15)}</td>
            <td>${getEstatusBadge(v.estatus)}</td>
        </tr>
    `).join('');
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
            html += `<span class="page-info">...</span>`;
        }
    }

    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
        <button onclick="changePage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>»</button>
        <span class="page-info">${currentPage} de ${totalPages}</span>
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Buscar vehículos
function searchVehicles() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const searchType = document.querySelector('input[name="searchType"]:checked').value;

    if (!searchTerm) {
        filteredVehicles = [...allVehicles];
    } else {
        filteredVehicles = allVehicles.filter(v => {
            switch (searchType) {
                case 'placa':
                    return v.placa && v.placa.toLowerCase().includes(searchTerm);
                case 'marca':
                    return v.marca && v.marca.toLowerCase().includes(searchTerm);
                default:
                    return (v.placa && v.placa.toLowerCase().includes(searchTerm)) ||
                           (v.marca && v.marca.toLowerCase().includes(searchTerm)) ||
                           (v.modelo && v.modelo.toLowerCase().includes(searchTerm));
            }
        });
    }

    currentPage = 1;
    updateResultsCount();
    renderTable();
    renderPagination();
}

// Actualizar contador
function updateResultsCount() {
    const count = filteredVehicles.length;
    resultsCount.textContent = `${count} vehículo${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
}

// Actualizar fecha
function updateLastUpdate() {
    const now = new Date();
    lastUpdate.textContent = `Actualizado: ${now.toLocaleTimeString('es-VE')}`;
}

// Badge de situación
function getSituacionBadge(situacion) {
    if (!situacion) return '<span class="badge badge-desincorporada">N/A</span>';
    
    const s = situacion.toLowerCase();
    let className = 'badge-desincorporada';
    
    if (s.includes('operativa') && !s.includes('inoperativa')) className = 'badge-operativa';
    else if (s.includes('inoperativa')) className = 'badge-inoperativa';
    else if (s.includes('reparacion') || s.includes('taller')) className = 'badge-reparacion';
    
    return `<span class="badge ${className}">${situacion}</span>`;
}

// Badge de estatus
function getEstatusBadge(estatus) {
    if (!estatus) return '<span class="badge badge-desincorporada">N/A</span>';
    
    const e = estatus.toLowerCase();
    let className = 'badge-desincorporada';
    
    if (e.includes('operativa')) className = 'badge-operativa';
    else if (e.includes('inoperativa')) className = 'badge-inoperativa';
    else if (e.includes('desincorporada')) className = 'badge-desincorporada';
    
    return `<span class="badge ${className}">${estatus}</span>`;
}

// Truncar texto
function truncate(text, maxLength) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Event Listeners
searchInput.addEventListener('input', searchVehicles);

searchTypeRadios.forEach(radio => {
    radio.addEventListener('change', searchVehicles);
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
});
