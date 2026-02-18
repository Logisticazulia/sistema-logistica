/**
 * ========================================
 * CONSULTA DE VEHÍCULOS - PLANILLA
 * Búsqueda por Placa, Facsímil y más
 * ========================================
 */

// ==================== CONFIGURACIÓN ====================
const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LOGIN_URL = 'https://logisticazulia.github.io/sistema-logistica/index.html';

// ==================== REFERENCIAS AL DOM ====================
const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const vehiclesTable = document.getElementById('vehiclesTable');
const loadingState = document.getElementById('loadingState');
const noResultsState = document.getElementById('noResultsState');
const resultsCount = document.getElementById('resultsCount');
const lastUpdate = document.getElementById('lastUpdate');

let allVehicles = [];

// ==================== SEGURIDAD ====================

async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session || error) {
        window.location.href = LOGIN_URL;
        return;
    }
    
    userEmailElement.textContent = session.user.email;
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = LOGIN_URL;
}

// ==================== CARGA DE DATOS ====================

async function loadVehicles() {
    try {
        loadingState.hidden = false;
        vehiclesTable.hidden = true;
        noResultsState.hidden = true;

        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('numero', { ascending: true });

        if (error) throw error;

        allVehicles = data || [];
        displayVehicles(allVehicles);
        updateResultsCount(allVehicles.length);
        
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        loadingState.innerHTML = `
            <div style="color: #dc2626;">
                ❌ Error al cargar los datos<br>
                <small>${error.message}</small>
            </div>
        `;
    } finally {
        loadingState.hidden = true;
    }
}

// ==================== MOSTRAR DATOS ====================

function displayVehicles(vehicles) {
    if (vehicles.length === 0) {
        vehiclesTable.hidden = true;
        noResultsState.hidden = false;
        return;
    }

    vehiclesTable.hidden = false;
    noResultsState.hidden = true;

    vehiclesTableBody.innerHTML = vehicles.map(vehicle => `
        <tr>
            <td><strong>${vehicle.numero || 'N/A'}</strong></td>
            <td><strong>${vehicle.placa || 'N/A'}</strong></td>
            <td>${vehicle.facsimil || 'N/A'}</td>
            <td>${vehicle.marca || 'N/A'}</td>
            <td>${vehicle.modelo || 'N/A'}</td>
            <td>${vehicle.tipo || 'N/A'}</td>
            <td>${vehicle.clase || 'N/A'}</td>
            <td>${vehicle.ano || 'N/A'}</td>
            <td>${vehicle.color || 'N/A'}</td>
            <td>${vehicle.s_carroceria || 'N/A'}</td>
            <td>${vehicle.s_motor || 'N/A'}</td>
            <td>${vehicle.n_identificacion || 'N/A'}</td>
            <td>${getSituacionBadge(vehicle.situacion)}</td>
            <td>${vehicle.unidad_administrativa || 'N/A'}</td>
            <td>${vehicle.redip || 'N/A'}</td>
            <td>${vehicle.ccpe || 'N/A'}</td>
            <td>${vehicle.epm || 'N/A'}</td>
            <td>${vehicle.epp || 'N/A'}</td>
            <td>${vehicle.ubicacion_fisica || 'N/A'}</td>
            <td>${formatDate(vehicle.fecha_asignacion)}</td>
            <td>${getEstatusBadge(vehicle.estatus)}</td>
            <td title="${vehicle.observacion || 'Sin observaciones'}">${truncateText(vehicle.observacion, 30)}</td>
        </tr>
    `).join('');
}

function getSituacionBadge(situacion) {
    if (!situacion) return '<span class="badge-situacion badge-desincorporada">N/A</span>';
    
    const situacionLower = situacion.toLowerCase();
    let className = 'badge-desincorporada';
    
    if (situacionLower.includes('operativa') && !situacionLower.includes('inoperativa')) {
        className = 'badge-operativa';
    } else if (situacionLower.includes('inoperativa')) {
        className = 'badge-inoperativa';
    } else if (situacionLower.includes('reparacion') || situacionLower.includes('taller')) {
        className = 'badge-reparacion';
    } else if (situacionLower.includes('taller')) {
        className = 'badge-taller';
    }
    
    return `<span class="badge-situacion ${className}">${situacion}</span>`;
}

