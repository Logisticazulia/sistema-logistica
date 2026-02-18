/**
 * ========================================
 * PLANILLA DE CONSULTA DE VEHÍCULOS
 * Conexión con Supabase - Tabla: vehiculos
 * ========================================
 */

// ==================== CONFIGURACIÓN ====================
// Usando variables globales desde config.js
const SUPABASE_URL = window.SUPABASE_URL || 'TU_SUPABASE_URL_AQUI';
const SUPABASE_KEY = window.SUPABASE_KEY || 'TU_SUPABASE_ANON_KEY_AQUI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LOGIN_URL = 'https://logisticazulia.github.io/sistema-logistica/index.html';

// ==================== REFERENCIAS AL DOM ====================
const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const searchInput = document.getElementById('searchInput');
const searchTypeRadios = document.querySelectorAll('input[name="searchType"]');
const resultsCount = document.getElementById('resultsCount');
const lastUpdate = document.getElementById('lastUpdate');
const loadingState = document.getElementById('loadingState');
const noResultsState = document.getElementById('noResultsState');
const vehiclesTable = document.getElementById('vehiclesTable');

// Estado global
let allVehicles = [];

// ==================== SEGURIDAD ====================

async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (!session || error) {
            console.log('❌ No hay sesión activa');
            // Opcional: redirigir al login
            // window.location.href = LOGIN_URL;
            return false;
        }
        
        userEmailElement.textContent = session.user.email;
        console.log('✅ Sesión activa para:', session.user.email);
        return true;
    } catch (error) {
        console.error('Error verificando sesión:', error);
        return false;
    }
}

async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            alert('Error al cerrar sesión: ' + error.message);
            return;
        }
        
        console.log('✅ Sesión cerrada correctamente');
        window.location.href = LOGIN_URL;
    } catch (error) {
        console.error('Error en logout:', error);
        alert('Ocurrió un error al cerrar sesión');
    }
}

// ==================== CARGA DE DATOS ====================

