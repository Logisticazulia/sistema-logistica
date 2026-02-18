/**
 * CONSULTA DE VEHÍCULOS - PLANILLA
 */

const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allVehicles = [];
let filteredVehicles = [];

// Cargar vehículos al iniciar
document.addEventListener('DOMContentLoaded', () => {
    cargarVehiculos();
    actualizarFecha();
});

async function cargarVehiculos() {
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('placa', { ascending: true });

        if (error) throw error;

        allVehicles = data || [];
        filteredVehicles = [...allVehicles];
        mostrarVehiculos(filteredVehicles);
        
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        document.getElementById('vehiclesTableBody').innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

function mostrarVehiculos(vehiculos) {
    const tbody = document.getElementById('vehiclesTableBody');
    
    if (vehiculos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; color: #666;">
                    No se encontraron vehículos
                </td>
            </tr>
        `;
        document.getElementById('resultsCount').textContent = '0 vehículos encontrados';
        return;
    }

    tbody.innerHTML = vehiculos.map(v => `
        <tr onclick="mostrarFicha('${v.placa || ''}')">
            <td><strong>${v.placa || 'N/A'}</strong></td>
            <td>${v.marca || 'N/A'}</td>
            <td>${v.modelo || 'N/A'}</td>
            <td>${v.ano || 'N/A'}</td>
            <td>${v.color || 'N/A'}</td>
            <td>${v.s_carroceria || 'N/A'}</td>
            <td>${v.s_motor || 'N/A'}</td>
            <td>${getBadge(v.situacion)}</td>
            <td>${truncateText(v.unidad_administrativa, 20)}</td>
            <td>${getBadge(v.estatus)}</td>
        </tr>
    `).join('');

    document.getElementById('resultsCount').textContent = `${vehiculos.length} vehículos encontrados`;
}

function buscarVehiculos() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    
    if (!searchTerm) {
        filteredVehicles = [...allVehicles];
    } else {
        filteredVehicles = allVehicles.filter(v => 
            (v.placa && v.placa.toLowerCase().includes(searchTerm)) ||
            (v.marca && v.marca.toLowerCase().includes(searchTerm)) ||
            (v.modelo && v.modelo.toLowerCase().includes(searchTerm))
        );
    }
    
    aplicarFiltros();
}

function filtrarVehiculos() {
    aplicarFiltros();
}

function aplicarFiltros() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const filterSituacion = document.getElementById('filterSituacion').value;
    const filterEstatus = document.getElementById('filterEstatus').value;
    const filterTipo = document.getElementById('filterTipo').value;

    filteredVehicles = allVehicles.filter(v => {
        let matches = true;

        if (searchTerm) {
            matches = matches && (
                (v.placa && v.placa.toLowerCase().includes(searchTerm)) ||
                (v.marca && v.marca.toLowerCase().includes(searchTerm)) ||
                (v.modelo && v.modelo.toLowerCase().includes(searchTerm))
            );
        }

        if (filterSituacion) {
            matches = matches && (v.situacion && v.situacion.toUpperCase().includes(filterSituacion));
        }

        if (filterEstatus) {
            matches = matches && (v.estatus && v.estatus.toUpperCase().includes(filterEstatus));
        }

        if (filterTipo) {
            matches = matches && (v.tipo && v.tipo.toUpperCase().includes(filterTipo));
        }

        return matches;
    });

    mostrarVehiculos(filteredVehicles);
}

function mostrarFicha(placa) {
    const vehiculo = allVehicles.find(v => v.placa === placa);
    if (!vehiculo) return;

    document.getElementById('fichaPlaca').textContent = placa || 'SIN PLACA';

    const campos = [
        { label: 'Placa', value: vehiculo.placa },
        { label: 'Marca', value: vehiculo.marca },
        { label: 'Modelo', value: vehiculo.modelo },
        { label: 'Tipo', value: vehiculo.tipo },
        { label: 'Clase', value: vehiculo.clase },
        { label: 'Año', value: vehiculo.ano },
        { label: 'Color', value: vehiculo.color },
        { label: 'S/Carrocería', value: vehiculo.s_carroceria },
        { label: 'S/Motor', value: vehiculo.s_motor },
        { label: 'Facsímil', value: vehiculo.facsimil },
        { label: 'N/Identificación', value: vehiculo.n_identificacion },
        { label: 'Situación', value: vehiculo.situacion },
        { label: 'Unidad Administrativa', value: vehiculo.unidad_administrativa },
        { label: 'REDIP', value: vehiculo.redip },
        { label: 'CCPE', value: vehiculo.ccpe },
        { label: 'EPM', value: vehiculo.epm },
        { label: 'EPP', value: vehiculo.epp },
        { label: 'Ubicación Física', value: vehiculo.ubicacion_fisica },
        { label: 'Asignación', value: vehiculo.asignacion },
        { label: 'Estatus', value: vehiculo.estatus },
        { label: 'Certificado Origen', value: vehiculo.certificado_origen },
        { label: 'Fecha Inspección', value: vehiculo.fecha_inspeccion },
        { label: 'N/Trámite', value: vehiculo.n_tramite },
        { label: 'Ubicación Título', value: vehiculo.ubicacion_titulo },
        { label: 'Observación', value: vehiculo.observacion, full: true },
        { label: 'Observación Extra', value: vehiculo.observacion_extra, full: true }
    ];

    document.getElementById('fichaInfo').innerHTML = campos.map(campo => `
        <div class="ficha-item ${campo.full ? 'ficha-full' : ''}">
            <div class="ficha-item-label">${campo.label}</div>
            <div class="ficha-item-value">${campo.value || 'N/A'}</div>
        </div>
    `).join('');

    document.getElementById('fichaModal').classList.add('active');
}

function cerrarFicha() {
    document.getElementById('fichaModal').classList.remove('active');
}

function imprimirFicha() {
    window.print();
}

function actualizarFecha() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = `Actualizado: ${now.toLocaleDateString('es-VE')} ${now.toLocaleTimeString('es-VE')}`;
}

function getBadge(valor) {
    if (!valor) return '<span class="badge">N/A</span>';
    
    const valorUpper = valor.toUpperCase();
    let className = '';
    
    if (valorUpper.includes('OPERATIVA') && !valorUpper.includes('INOPERATIVA')) {
        className = 'badge-operativa';
    } else if (valorUpper.includes('INOPERATIVA')) {
        className = 'badge-inoperativa';
    } else if (valorUpper.includes('REPARACION')) {
        className = 'badge-reparacion';
    } else if (valorUpper.includes('DESINCOPORADA')) {
        className = 'badge-desincorporada';
    }
    
    return `<span class="badge ${className}">${valor}</span>`;
}

function truncateText(text, maxLength) {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Cerrar ficha con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        cerrarFicha();
    }
});

// Cerrar ficha al hacer clic fuera
document.getElementById('fichaModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('fichaModal')) {
        cerrarFicha();
    }
});