function getEstatusBadge(estatus) {
    if (!estatus) return '<span class="badge-situacion badge-desincorporada">N/A</span>';
    
    const estatusLower = estatus.toLowerCase();
    let className = 'badge-desincorporada';
    
    if (estatusLower.includes('operativa')) className = 'badge-operativa';
    else if (estatusLower.includes('inoperativa')) className = 'badge-inoperativa';
    else if (estatusLower.includes('desincorporada')) className = 'badge-desincorporada';
    
    return `<span class="badge-situacion ${className}">${estatus}</span>`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE');
}

function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function updateResultsCount(count) {
    const text = count === 1 ? '1 vehículo encontrado' : `${count} vehículos encontrados`;
    resultsCount.textContent = text;
    lastUpdate.textContent = `Actualizado: ${new Date().toLocaleTimeString('es-VE')}`;
}

// ==================== BÚSQUEDA ====================

function searchVehicles() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const searchType = document.querySelector('input[name="searchType"]:checked').value;

    if (!searchTerm) {
        displayVehicles(allVehicles);
        updateResultsCount(allVehicles.length);
        return;
    }

    let filtered = [];

    switch (searchType) {
        case 'placa':
            filtered = allVehicles.filter(v => 
                v.placa && v.placa.toLowerCase().includes(searchTerm)
            );
            break;
        
        case 'facsimil':
            filtered = allVehicles.filter(v => 
                v.facsimil && v.facsimil.toLowerCase().includes(searchTerm)
            );
            break;
        
        case 'all':
        default:
            filtered = allVehicles.filter(v => 
                (v.placa && v.placa.toLowerCase().includes(searchTerm)) ||
                (v.facsimil && v.facsimil.toLowerCase().includes(searchTerm)) ||
                (v.marca && v.marca.toLowerCase().includes(searchTerm)) ||
                (v.modelo && v.modelo.toLowerCase().includes(searchTerm)) ||
                (v.n_identificacion && v.n_identificacion.toLowerCase().includes(searchTerm))
            );
            break;
    }

    displayVehicles(filtered);
    updateResultsCount(filtered.length);
}

// ==================== EXPORTAR CSV ====================

function exportToCSV() {
    if (allVehicles.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const headers = [
        'Nº', 'Marca', 'Modelo', 'Tipo', 'Clase', 'Año', 'Color',
        'S/Carrocería', 'S/Motor', 'Placa', 'Facsímil', 'Nº Identificación',
        'Situación', 'Unidad Administrativa', 'REDIP', 'CCPE', 'EPM', 'EPP',
        'Ubicación Física', 'Fecha Asignación', 'Estatus', 'Observación',
        'Certificado Origen', 'Fecha Inspección', 'Nº Trámite', 'Ubicación Título'
    ];

    const rows = allVehicles.map(v => [
        v.numero || '',
        v.marca || '',
        v.modelo || '',
        v.tipo || '',
        v.clase || '',
        v.ano || '',
        v.color || '',
        v.s_carroceria || '',
        v.s_motor || '',
        v.placa || '',
        v.facsimil || '',
        v.n_identificacion || '',
        v.situacion || '',
        v.unidad_administrativa || '',
        v.redip || '',
        v.ccpe || '',
        v.epm || '',
        v.epp || '',
        v.ubicacion_fisica || '',
        v.fecha_asignacion || '',
        v.estatus || '',
        v.observacion || '',
        v.certificado_origen || '',
        v.fecha_inspeccion || '',
        v.n_tramite || '',
        v.ubicacion_titulo || ''
    ]);

    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `vehiculos_cpnb_zulia_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==================== EVENT LISTENERS ====================

searchInput.addEventListener('input', debounce(searchVehicles, 300));

document.querySelectorAll('input[name="searchType"]').forEach(radio => {
    radio.addEventListener('change', searchVehicles);
});

// Función debounce para optimizar la búsqueda
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadVehicles();
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    console.log('✅ Consulta de Vehículos inicializada');
});