async function loadVehicles() {
    try {
        loadingState.hidden = false;
        vehiclesTable.hidden = true;
        noResultsState.hidden = true;

        console.log('🔄 Cargando vehículos desde Supabase...');

        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('placa', { ascending: true });

        if (error) {
            throw error;
        }

        allVehicles = data || [];
        
        console.log(`✅ ${allVehicles.length} vehículos cargados`);
        
        displayVehicles(allVehicles);
        updateResultsCount(allVehicles.length);
        updateLastUpdate();
        
    } catch (error) {
        console.error('❌ Error cargando vehículos:', error);
        loadingState.innerHTML = `
            <div style="color: #dc2626;">
                <h3>❌ Error al cargar los datos</h3>
                <p>${error.message}</p>
                <button onclick="loadVehicles()" style="margin-top: 10px; padding: 10px 20px; background: #003366; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    🔄 Reintentar
                </button>
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

    vehiclesTableBody.innerHTML = vehicles.map(v => `
        <tr>
            <td><strong>${v.placa || 'N/A'}</strong></td>
            <td>${v.marca || 'N/A'}</td>
            <td>${v.modelo || 'N/A'}</td>
            <td>${v.tipo || 'N/A'}</td>
            <td>${v.clase || 'N/A'}</td>
            <td>${v.ano || 'N/A'}</td>
            <td>${v.color || 'N/A'}</td>
            <td>${v.s_carroceria || 'N/A'}</td>
            <td>${v.s_motor || 'N/A'}</td>
            <td>${v.facsimil || 'N/A'}</td>
            <td>${v.n_identificacion || 'N/A'}</td>
            <td>${getSituacionBadge(v.situacion)}</td>
            <td>${v.unidad_administrativa || 'N/A'}</td>
            <td>${v.redip || 'N/A'}</td>
            <td>${v.ccpe || 'N/A'}</td>
            <td>${v.epm || 'N/A'}</td>
            <td>${v.epp || 'N/A'}</td>
            <td>${v.ubicacion_fisica || 'N/A'}</td>
            <td>${formatDate(v.asignacion)}</td>
            <td>${getEstatusBadge(v.estatus)}</td>
            <td>${v.certificado_origen || 'N/A'}</td>
            <td>${formatDate(v.fecha_inspeccion)}</td>
            <td>${v.n_tramite || 'N/A'}</td>
            <td>${v.ubicacion_titulo || 'N/A'}</td>
            <td title="${v.observacion || 'Sin observaciones'}">${truncateText(v.observacion, 50)}</td>
            <td>${v.observacion_extra || 'N/A'}</td>
        </tr>
    `).join('');
}

function getSituacionBadge(situacion) {
    if (!situacion) return '<span class="badge badge-desincorporada">N/A</span>';
    
    const situacionLower = situacion.toLowerCase();
    let className = 'badge-desincorporada';
    
    if (situacionLower.includes('operativa') && !situacionLower.includes('inoperativa')) {
        className = 'badge-operativa';
    } else if (situacionLower.includes('inoperativa')) {
        className = 'badge-inoperativa';
    } else if (situacionLower.includes('reparacion') || situacionLower.includes('taller')) {
        className = 'badge-reparacion';
    } else if (situacionLower.includes('desincorporada')) {
        className = 'badge-desincorporada';
    }
    
    return `<span class="badge badge-${className}">${situacion}</span>`;
}

function getEstatusBadge(estatus) {
    if (!estatus) return '<span class="badge badge-desincorporada">N/A</span>';
    
    const estatusLower = estatus.toLowerCase();
    let className = 'badge-desincorporada';
    
    if (estatusLower.includes('operativa')) className = 'badge-operativa';
    else if (estatusLower.includes('inoperativa')) className = 'badge-inoperativa';
    else if (estatusLower.includes('desincorporada')) className = 'badge-desincorporada';
    
    return `<span class="badge badge-${className}">${estatus}</span>`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-VE');
    } catch {
        return dateString;
    }
}

function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function updateResultsCount(count) {
    const text = count === 1 ? '1 vehículo encontrado' : `${count} vehículos encontrados`;
    resultsCount.textContent = text;
}

function updateLastUpdate() {
    const now = new Date();
    lastUpdate.textContent = `Actualizado: ${now.toLocaleTimeString('es-VE')}`;
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

// ==================== EXPORTAR ====================

function exportToCSV() {
    if (allVehicles.length === 0) {
        alert('No hay datos para exportar');
        return;
    }

    const headers = [
        'Placa', 'Marca', 'Modelo', 'Tipo', 'Clase', 'Año', 'Color',
        'S/Carrocería', 'S/Motor', 'Facsímil', 'N/Identificación',
        'Situación', 'Unidad Administrativa', 'REDIP', 'CCPE', 'EPM', 'EPP',
        'Ubicación Física', 'Asignación', 'Estatus', 'Certificado Origen',
        'Fecha Inspección', 'N/Trámite', 'Ubicación Título', 'Observación', 'Observación Extra'
    ];

    const rows = allVehicles.map(v => [
        v.placa || '',
        v.marca || '',
        v.modelo || '',
        v.tipo || '',
        v.clase || '',
        v.ano || '',
        v.color || '',
        v.s_carroceria || '',
        v.s_motor || '',
        v.facsimil || '',
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
        v.certificado_origen || '',
        v.fecha_inspeccion || '',
        v.n_tramite || '',
        v.ubicacion_titulo || '',
        v.observacion || '',
        v.observacion_extra || ''
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

searchTypeRadios.forEach(radio => {
    radio.addEventListener('change', searchVehicles);
});

if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
}

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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Planilla de Consulta inicializada');
    
    // Verificar sesión
    await checkSession();
    
    // Cargar vehículos
    await loadVehicles();
    
    // Hacer exportToCSV disponible globalmente
    window.exportToCSV = exportToCSV;
});
