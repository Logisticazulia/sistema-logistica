// ============================================
// CONSULTAR FICHAS TÉCNICAS - LÓGICA OPTIMIZADA
// ============================================
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let fichasEncontradas = [];
let fichasFiltradas = [];
let paginaActual = 1;
const ITEMS_POR_PAGINA = 15;

// ============================================
// BÚSQUEDA EN SUPABASE
// ============================================
async function buscarFichas() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toUpperCase();
    const btnSearch = document.getElementById('btnSearch');

    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }

    btnSearch.disabled = true;
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');

    try {
        // Búsqueda parcial (case-insensitive) en múltiples campos
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .or(`placa.ilike.%${searchTerm}%,facsimil.ilike.%${searchTerm}%,s_carroceria.ilike.%${searchTerm}%,s_motor.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%,modelo.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        fichasEncontradas = data || [];
        paginaActual = 1;
        aplicarFiltroYPaginacion();
        
        mostrarAlerta(
            fichasEncontradas.length > 0 ? `✅ Se encontraron ${fichasEncontradas.length} registro(s)` : '❌ No se encontraron resultados', 
            fichasEncontradas.length > 0 ? 'success' : 'error'
        );
    } catch (error) {
        console.error('❌ Error en buscarFichas:', error);
        mostrarAlerta('❌ Error al buscar: ' + error.message, 'error');
    } finally {
        btnSearch.disabled = false;
    }
}

// ============================================
// FILTRO Y PAGINACIÓN
// ============================================
function aplicarFiltroYPaginacion() {
    const tipoFilter = document.getElementById('tipoFilter').value;
    
    if (fichasEncontradas.length === 0) {
        fichasFiltradas = [];
        renderizarTabla();
        renderizarPaginacion();
        return;
    }

    // Filtrar por tipo
    if (tipoFilter === 'todos') {
        fichasFiltradas = [...fichasEncontradas];
    } else if (tipoFilter === 'motos') {
        fichasFiltradas = fichasEncontradas.filter(f => f.tipo && f.tipo.toLowerCase().includes('moto'));
    } else if (tipoFilter === 'vehiculos') {
        fichasFiltradas = fichasEncontradas.filter(f => f.tipo && !f.tipo.toLowerCase().includes('moto'));
    }

    paginaActual = 1; // Reset a página 1 al cambiar filtro
    renderizarTabla();
    renderizarPaginacion();
}

function renderizarTabla() {
    const tbody = document.getElementById('resultsBody');
    const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
    const fin = inicio + ITEMS_POR_PAGINA;
    const datosPagina = fichasFiltradas.slice(inicio, fin);

    if (datosPagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">📭 No hay resultados para esta página</td></tr>`;
        return;
    }

    tbody.innerHTML = datosPagina.map(ficha => `
        <tr>
            <td>${ficha.placa || 'N/A'}</td>
            <td>${ficha.marca || 'N/A'}</td>
            <td>${ficha.modelo || 'N/A'}</td>
            <td>${ficha.tipo || 'N/A'}</td>
            <td>${ficha.color || 'N/A'}</td>
            <td>${ficha.estatus_ficha || 'N/A'}</td>
            <td>${ficha.dependencia || 'N/A'}</td>
            <td>
                <button class="btn-view" onclick="verFicha('${ficha.id}')">👁️ Ver</button>
                <button class="btn-print" onclick="verFicha('${ficha.id}'); setTimeout(()=>window.print(), 300)">🖨️ Imprimir</button>
            </td>
        </tr>
    `).join('');
}

