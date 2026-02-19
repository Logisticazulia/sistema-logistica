/**
* CONSULTA DE VEHÍCULOS - PLANILLA
* VERSIÓN CON NUEVAS FUNCIONALIDADES
*/
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
let allVehicles = [];
let filteredVehicles = [];
let currentPage = 1;
const itemsPerPage = 20;
let currentVehicle = null; // Vehículo seleccionado para la ficha

// Referencias a elementos del DOM
let filterTipo, filterClase, filterSituacion, filterEstatus, filterUnidad, filterEPM, filterEPP, searchInput;

// Obtener referencias a elementos del DOM
function getDOMElements() {
    filterTipo = document.getElementById('filterTipo');
    filterClase = document.getElementById('filterClase');
    filterSituacion = document.getElementById('filterSituacion');
    filterEstatus = document.getElementById('filterEstatus');
    filterUnidad = document.getElementById('filterUnidad');
    filterEPM = document.getElementById('filterEPM');
    filterEPP = document.getElementById('filterEPP');
    searchInput = document.getElementById('searchInput');
}

// Cargar vehículos
async function cargarVehiculos() {
    try {
        console.log('Cargando vehículos desde Supabase...');
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .order('marca', { ascending: true });
        
        if (error) {
            console.error('Error al cargar:', error);
            throw error;
        }
        
        console.log(`Vehículos cargados: ${data ? data.length : 0}`);
        allVehicles = data || [];
        filteredVehicles = [...allVehicles];
        
        // Poblar filtros dinámicamente
        populateFilters();
        
        // Aplicar filtros iniciales
        aplicarFiltros();
    } catch (error) {
        console.error('Error cargando vehículos:', error);
        document.getElementById('vehiclesTableBody').innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Poblar filtros con valores únicos de la base de datos
function populateFilters() {
    // Poblar Unidad Administrativa
    if (filterUnidad) {
        const unidadValues = [...new Set(allVehicles.map(v => v.unidad_administrativa).filter(Boolean))].sort();
        console.log('Unidades Administrativas encontradas:', unidadValues.length);
        unidadValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value.trim().toUpperCase();
            option.textContent = value.trim();
            filterUnidad.appendChild(option);
        });
    }
    
    // Poblar EPP si está vacío
    if (filterEPP && filterEPP.options.length <= 1) {
        const eppValues = [...new Set(allVehicles.map(v => v.epp).filter(Boolean))].sort();
        eppValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value.trim().toUpperCase();
            option.textContent = value.trim();
            filterEPP.appendChild(option);
        });
    }
}

// Buscar por Placa o Facsímil
function buscarPorPlacaFacsímil() {
    if (!searchInput) getDOMElements();
    
    const searchTerm = searchInput ? searchInput.value.trim().toUpperCase() : '';
    
    if (!searchTerm) {
        aplicarFiltros();
        return;
    }
    
    console.log('Búsqueda por placa/facsímil:', searchTerm);
    
    filteredVehicles = allVehicles.filter(v => {
        const placaMatch = v.placa && v.placa.trim().toUpperCase().includes(searchTerm);
        const facsimilMatch = v.facsimil && v.facsimil.trim().toUpperCase().includes(searchTerm);
        return placaMatch || facsimilMatch;
    });
    
    console.log(`Vehículos encontrados: ${filteredVehicles.length}`);
    currentPage = 1;
    renderTable();
    renderPagination();
}

// Permitir buscar con Enter
function setupSearchEnter() {
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarPorPlacaFacsímil();
            }
        });
    }
}

