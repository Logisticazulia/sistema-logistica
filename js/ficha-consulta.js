// ============================================
// CONSULTAR FICHAS TÉCNICAS - LÓGICA
// ============================================

// Configuración de Supabase
const supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_KEY
);

let allFichas = [];
let filteredFichas = [];
let currentPage = 1;
const itemsPerPage = 20;
let currentFicha = null; // Ficha seleccionada para el modal

// Referencias a elementos del DOM
let filterTipo, filterClase, filterEstatus, searchInput;

// Obtener referencias a elementos del DOM
function getDOMElements() {
    filterTipo = document.getElementById('filterTipo');
    filterClase = document.getElementById('filterClase');
    filterEstatus = document.getElementById('filterEstatus');
    searchInput = document.getElementById('searchInput');
}

// Cargar fichas técnicas
async function cargarFichas() {
    try {
        console.log('Cargando fichas técnicas desde Supabase...');
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .order('marca', { ascending: true });
        
        if (error) {
            console.error('Error al cargar:', error);
            throw error;
        }
        
        console.log(`Fichas cargadas: ${data ? data.length : 0}`);
        allFichas = data || [];
        filteredFichas = [...allFichas];
        
        // Aplicar filtros iniciales
        aplicarFiltros();
    } catch (error) {
        console.error('Error cargando fichas:', error);
        document.getElementById('fichasTableBody').innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #dc2626;">
                    Error al cargar los datos: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Buscar fichas
async function buscarFichas() {
    if (!searchInput) getDOMElements();
    const searchTerm = searchInput ? searchInput.value.trim().toUpperCase() : '';
    
    if (!searchTerm) {
        aplicarFiltros();
        return;
    }
    
    console.log('Búsqueda:', searchTerm);
    
    try {
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .or(`placa.ilike.%${searchTerm}%,facsimil.ilike.%${searchTerm}%,s_carroceria.ilike.%${searchTerm}%,s_motor.ilike.%${searchTerm}%`)
            .order('marca', { ascending: true });
        
        if (error) {
            console.error('Error en búsqueda:', error);
            throw error;
        }
        
        filteredFichas = data || [];
        console.log(`Fichas encontradas: ${filteredFichas.length}`);
        currentPage = 1;
        renderTable();
        renderPagination();
    } catch (error) {
        console.error('Error buscando fichas:', error);
        alert('Error al buscar: ' + error.message);
    }
}

// Permitir buscar con Enter
function setupSearchEnter() {
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarFichas();
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
    const filterEstatusValue = filterEstatus ? filterEstatus.value.trim().toUpperCase() : '';
    
    console.log('Filtros aplicados:', {
        tipo: filterTipoValue || 'TODOS',
        clase: filterClaseValue || 'TODAS',
        estatus: filterEstatusValue || 'TODOS'
    });
    
    // Filtrar fichas
    filteredFichas = allFichas.filter(f => {
        const matchesTipo = !filterTipoValue || (f.tipo && f.tipo.trim().toUpperCase() === filterTipoValue);
        const matchesClase = !filterClaseValue || (f.clase && f.clase.trim().toUpperCase() === filterClaseValue);
        const matchesEstatus = !filterEstatusValue || (f.estatus_ficha && f.estatus_ficha.trim().toUpperCase() === filterEstatusValue);
        
        return matchesTipo && matchesClase && matchesEstatus;
    });
    
    console.log(`Fichas filtradas: ${filteredFichas.length} de ${allFichas.length}`);
    currentPage = 1;
    renderTable();
    renderPagination();
}

// Limpiar filtros
function limpiarFiltros() {
    if (filterTipo) filterTipo.value = '';
    if (filterClase) filterClase.value = '';
    if (filterEstatus) filterEstatus.value = '';
    if (searchInput) searchInput.value = '';
    filteredFichas = [...allFichas];
    currentPage = 1;
    renderTable();
    renderPagination();
}

// Exportar a Excel
function exportarExcel() {
    if (filteredFichas.length === 0) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Preparar datos completos
    const datosCompletos = filteredFichas.map(f => ({
        id: f.id || '',
        marca: f.marca || '',
        modelo: f.modelo || '',
        tipo: f.tipo || '',
        clase: f.clase || '',
        color: f.color || '',
        s_carroceria: f.s_carroceria || '',
        s_motor: f.s_motor || '',
        placa: f.placa || '',
        facsimil: f.facsimil || '',
        estatus_ficha: f.estatus_ficha || '',
        dependencia: f.dependencia || '',
        causa: f.causa || '',
        mecanica: f.mecanica || '',
        diagnostico: f.diagnostico || '',
        ubicacion: f.ubicacion || '',
        tapiceria: f.tapiceria || '',
        cauchos: f.cauchos || '',
        luces: f.luces || '',
        observaciones: f.observaciones || '',
        created_at: f.created_at || ''
    }));
    
    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosCompletos);
    
    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fichas Técnicas');
    
    // Generar nombre de archivo con fecha
    const fecha = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `Fichas_Tecnicas_${fecha}_${filteredFichas.length}registros.xlsx`;
    
    // Descargar archivo
    XLSX.writeFile(wb, nombreArchivo);
    console.log(`Exportadas ${filteredFichas.length} fichas a Excel`);
}

// Renderizar tabla
function renderTable() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageFichas = filteredFichas.slice(start, end);
    
    if (pageFichas.length === 0) {
        document.getElementById('fichasTableBody').innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #666;">
                    No hay fichas que mostrar
                </td>
            </tr>
        `;
        document.getElementById('resultsCount').textContent = '0 fichas encontradas';
        return;
    }
    
    document.getElementById('fichasTableBody').innerHTML = pageFichas.map(f => `
        <tr onclick="openFicha('${f.id || ''}')">
            <td>${f.placa || 'N/A'}</td>
            <td>${f.facsimil || 'N/A'}</td>
            <td>${f.marca || 'N/A'}</td>
            <td>${f.modelo || 'N/A'}</td>
            <td>${f.tipo || 'N/A'}</td>
            <td>${f.clase || 'N/A'}</td>
            <td>${f.s_carroceria ? f.s_carroceria.substring(0, 15) + '...' : 'N/A'}</td>
            <td>${f.s_motor || 'N/A'}</td>
            <td>${getEstatusBadge(f.estatus_ficha)}</td>
        </tr>
    `).join('');
    
    document.getElementById('resultsCount').textContent = `${filteredFichas.length} fichas encontradas`;
    document.getElementById('pageInfo').textContent = `Página ${currentPage} de ${Math.ceil(filteredFichas.length / itemsPerPage)}`;
}

// Renderizar paginación
function renderPagination() {
    const totalPages = Math.ceil(filteredFichas.length / itemsPerPage);
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
    const totalPages = Math.ceil(filteredFichas.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    renderPagination();
}

// Abrir ficha modal
function openFicha(id) {
    const ficha = allFichas.find(f => f.id == id);
    if (!ficha) {
        alert('Ficha no encontrada');
        return;
    }
    
    currentFicha = ficha;
    
    // Preparar todos los campos completos
    const camposFicha = [
        { label: 'Marca', value: ficha.marca },
        { label: 'Modelo', value: ficha.modelo },
        { label: 'Tipo', value: ficha.tipo },
        { label: 'Clase', value: ficha.clase },
        { label: 'Color', value: ficha.color },
        { label: 'Placa', value: ficha.placa },
        { label: 'Facsímil', value: ficha.facsimil },
        { label: 'Serial Carrocería', value: ficha.s_carroceria },
        { label: 'Serial Motor', value: ficha.s_motor },
        { label: 'Estatus', value: ficha.estatus_ficha },
        { label: 'Dependencia', value: ficha.dependencia },
        { label: 'Causa', value: ficha.causa },
        { label: 'Mecánica', value: ficha.mecanica },
        { label: 'Diagnóstico', value: ficha.diagnostico },
        { label: 'Ubicación', value: ficha.ubicacion },
        { label: 'Tapicería', value: ficha.tapiceria },
        { label: 'Cauchos', value: ficha.cauchos },
        { label: 'Luces', value: ficha.luces },
        { label: 'Creado', value: ficha.created_at ? new Date(ficha.created_at).toLocaleString() : '' }
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
    if (ficha.observaciones) {
        document.getElementById('observacionText').textContent = ficha.observaciones;
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
    currentFicha = null;
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
    if (!currentFicha) return;
    const element = document.getElementById('fichaContent');
    const opt = {
        margin: 10,
        filename: `Ficha_Tecnica_${currentFicha.placa || currentFicha.id}.pdf`,
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
    
    if (estatusUpper.includes('OPERATIVA') && !estatusUpper.includes('INOPERATIVA')) 
        className = 'badge-operativa';
    else if (estatusUpper.includes('INOPERATIVA')) 
        className = 'badge-inoperativa';
    else if (estatusUpper.includes('REPARACION')) 
        className = 'badge-reparacion';
    
    return `<span class="badge ${className}">${estatus}</span>`;
}

// Cargar usuario
async function cargarUsuario() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user && session.user.email) {
            document.getElementById('userEmail').textContent = session.user.email;
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}

// Cerrar sesión
async function cerrarSesion() {
    try {
        await supabaseClient.auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.location.href = '../index.html';
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando consulta de fichas técnicas...');
    getDOMElements();
    cargarFichas();
    setupSearchEnter();
    cargarUsuario();
    
    // Event listeners para filtros
    if (filterTipo) filterTipo.addEventListener('change', aplicarFiltros);
    if (filterClase) filterClase.addEventListener('change', aplicarFiltros);
    if (filterEstatus) filterEstatus.addEventListener('change', aplicarFiltros);
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
});