function renderizarPaginacion() {
    const container = document.getElementById('paginationControls');
    const totalPaginas = Math.ceil(fichasFiltradas.length / ITEMS_POR_PAGINA);
    
    if (totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <button class="pagination-btn" onclick="cambiarPagina(${paginaActual - 1})" ${paginaActual === 1 ? 'disabled' : ''}>⬅️ Anterior</button>
        <span class="page-info">Página ${paginaActual} de ${totalPaginas} (${fichasFiltradas.length} total)</span>
        <button class="pagination-btn" onclick="cambiarPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? 'disabled' : ''}>Siguiente ➡️</button>
    `;
}

function cambiarPagina(nuevaPagina) {
    const totalPaginas = Math.ceil(fichasFiltradas.length / ITEMS_POR_PAGINA);
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    
    paginaActual = nuevaPagina;
    renderizarTabla();
    renderizarPaginacion();
    document.getElementById('resultsTable').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// MODAL Y UTILIDADES
// ============================================
function verFicha(id) {
    const ficha = fichasEncontradas.find(f => f.id == id) || fichasFiltradas.find(f => f.id == id);
    if (!ficha) return mostrarAlerta('❌ Ficha no encontrada', 'error');

    const campos = ['Marca','Modelo','Tipo','SerialCarroceria','Clase','Color','Placa','Facsimilar','Dependencia','SerialMotor','Estatus','Causa','Diagnostico','Mecanica','Ubicacion','Tapiceria','Cauchos','Luces','Observaciones','FechaCreacion','CreadoPor'];
    const mapeoDB = {
        'Marca': ficha.marca, 'Modelo': ficha.modelo, 'Tipo': ficha.tipo,
        'SerialCarroceria': ficha.s_carroceria, 'Clase': ficha.clase, 'Color': ficha.color,
        'Placa': ficha.placa, 'Facsimilar': ficha.facsimil, 'Dependencia': ficha.dependencia,
        'SerialMotor': ficha.s_motor, 'Estatus': ficha.estatus_ficha,
        'Causa': ficha.causa, 'Diagnostico': ficha.diagnostico, 'Mecanica': ficha.mecanica,
        'Ubicacion': ficha.ubicacion, 'Tapiceria': ficha.tapiceria, 'Cauchos': ficha.cauchos,
        'Luces': ficha.luces, 'Observaciones': ficha.observaciones || 'Sin observaciones',
        'FechaCreacion': ficha.created_at ? new Date(ficha.created_at).toLocaleString() : 'N/A',
        'CreadoPor': ficha.creado_por || 'Sistema'
    };

    campos.forEach(campo => {
        const el = document.getElementById(`modal${campo}`);
        if (el) el.textContent = mapeoDB[campo] || 'N/A';
    });

    // Cargar fotos
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById(`modalImg${i}`);
        const box = document.getElementById(`modalBox${i}`);
        const span = box.querySelector('span');
        const url = ficha[`foto${i}_url`];
        if (url) { img.src = url; img.style.display = 'block'; span.style.display = 'none'; }
        else { img.style.display = 'none'; span.style.display = 'block'; }
    }

    document.getElementById('fichaModal').style.display = 'flex';
}

function cerrarModal() { document.getElementById('fichaModal').style.display = 'none'; }
function imprimirFicha() { window.print(); }

function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    document.getElementById('tipoFilter').value = 'todos';
    document.getElementById('searchAlert').style.display = 'none';
    fichasEncontradas = [];
    fichasFiltradas = [];
    paginaActual = 1;
    document.getElementById('resultsBody').innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">📭 Realice una búsqueda para ver los resultados</td></tr>`;
    document.getElementById('paginationControls').innerHTML = '';
}

function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    alertDiv.textContent = mensaje;
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => alertDiv.style.display = 'none', 5000);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('searchInput').addEventListener('keypress', e => { if(e.key === 'Enter') buscarFichas(); });
    
    document.querySelector('.modal-close').addEventListener('click', cerrarModal);
    window.onclick = e => { if (e.target === document.getElementById('fichaModal')) cerrarModal(); };

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('¿Está seguro de cerrar sesión?')) {
                await supabaseClient.auth.signOut();
                window.location.href = '../index.html';
            }
        });
    }
    cargarUsuario();
});

async function cargarUsuario() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user?.email) document.getElementById('userEmail').textContent = session.user.email;
    } catch (error) { console.error('Error al cargar usuario:', error); }
}