// Aplicar filtros
function aplicarFiltros() {
    if (!filterTipo) getDOMElements();
    
    // Obtener valores de los filtros
    const filterTipoValue = filterTipo ? filterTipo.value.trim().toUpperCase() : '';
    const filterClaseValue = filterClase ? filterClase.value.trim().toUpperCase() : '';
    const filterSituacionValue = filterSituacion ? filterSituacion.value.trim().toUpperCase() : '';
    const filterEstatusValue = filterEstatus ? filterEstatus.value.trim().toUpperCase() : '';
    const filterUnidadValue = filterUnidad ? filterUnidad.value.trim().toUpperCase() : '';
    const filterEPMValue = filterEPM ? filterEPM.value.trim().toUpperCase() : '';
    const filterEPPValue = filterEPP ? filterEPP.value.trim().toUpperCase() : '';
    
    console.log('Filtros aplicados:', {
        tipo: filterTipoValue || 'TODOS',
        clase: filterClaseValue || 'TODAS',
        situacion: filterSituacionValue || 'TODAS',
        estatus: filterEstatusValue || 'TODOS',
        unidad: filterUnidadValue || 'TODAS',
        epm: filterEPMValue || 'TODOS',
        epp: filterEPPValue || 'TODOS'
    });
    
    // Filtrar vehículos
    filteredVehicles = allVehicles.filter(v => {
        const matchesTipo = !filterTipoValue || (v.tipo && v.tipo.trim().toUpperCase() === filterTipoValue);
        const matchesClase = !filterClaseValue || (v.clase && v.clase.trim().toUpperCase() === filterClaseValue);
        const matchesSituacion = !filterSituacionValue || (v.situacion && v.situacion.trim().toUpperCase() === filterSituacionValue);
        const matchesEstatus = !filterEstatusValue || (v.estatus && v.estatus.trim().toUpperCase() === filterEstatusValue);
        const matchesUnidad = !filterUnidadValue || (v.unidad_administrativa && v.unidad_administrativa.trim().toUpperCase() === filterUnidadValue);
        const matchesEPM = !filterEPMValue || (v.epm && v.epm.trim().toUpperCase() === filterEPMValue);
        const matchesEPP = !filterEPPValue || (v.epp && v.epp.trim().toUpperCase() === filterEPPValue);
        
        return matchesTipo && matchesClase && matchesSituacion && matchesEstatus && matchesUnidad && matchesEPM && matchesEPP;
    });
    
    console.log(`Vehículos filtrados: ${filteredVehicles.length} de ${allVehicles.length}`);
    currentPage = 1;
    renderTable();
    renderPagination();
}

// Limpiar filtros
function limpiarFiltros() {
    if (filterTipo) filterTipo.value = '';
    if (filterClase) filterClase.value = '';
    if (filterSituacion) filterSituacion.value = '';
    if (filterEstatus) filterEstatus.value = '';
    if (filterUnidad) filterUnidad.value = '';
    if (filterEPM) filterEPM.value = '';
    if (filterEPP) filterEPP.value = '';
    if (searchInput) searchInput.value = '';
    aplicarFiltros();
}

// Exportar a Excel con TODOS los datos completos
function exportarExcel() {
    if (filteredVehicles.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Preparar datos completos según estructura CSV
    const datosCompletos = filteredVehicles.map(v => ({
        id: v.id || '',
        marca: v.marca || '',
        modelo: v.modelo || '',
        tipo: v.tipo || '',
        clase: v.clase || '',
        ano: v.ano || '',
        color: v.color || '',
        s_carroceria: v.s_carroceria || '',
        s_motor: v.s_motor || '',
        placa: v.placa || '',
        facsimil: v.facsimil || '',
        n_identificacion: v.n_identificacion || '',
        situacion: v.situacion || '',
        unidad_administrativa: v.unidad_administrativa || '',
        redip: v.redip || '',
        ccpe: v.ccpe || '',
        epm: v.epm || '',
        epp: v.epp || '',
        ubicacion_fisica: v.ubicacion_fisica || '',
        asignacion: v.asignacion || '',
        estatus: v.estatus || '',
        observacion: v.observacion || '',
        certificado_origen: v.certificado_origen || '',
        fecha_inspeccion: v.fecha_inspeccion || '',
        n_tramite: v.n_tramite || '',
        ubicacion_titulo: v.ubicacion_titulo || '',
        observacion_extra: v.observacion_extra || '',
        created_at: v.created_at || ''
    }));
    
    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosCompletos);
    
    // Ajustar ancho de columnas
    const wscols = [
        {wch: 10}, {wch: 20}, {wch: 20}, {wch: 15}, {wch: 15},
        {wch: 10}, {wch: 15}, {wch: 25}, {wch: 25}, {wch: 15},
        {wch: 15}, {wch: 15}, {wch: 20}, {wch: 40}, {wch: 15},
        {wch: 15}, {wch: 20}, {wch: 30}, {wch: 30}, {wch: 15},
        {wch: 15}, {wch: 50}, {wch: 20}, {wch: 20}, {wch: 20},
        {wch: 30}, {wch: 50}, {wch: 25}
    ];
    ws['!cols'] = wscols;
    
    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vehículos');
    
    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `Vehiculos_${fecha}_${filteredVehicles.length}registros.xlsx`;
    
    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
    
    console.log(`Exportados ${filteredVehicles.length} vehículos a Excel`);
}

