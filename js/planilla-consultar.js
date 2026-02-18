/**
 * PLANILLA DE CONSULTA DE VEHÍCULOS
 */

const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const searchInput = document.getElementById('searchInput');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const loadingState = document.getElementById('loadingState');
const noResultsState = document.getElementById('noResultsState');
const resultsCount = document.getElementById('resultsCount');
const lastUpdate = document.getElementById('lastUpdate');

let allVehicles = [];

// Cargar vehículos al iniciar
async function loadVehicles() {
    try {
        loadingState.hidden = false;
        vehiclesTableBody.parentElement.hidden = true;
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

// Mostrar vehículos en la tabla
function displayVehicles(vehicles) {
    if (vehicles.length === 0) {
        vehiclesTableBody.parentElement.hidden = true;
        noResultsState.hidden = false;
        return;
    }

    vehiclesTableBody.parentElement.hidden = false;
    noResultsState.hidden = true;

    vehiclesTableBody.innerHTML = vehicles.map(v => `
        <tr onclick="openVehicleModal('${v.placa || 'SIN_PLACA'}')">
            <td><span class="placa-clickable">${v.placa || 'N/A'}</span></td>
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
            <td>${v.asignacion || 'N/A'}</td>
            <td>${getEstatusBadge(v.estatus)}</td>
        </tr>
    `).join('');
}

// Abrir modal con detalles completos
function openVehicleModal(placa) {
    const vehicle = allVehicles.find(v => v.placa === placa);
    if (!vehicle) return;

    const detailsHtml = `
        <div class="details-grid">
            <div class="detail-item">
                <div class="detail-label">🚗 Placa</div>
                <div class="detail-value">${vehicle.placa || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📋 Facsímil</div>
                <div class="detail-value">${vehicle.facsimil || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">🏷️ Marca</div>
                <div class="detail-value">${vehicle.marca || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">🚙 Modelo</div>
                <div class="detail-value">${vehicle.modelo || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📌 Tipo</div>
                <div class="detail-value">${vehicle.tipo || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📝 Clase</div>
                <div class="detail-value">${vehicle.clase || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📅 Año</div>
                <div class="detail-value">${vehicle.ano || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">🎨 Color</div>
                <div class="detail-value">${vehicle.color || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">🔢 S/Carrocería</div>
                <div class="detail-value">${vehicle.s_carroceria || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">⚙️ S/Motor</div>
                <div class="detail-value">${vehicle.s_motor || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">🆔 N/Identificación</div>
                <div class="detail-value">${vehicle.n_identificacion || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📊 Situación</div>
                <div class="detail-value">${getSituacionBadge(vehicle.situacion)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">🏢 Unidad Administrativa</div>
                <div class="detail-value">${vehicle.unidad_administrativa || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📍 REDIP</div>
                <div class="detail-value">${vehicle.redip || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📍 CCPE</div>
                <div class="detail-value">${vehicle.ccpe || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📍 EPM</div>
                <div class="detail-value">${vehicle.epm || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📍 EPP</div>
                <div class="detail-value">${vehicle.epp || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">🗺️ Ubicación Física</div>
                <div class="detail-value">${vehicle.ubicacion_fisica || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📅 Fecha Asignación</div>
                <div class="detail-value">${vehicle.asignacion || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">✅ Estatus</div>
                <div class="detail-value">${getEstatusBadge(vehicle.estatus)}</div>
            </div>
            <div class="detail-item detail-full-width">
                <div class="detail-label">📝 Observación</div>
                <div class="detail-value">${vehicle.observacion || 'Sin observaciones'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📄 Certificado Origen</div>
                <div class="detail-value">${vehicle.certificado_origen || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">🔍 Fecha Inspección</div>
                <div class="detail-value">${vehicle.fecha_inspeccion || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📋 N/Trámite</div>
                <div class="detail-value">${vehicle.n_tramite || 'N/A'}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">📁 Ubicación Título</div>
                <div class="detail-value">${vehicle.ubicacion_titulo || 'N/A'}</div>
            </div>
            <div class="detail-item detail-full-width">
                <div class="detail-label">📝 Observación Extra</div>
                <div class="detail-value">${vehicle.observacion_extra || 'Sin observaciones'}</div>
            </div>
        </div>
    `;

    document.getElementById('vehicleDetails').innerHTML = detailsHtml;
    document.getElementById('vehicleModal').hidden = false;
}

// Cerrar modal
function closeVehicleModal() {
    document.getElementById('vehicleModal').hidden = true;
}

// Imprimir ficha
function printVehicleDetails() {
    window.print();
}

// Badge de situación
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

// Badge de estatus
function getEstatusBadge(estatus) {
    if (!estatus) return '<span class="badge-situacion badge-desincorporada">N/A</span>';
    
    const estatusLower = estatus.toLowerCase();
    let className = 'badge-desincorporada';
    
    if (estatusLower.includes('operativa')) className = 'badge-operativa';
    else if (estatusLower.includes('inoperativa')) className = 'badge-inoperativa';
    else if (estatusLower.includes('desincorporada')) className = 'badge-desincorporada';
    
    return `<span class="badge-situacion ${className}">${estatus}</span>`;
}

// Contar resultados
function updateResultsCount(count) {
    const text = count === 1 ? '1 vehículo encontrado' : `${count} vehículos encontrados`;
    resultsCount.textContent = text;
}

// Actualizar fecha
function updateLastUpdate() {
    const now = new Date();
    lastUpdate.textContent = `Actualizado: ${now.toLocaleTimeString('es-VE')}`;
}

// Búsqueda
function searchVehicles() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        displayVehicles(allVehicles);
        updateResultsCount(allVehicles.length);
        return;
    }

    const filtered = allVehicles.filter(v => 
        (v.placa && v.placa.toLowerCase().includes(searchTerm)) ||
        (v.marca && v.marca.toLowerCase().includes(searchTerm)) ||
        (v.modelo && v.modelo.toLowerCase().includes(searchTerm)) ||
        (v.facsimil && v.facsimil.toLowerCase().includes(searchTerm))
    );
    
    displayVehicles(filtered);
    updateResultsCount(filtered.length);
}

// Event Listeners
searchInput.addEventListener('input', searchVehicles);

// Inicializar
document.addEventListener('DOMContentLoaded', loadVehicles);
