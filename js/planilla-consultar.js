/**
 * =====================================
 * CONSULTA DE VEHÍCULOS - PLANILLA
 * Conecta con la tabla 'vehiculos' en Supabase
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
            .order('placa', { ascending: true });

        if (error) throw error;

        allVehicles = data || [];
        displayVehicles(allVehicles);
        updateResultsCount(allVehicles.length);
        updateLastUpdate();
        
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

    vehiclesTableBody.innerHTML = vehicles.map(v => `
        <tr>
            <td><strong>${v.placa || 'N/A'}</strong></td>
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
            <td>${getSituacionBadge(v.situacion)}</td>
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
                (v.facsimil && v.facsimil.toLowerCase().includes(searchTerm))
            );
            break;
    }

    displayVehicles(filtered);
    updateResultsCount(filtered.length);
}

// ==================== EVENT LISTENERS ====================

searchInput.addEventListener('input', searchVehicles);

document.querySelectorAll('input[name="searchType"]').forEach(radio => {
    radio.addEventListener('change', searchVehicles);
});

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadVehicles();
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    console.log('✅ Consulta de Vehículos inicializada');
});