// Renderizar tabla
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageVehicles = filteredVehicles.slice(start, end);
    
    if (pageVehicles.length === 0) {
        document.getElementById('vehiclesTableBody').innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: #666;">
                    No hay vehículos que mostrar
                </td>
            </tr>
        `;
        document.getElementById('resultsCount').textContent = '0 vehículos encontrados';
        return;
    }
    
    document.getElementById('vehiclesTableBody').innerHTML = pageVehicles.map(v => `
        <tr onclick="openFicha('${v.id || ''}')">
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
            <td>${getEstatusBadge(v.estatus)}</td>
        </tr>
    `).join('');
    
    document.getElementById('resultsCount').textContent = `${filteredVehicles.length} vehículos encontrados`;
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${Math.ceil(filteredVehicles.length / itemsPerPage)}`;
}

// Renderizar paginación
function renderPagination() {
    const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
    const pagination = document.getElementById('pagination');
    
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
            html += `<span style="padding: 0 5px;">...</span>`;
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

// Abrir ficha modal con TODOS los datos
function openFicha(id) {
    const vehicle = allVehicles.find(v => v.id == id);
    if (!vehicle) {
        alert('Vehículo no encontrado');
        return;
    }
    
    currentVehicle = vehicle;
    
    // Preparar todos los campos completos
    const camposFicha = [
        { label: 'ID', value: vehicle.id },
        { label: 'Placa', value: vehicle.placa },
        { label: 'Facsímil', value: vehicle.facsimil },
        { label: 'Marca', value: vehicle.marca },
        { label: 'Modelo', value: vehicle.modelo },
        { label: 'Tipo', value: vehicle.tipo },
        { label: 'Clase', value: vehicle.clase },
        { label: 'Año', value: vehicle.ano },
        { label: 'Color', value: vehicle.color },
        { label: 'S/Carrocería', value: vehicle.s_carroceria },
        { label: 'S/Motor', value: vehicle.s_motor },
        { label: 'N° Identificación', value: vehicle.n_identificacion },
        { label: 'Situación', value: vehicle.situacion },
        { label: 'Unidad Administrativa', value: vehicle.unidad_administrativa },
        { label: 'REDIP', value: vehicle.redip },
        { label: 'CCPE', value: vehicle.ccpe },
        { label: 'EPM', value: vehicle.epm },
        { label: 'EPP', value: vehicle.epp },
        { label: 'Ubicación Física', value: vehicle.ubicacion_fisica },
        { label: 'Asignación', value: vehicle.asignacion },
        { label: 'Estatus', value: vehicle.estatus },
        { label: 'Certificado de Origen', value: vehicle.certificado_origen },
        { label: 'Fecha Inspección', value: vehicle.fecha_inspeccion },
        { label: 'N° Trámite', value: vehicle.n_tramite },
        { label: 'Ubicación Título', value: vehicle.ubicacion_titulo },
        { label: 'Observación Extra', value: vehicle.observacion_extra },
        { label: 'Creado', value: vehicle.created_at ? new Date(vehicle.created_at).toLocaleString() : '' }
    ];
    
    // Generar HTML de la ficha
    const fichaHTML = camposFicha.map(campo => `
        <div class="ficha-field">
            <label>${campo.label}</label>
            <span>${campo.value || 'N/A'}</span>
        </div>
    `).join('');
    
    document.getElementById('fichaData').innerHTML = fichaHTML;
    
    // Mostrar observación si existe
    const obsDiv = document.getElementById('fichaObservacion');
    if (vehicle.observacion) {
        document.getElementById('observacionText').textContent = vehicle.observacion;
        obsDiv.style.display = 'block';
    } else {
        obsDiv.style.display = 'none';
    }
    
    // Mostrar modal
    document.getElementById('modalFicha').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Cerrar ficha
function cerrarFicha() {
    document.getElementById('modalFicha').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentVehicle = null;
}

// Cerrar modal al hacer click fuera
window.onclick = function(event) {
    const modal = document.getElementById('modalFicha');
    if (event.target === modal) {
        cerrarFicha();
    }
}

// Exportar ficha a PDF
function exportarPDF() {
    if (!currentVehicle) return;
    
    const element = document.getElementById('fichaContent');
    const opt = {
        margin: 10,
        filename: `Ficha_Vehiculo_${currentVehicle.placa || currentVehicle.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // Ocultar botones temporalmente
    const footer = document.querySelector('.modal-footer');
    const closeBtn = document.querySelector('.modal-close');
    footer.style.display = 'none';
    closeBtn.style.display = 'none';
    
    html2pdf().set(opt).from(element).save().then(() => {
        // Restaurar botones
        footer.style.display = 'flex';
        closeBtn.style.display = 'block';
    });
}

// Imprimir ficha
function imprimirFicha() {
    window.print();
}

// Badge de estatus
function getEstatusBadge(estatus) {
    if (!estatus) return '<span class="badge badge-desincorporada">N/A</span>';
    const estatusUpper = estatus.toUpperCase();
    let className = 'badge-desincorporada';
    if (estatusUpper.includes('OPERATIVA') && !estatusUpper.includes('INOPERATIVA')) className = 'badge-operativa';
    else if (estatusUpper.includes('INOPERATIVA')) className = 'badge-inoperativa';
    else if (estatusUpper.includes('REPARACION')) className = 'badge-reparacion';
    return `<span class="badge ${className}">${estatus}</span>`;
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando consulta de vehículos...');
    getDOMElements();
    cargarVehiculos();
    setupSearchEnter();
    
    // Event listeners para filtros
    if (filterTipo) filterTipo.addEventListener('change', aplicarFiltros);
    if (filterClase) filterClase.addEventListener('change', aplicarFiltros);
    if (filterSituacion) filterSituacion.addEventListener('change', aplicarFiltros);
    if (filterEstatus) filterEstatus.addEventListener('change', aplicarFiltros);
    if (filterUnidad) filterUnidad.addEventListener('change', aplicarFiltros);
    if (filterEPM) filterEPM.addEventListener('change', aplicarFiltros);
    if (filterEPP) filterEPP.addEventListener('change', aplicarFiltros);
});
// Mostrar usuario autenticado
async function mostrarUsuarioAutenticado() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Error obteniendo sesión:', error);
            return;
        }
        
        const userEmail = document.getElementById('userEmail');
        
        if (session?.user?.email) {
            // Mostrar solo la parte antes del @ si es muy largo
            const email = session.user.email;
            const nombreMostrar = email.length > 25 
                ? email.split('@')[0].substring(0, 22) + '...' 
                : email;
            userEmail.textContent = nombreMostrar;
            userEmail.title = email; // Tooltip con email completo
        } else {
            userEmail.textContent = 'Invitado';
        }
    } catch (err) {
        console.error('Error mostrando usuario:', err);
    }
}
