/**
 * CONSULTA DE VEHÍCULOS - PLANILLA
 */

const SUPABASE_URL = window.SUPABASE_URL || 'TU_SUPABASE_URL_AQUI';
const SUPABASE_KEY = window.SUPABASE_KEY || 'TU_SUPABASE_ANON_KEY_AQUI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const vehicleModal = document.getElementById('vehicleModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');

let allVehicles = [];

// Verificar sesión
async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (!session || error) {
        window.location.href = '../index.html';
        return;
    }
    userEmailElement.textContent = session.user.email;
}

// Cerrar sesión
async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = '../index.html';
}

// Cargar vehículos
async function loadVehicles() {
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('placa', { ascending: true });

        if (error) throw error;

        allVehicles = data || [];
        displayVehicles(allVehicles);
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Mostrar vehículos en tabla
function displayVehicles(vehicles) {
    if (vehicles.length === 0) {
        vehiclesTableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #666;">
                    No hay vehículos registrados
                </td>
            </tr>
        `;
        return;
    }

    vehiclesTableBody.innerHTML = vehicles.map(v => `
        <tr onclick="openFicha('${v.placa || 'SIN_PLACA'}')">
            <td><strong>${v.placa || 'N/A'}</strong></td>
            <td>${v.marca || 'N/A'}</td>
            <td>${v.modelo || 'N/A'}</td>
            <td>${v.tipo || 'N/A'}</td>
            <td>${v.ano || 'N/A'}</td>
            <td>${v.color || 'N/A'}</td>
            <td>${getSituacionBadge(v.situacion)}</td>
            <td>${v.unidad_administrativa || 'N/A'}</td>
        </tr>
    `).join('');
}

// Badge de situación
function getSituacionBadge(situacion) {
    if (!situacion) return '<span class="badge">N/A</span>';
    
    const situacionLower = situacion.toLowerCase();
    let className = '';
    
    if (situacionLower.includes('operativa') && !situacionLower.includes('inoperativa')) {
        className = 'badge-operativa';
    } else if (situacionLower.includes('inoperativa')) {
        className = 'badge-inoperativa';
    } else if (situacionLower.includes('reparacion') || situacionLower.includes('taller')) {
        className = 'badge-reparacion';
    }
    
    return `<span class="badge ${className}">${situacion}</span>`;
}

// Abrir ficha del vehículo
function openFicha(placa) {
    const vehicle = allVehicles.find(v => v.placa === placa);
    if (!vehicle) return;

    modalTitle.textContent = `📋 Ficha del Vehículo - ${vehicle.placa || 'SIN PLACA'}`;
    
    modalBody.innerHTML = `
        <div class="ficha-simple">
            <!-- Encabezado -->
            <div class="ficha-header">
                <div class="ficha-header-item">
                    <label>PLACA</label>
                    <span>${vehicle.placa || 'N/A'}</span>
                </div>
                <div class="ficha-header-item">
                    <label>MARCA</label>
                    <span>${vehicle.marca || 'N/A'}</span>
                </div>
                <div class="ficha-header-item">
                    <label>MODELO</label>
                    <span>${vehicle.modelo || 'N/A'}</span>
                </div>
                <div class="ficha-header-item">
                    <label>SITUACIÓN</label>
                    <span>${vehicle.situacion || 'N/A'}</span>
                </div>
            </div>

            <!-- Identificación -->
            <div class="ficha-section">
                <h3>📋 IDENTIFICACIÓN</h3>
                <div class="ficha-grid">
                    <div class="ficha-item">
                        <label>Serie Carrocería</label>
                        <span>${vehicle.s_carroceria || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Serie Motor</label>
                        <span>${vehicle.s_motor || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Facsímil</label>
                        <span>${vehicle.facsimil || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Nº Identificación</label>
                        <span>${vehicle.n_identificacion || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Tipo</label>
                        <span>${vehicle.tipo || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Clase</label>
                        <span>${vehicle.clase || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Características -->
            <div class="ficha-section">
                <h3>🚗 CARACTERÍSTICAS</h3>
                <div class="ficha-grid">
                    <div class="ficha-item">
                        <label>Año</label>
                        <span>${vehicle.ano || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Color</label>
                        <span>${vehicle.color || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Estatus</label>
                        <span>${vehicle.estatus || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Fecha Asignación</label>
                        <span>${formatDate(vehicle.asignacion)}</span>
                    </div>
                </div>
            </div>

            <!-- Ubicación -->
            <div class="ficha-section">
                <h3>📍 UBICACIÓN</h3>
                <div class="ficha-grid">
                    <div class="ficha-item">
                        <label>Unidad Administrativa</label>
                        <span>${vehicle.unidad_administrativa || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>REDIP</label>
                        <span>${vehicle.redip || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>CCPE</label>
                        <span>${vehicle.ccpe || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>EPM</label>
                        <span>${vehicle.epm || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>EPP</label>
                        <span>${vehicle.epp || 'N/A'}</span>
                    </div>
                    <div class="ficha-item ficha-full">
                        <label>Ubicación Física</label>
                        <span>${vehicle.ubicacion_fisica || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Documentación -->
            <div class="ficha-section">
                <h3>📄 DOCUMENTACIÓN</h3>
                <div class="ficha-grid">
                    <div class="ficha-item">
                        <label>Certificado Origen</label>
                        <span>${vehicle.certificado_origen || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Fecha Inspección</label>
                        <span>${formatDate(vehicle.fecha_inspeccion)}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Nº Trámite</label>
                        <span>${vehicle.n_tramite || 'N/A'}</span>
                    </div>
                    <div class="ficha-item">
                        <label>Ubicación Título</label>
                        <span>${vehicle.ubicacion_titulo || 'N/A'}</span>
                    </div>
                </div>
            </div>

            <!-- Observaciones -->
            <div class="ficha-section">
                <h3>📝 OBSERVACIONES</h3>
                <div class="ficha-item ficha-full" style="min-height: 80px;">
                    <label>Observaciones</label>
                    <span>${vehicle.observacion || 'Sin observaciones'}</span>
                </div>
                ${vehicle.observacion_extra ? `
                <div class="ficha-item ficha-full" style="margin-top: 10px;">
                    <label>Observaciones Adicionales</label>
                    <span>${vehicle.observacion_extra}</span>
                </div>
                ` : ''}
            </div>

            <!-- Acciones -->
            <div class="ficha-actions">
                <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimir Ficha</button>
                <button class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            </div>
        </div>
    `;

    vehicleModal.classList.add('active');
}

// Cerrar modal
function closeModal() {
    vehicleModal.classList.remove('active');
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-VE');
    } catch {
        return dateString;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadVehicles();
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
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
});
