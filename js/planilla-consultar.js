const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const vehiclesTableBody = document.getElementById('vehiclesTableBody');
const vehicleModal = document.getElementById('vehicleModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');

let allVehicles = [];

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
            <td>${v.situacion || 'N/A'}</td>
            <td>${v.unidad_administrativa || 'N/A'}</td>
        </tr>
    `).join('');
}

function openFicha(placa) {
    const vehicle = allVehicles.find(v => v.placa === placa);
    if (!vehicle) return;

    modalTitle.textContent = `Ficha del Vehículo - ${vehicle.placa || 'SIN PLACA'}`;
    
    modalBody.innerHTML = `
        <div class="ficha-simple">
            ${createRow('Placa', vehicle.placa)}
            ${createRow('Facsímil', vehicle.facsimil)}
            ${createRow('Marca', vehicle.marca)}
            ${createRow('Modelo', vehicle.modelo)}
            ${createRow('Tipo', vehicle.tipo)}
            ${createRow('Clase', vehicle.clase)}
            ${createRow('Año', vehicle.ano)}
            ${createRow('Color', vehicle.color)}
            ${createRow('S/Carrocería', vehicle.s_carroceria)}
            ${createRow('S/Motor', vehicle.s_motor)}
            ${createRow('N/Identificación', vehicle.n_identificacion)}
            ${createRow('Situación', vehicle.situacion)}
            ${createRow('Unidad Administrativa', vehicle.unidad_administrativa)}
            ${createRow('REDIP', vehicle.redip)}
            ${createRow('CCPE', vehicle.ccpe)}
            ${createRow('EPM', vehicle.epm)}
            ${createRow('EPP', vehicle.epp)}
            ${createRow('Ubicación Física', vehicle.ubicacion_fisica)}
            ${createRow('Fecha Asignación', vehicle.asignacion)}
            ${createRow('Estatus', vehicle.estatus)}
            ${createRow('Certificado Origen', vehicle.certificado_origen)}
            ${createRow('Fecha Inspección', vehicle.fecha_inspeccion)}
            ${createRow('N/Trámite', vehicle.n_tramite)}
            ${createRow('Ubicación Título', vehicle.ubicacion_titulo)}
            ${createRow('Observación', vehicle.observacion)}
            ${createRow('Observación Extra', vehicle.observacion_extra)}
        </div>
    `;

    vehicleModal.classList.add('active');
}

function createRow(label, value) {
    if (!value || value === 'N/A' || value === '') return '';
    return `
        <div class="ficha-row">
            <div class="ficha-label">${label}:</div>
            <div class="ficha-value">${value}</div>
        </div>
    `;
}

function closeModal() {
    vehicleModal.classList.remove('active');
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

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    loadVehicles();
});
