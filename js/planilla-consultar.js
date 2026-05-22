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
// Buscar por Placa, Facsímil, Seriales o Número de Identificación
function buscarPorPlacaFacsímil() {
    if (!searchInput) getDOMElements();
    const searchTerm = searchInput ? searchInput.value.trim().toUpperCase() : '';
    if (!searchTerm) {
        aplicarFiltros();
        return;
    }
    console.log('Búsqueda por placa/facsímil/seriales/identificación:', searchTerm);
    filteredVehicles = allVehicles.filter(v => {
        const placaMatch = v.placa && v.placa.toString().trim().toUpperCase().includes(searchTerm);
        const facsimilMatch = v.facsimil && v.facsimil.toString().trim().toUpperCase().includes(searchTerm);
        const carroceriaMatch = v.s_carroceria && v.s_carroceria.toString().trim().toUpperCase().includes(searchTerm);
        const motorMatch = v.s_motor && v.s_motor.toString().trim().toUpperCase().includes(searchTerm);
        // 🔹 NUEVO: Búsqueda por número de identificación
        const nIdentificacionMatch = v.n_identificacion && v.n_identificacion.toString().trim().toUpperCase().includes(searchTerm);

        return placaMatch || facsimilMatch || carroceriaMatch || motorMatch || nIdentificacionMatch;
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
    const filterTipoValue = filterTipo ? filterTipo.value.trim().toUpperCase() : '';
    const filterClaseValue = filterClase ? filterClase.value.trim().toUpperCase() : '';
    const filterSituacionValue = filterSituacion ? filterSituacion.value.trim().toUpperCase() : '';
    const filterEstatusValue = filterEstatus ? filterEstatus.value.trim().toUpperCase() : '';
    const filterUnidadValue = filterUnidad ? filterUnidad.value.trim().toUpperCase() : '';
    const filterEPMValue = filterEPM ? filterEPM.value.trim().toUpperCase() : '';
    const filterEPPValue = filterEPP ? filterEPP.value.trim().toUpperCase() : '';

    filteredVehicles = allVehicles.filter(v => {
        // ✅ Usa includes() para mayor tolerancia a espacios o variaciones
        const matchesTipo = !filterTipoValue || (v.tipo && v.tipo.trim().toUpperCase().includes(filterTipoValue));
        const matchesClase = !filterClaseValue || (v.clase && v.clase.trim().toUpperCase().includes(filterClaseValue));
        const matchesSituacion = !filterSituacionValue || (v.situacion && v.situacion.trim().toUpperCase().includes(filterSituacionValue));
        const matchesEstatus = !filterEstatusValue || (v.estatus && v.estatus.trim().toUpperCase().includes(filterEstatusValue));
        const matchesUnidad = !filterUnidadValue || (v.unidad_administrativa && v.unidad_administrativa.trim().toUpperCase().includes(filterUnidadValue));
        const matchesEPM = !filterEPMValue || (v.epm && v.epm.trim().toUpperCase().includes(filterEPMValue));
        const matchesEPP = !filterEPPValue || (v.epp && v.epp.trim().toUpperCase().includes(filterEPPValue));
        return matchesTipo && matchesClase && matchesSituacion && matchesEstatus && matchesUnidad && matchesEPM && matchesEPP;
    });
    currentPage = 1;
    renderTable();
    renderPagination();
}
function limpiarFiltros() {
    if (filterTipo) filterTipo.value = '';
    if (filterClase) filterClase.value = '';
    if (filterSituacion) filterSituacion.value = '';
    if (filterEstatus) filterEstatus.value = '';
    
    // ✅ NUEVO: Limpiar y habilitar explícitamente
    if (filterUnidad) { filterUnidad.value = ''; filterUnidad.disabled = false; }
    if (filterEPM)    { filterEPM.value = '';    filterEPM.disabled = false;    }
    if (filterEPP)    { filterEPP.value = '';    filterEPP.disabled = false;    }
    
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

// Abrir ficha modal con diseño optimizado para PDF
function openFicha(id) {
    const vehicle = allVehicles.find(v => v.id == id);
    if (!vehicle) {
        alert('Vehículo no encontrado');
        return;
    }
    currentVehicle = vehicle;

    // Definimos los campos. Nota: El orden importa para el llenado de columnas (izq-der-izq-der)
    // Para mejor visualización, agrupamos datos relacionados si es posible, 
    // pero el Grid los distribuirá automáticamente.
    const campos = [
        { label: 'ID', value: vehicle.id },
        { label: 'PLACA', value: vehicle.placa },
        { label: 'FACSÍMIL', value: vehicle.facsimil },
        { label: 'MARCA', value: vehicle.marca },
        { label: 'MODELO', value: vehicle.modelo },
        { label: 'TIPO', value: vehicle.tipo },
        { label: 'CLASE', value: vehicle.clase },
        { label: 'AÑO', value: vehicle.ano },
        { label: 'COLOR', value: vehicle.color },
        { label: 'S/CARROCERÍA', value: vehicle.s_carroceria },
        { label: 'S/MOTOR', value: vehicle.s_motor },
        { label: 'N° IDENTIFICACIÓN', value: vehicle.n_identificacion },
        { label: 'SITUACIÓN', value: vehicle.situacion },
        { label: 'UNIDAD ADMINISTRATIVA', value: vehicle.unidad_administrativa },
        { label: 'REDIP', value: vehicle.redip },
        { label: 'CCPE', value: vehicle.ccpe },
        { label: 'EPM', value: vehicle.epm },
        { label: 'EPP', value: vehicle.epp },
        { label: 'UBICACIÓN FÍSICA', value: vehicle.ubicacion_fisica },
        { label: 'ASIGNACIÓN', value: vehicle.asignacion },
        { label: 'ESTATUS', value: vehicle.estatus },
        { label: 'CERTIFICADO DE ORIGEN', value: vehicle.certificado_origen },
        { label: 'FECHA INSPECCIÓN', value: vehicle.fecha_inspeccion },
        { label: 'N° TRÁMITE', value: vehicle.n_tramite },
        { label: 'UBICACIÓN TÍTULO', value: vehicle.ubicacion_titulo },
        { label: 'OBSERVACIÓN EXTRA', value: vehicle.observacion_extra },
        { label: 'CUADRANTE', value: vehicle.cuadrante },
        { label: 'COMUNA', value: vehicle.comuna },
        { label: 'CREADO', value: vehicle.created_at ? new Date(vehicle.created_at).toLocaleDateString() : '' }
    ];

    // Generar el HTML del Grid
    let fichaHTML = campos.map(campo => `
        <div class="ficha-field">
            <label>${campo.label}</label>
            <span>${campo.value || 'N/A'}</span>
        </div>
    `).join('');

    // Agregar Observación principal al final (ancho completo)
    if (vehicle.observacion) {
        fichaHTML += `
            <div class="ficha-field full-width">
                <label>OBSERVACIONES:</label>
                <span>${vehicle.observacion}</span>
            </div>
        `;
    }

    document.getElementById('fichaData').innerHTML = fichaHTML;

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
// Exportar ficha a PDF - VERSIÓN OPTIMIZADA 1 HOJA
function exportarPDF() {
    if (!currentVehicle) return;
    
    const exportNum = generarNumeroExportacion();
    const element = document.getElementById('fichaContent');
    
    // 1. Ocultar botones antes de exportar
    const footer = element.querySelector('.modal-footer');
    if (footer) footer.style.display = 'none';

    // 2. Agregar clase que activa el CSS de 2 columnas
    const dataContainer = document.getElementById('fichaData');
    dataContainer.classList.add('pdf-export-mode');

    // 3. Inyectar Header Temporal con logos (asegúrate de que las rutas de las imágenes sean correctas)
    // Si tus logos ya están en el HTML visible, puedes saltar este paso, 
    // pero esto asegura que salgan en el PDF.
    const headerHTML = `
        <div class="pdf-header" id="tempPdfHeader">
            <div style="font-size: 14px; font-weight: bold; color: #003366; margin-bottom: 5px;">
                REPÚBLICA BOLIVARIANA DE VENEZUELA<br>
                MINISTERIO DEL PODER POPULAR PARA RELACIONES INTERIORES, JUSTICIA Y PAZ<br>
                POLICÍA NACIONAL BOLIVARIANA - ESTADO ZULIA
            </div>
            <div style="display: flex; justify-content: center; align-items: center; gap: 20px;">
                <!-- Reemplaza src con la ruta real de tus logos si no se ven -->
                <img src="ruta/a/tu/logo_pnb.png" alt="PNB" style="height: 60px;" onerror="this.style.display='none'">
                <div style="text-align: center;">
                    <h2 style="margin: 0; font-size: 18px; color: #003366;">FICHA TÉCNICA DEL VEHÍCULO</h2>
                    <span style="font-size: 10px; color: #666;">N° Exportación: ${exportNum}</span>
                </div>
                <img src="ruta/a/tu/logo_zulia.png" alt="Zulia" style="height: 60px;" onerror="this.style.display='none'">
            </div>
        </div>
    `;
    dataContainer.insertAdjacentHTML('afterbegin', headerHTML);

    // 4. Configuración de html2pdf
    const opt = {
        margin:       [5, 5, 5, 5], // Márgenes muy reducidos (5mm)
        filename:     `Ficha_${currentVehicle.placa || currentVehicle.id}_${exportNum}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false }, // Scale 2 mejora nitidez sin romper layout
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 5. Generar y Limpiar
    html2pdf().set(opt).from(element).save().then(() => {
        // Restaurar vista original
        if (footer) footer.style.display = 'flex';
        dataContainer.classList.remove('pdf-export-mode');
        document.getElementById('tempPdfHeader')?.remove();
    });
}
/**
 * Genera un número único de exportación para el nombre del archivo PDF
 * Formato: EXPORT-AAAAMMDD-HHMMSS-XXX
 */
function generarNumeroExportacion() {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const hours = String(fecha.getHours()).padStart(2, '0');
    const minutes = String(fecha.getMinutes()).padStart(2, '0');
    const seconds = String(fecha.getSeconds()).padStart(2, '0');
    const random = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    
    return `EXPORT-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
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
// 🔹 FUNCIÓN: Bloqueo mutuo entre Unidad, EPM y EPP
function configurarExclusionFiltros() {
    if (!filterUnidad || !filterEPM || !filterEPP) return;

    function manejarCambio() {
        const tieneUnidad = filterUnidad.value.trim() !== '';
        const tieneEPM = filterEPM.value.trim() !== '';
        const tieneEPP = filterEPP.value.trim() !== '';

        // Si se elige Unidad → Bloquea EPM y EPP, y los limpia
        if (tieneUnidad) {
            filterEPM.disabled = true;
            filterEPP.disabled = true;
            filterEPM.value = '';
            filterEPP.value = '';
        } else {
            filterEPM.disabled = false;
            filterEPP.disabled = false;
        }

        // Si se elige EPM o EPP → Bloquea Unidad y la limpia
        if (tieneEPM || tieneEPP) {
            filterUnidad.disabled = true;
            filterUnidad.value = '';
        } else {
            filterUnidad.disabled = false;
        }

        aplicarFiltros(); // Recalcula la tabla automáticamente
    }

    filterUnidad.addEventListener('change', manejarCambio);
    filterEPM.addEventListener('change', manejarCambio);
    filterEPP.addEventListener('change', manejarCambio);
}
// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando consulta de vehículos...');
    mostrarUsuarioAutenticado();
    getDOMElements();
    cargarVehiculos();
    setupSearchEnter();
       const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    // Event listeners para filtros
    if (filterTipo) filterTipo.addEventListener('change', aplicarFiltros);
    if (filterClase) filterClase.addEventListener('change', aplicarFiltros);
    if (filterSituacion) filterSituacion.addEventListener('change', aplicarFiltros);
    if (filterEstatus) filterEstatus.addEventListener('change', aplicarFiltros);
 configurarExclusionFiltros(); 
    
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
// Función para cerrar sesión
async function cerrarSesion() {
    try {
        console.log('Cerrando sesión...');
        
        // Cerrar sesión en Supabase
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error('Error al cerrar sesión:', error);
            throw error;
        }
        
        // Limpiar datos locales si es necesario
        localStorage.clear();
        sessionStorage.clear();
        
        // 🔁 Redirigir al login (index.html en la raíz)
        // Ajusta la ruta según la ubicación real de planilla-consultar.html
        window.location.href = '../index.html';
        
    } catch (error) {
        console.error('Error en cerrarSesion:', error);
        // Forzar redirección incluso con error
        window.location.href = '../index.html';
    }
}
