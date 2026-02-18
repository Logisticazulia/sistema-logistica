/**
 * CONSULTA DE VEHÍCULOS - PLANILLA
 */

const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

const searchInput = document.getElementById('searchInput');
const searchTypeRadios = document.querySelectorAll('input[name="searchType"]');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const resultsCount = document.getElementById('resultsCount');
const lastUpdate = document.getElementById('lastUpdate');
const fichaOverlay = document.getElementById('fichaOverlay');
const fichaTitle = document.getElementById('fichaTitle');
const fichaBody = document.getElementById('fichaBody');

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
        renderTable(filteredVehicles);
        updateResultsCount();
        updateLastUpdate();
        
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Renderizar tabla
function renderTable(vehicles) {
    if (vehicles.length === 0) {
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="13" style="text-align: center; color: #666;">
                    No se encontraron vehículos
                </td>
            </tr>
        `;
        return;
    }

    vehiclesTableBody.innerHTML = vehicles.map((v, index) => `
        <tr onclick="openFicha(${index})">
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
            <td>${v.situacion || 'N/A'}</td>
            <td>${v.unidad_administrativa || 'N/A'}</td>
            <td>${v.estatus || 'N/A'}</td>
        </tr>
    `).join('');
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

// Buscar vehículos
function buscarVehiculos() {
    const searchTerm = searchInput.value.trim().toUpperCase();
    const searchType = document.querySelector('input[name="searchType"]:checked').value;

    if (!searchTerm) {
        filteredVehicles = [...allVehicles];
    } else {
        filteredVehicles = allVehicles.filter(v => {
            if (searchType === 'placa') {
                return v.placa && v.placa.toUpperCase().includes(searchTerm);
            } else if (searchType === 'facsimil') {
                return v.facsimil && v.facsimil.toUpperCase().includes(searchTerm);
            }
            return false;
        });
    }

    renderTable(filteredVehicles);
    updateResultsCount();
}

// Abrir ficha
function openFicha(index) {
    const vehicle = filteredVehicles[index];
    if (!vehicle) return;

    fichaTitle.textContent = `Ficha: ${vehicle.placa || vehicle.facsimil || 'S/N'}`;
    
    fichaBody.innerHTML = `
        <div class="ficha-grid">
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
            ${createFichaItem('Asignación', vehicle.asignacion)}
            ${createFichaItem('Estatus', vehicle.estatus)}
            ${createFichaItem('Certificado Origen', vehicle.certificado_origen)}
            ${createFichaItem('Fecha Inspección', vehicle.fecha_inspeccion)}
            ${createFichaItem('N/Trámite', vehicle.n_tramite)}
            ${createFichaItem('Ubicación Título', vehicle.ubicacion_titulo)}
            ${createFichaItem('Observación', vehicle.observacion, true)}
            ${createFichaItem('Observación Extra', vehicle.observacion_extra, true)}
        </div>
    `;

    fichaOverlay.classList.add('active');
}

// Crear item de ficha
function createFichaItem(label, value, isLarge = false) {
    return `
        <div class="ficha-item ${isLarge ? 'ficha-full' : ''}">
            <div class="ficha-item-label">${label}</div>
            <div class="ficha-item-value">${value || 'N/A'}</div>
        </div>
    `;
}

// Cerrar ficha
function closeFicha() {
    fichaOverlay.classList.remove('active');
}

// Imprimir ficha
function printFicha() {
    window.print();
}

// Event Listeners
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        buscarVehiculos();
    }
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
});
