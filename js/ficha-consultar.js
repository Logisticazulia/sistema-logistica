/**
 * ========================================
 * FICHA-CONSULTAR.JS
 * Sistema de Consulta de Fichas Técnicas
 * CCPE ZULIA - REDIP OCCIDENTAL
 * ========================================
 */

// ================= VARIABLES GLOBALES =================
let fichasData = [];
let fichasFiltradas = [];
let paginaActual = 1;
const POR_PAGINA = 15;
let supabaseClient = null;

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Validar configuración
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
      throw new Error('Configuración de Supabase no disponible');
    }

    // Inicializar cliente Supabase
    supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

    // Mostrar usuario logueado
    await cargarUsuarioLogueado();

    // Configurar eventos
    configurarEventos();

    // Cargar fichas al iniciar (opcional - comentar si prefieres búsqueda manual)
    // await cargarFichasIniciales();

  } catch (error) {
    console.error('❌ Error de inicialización:', error);
    mostrarAlerta('Error al conectar con el sistema. Verifica tu conexión.', 'error');
  }
});

// ================= USUARIO LOGUEADO =================
async function cargarUsuarioLogueado() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const email = session?.user?.email || 'usuario@institucion.com';
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = email;
  } catch (error) {
    console.warn('⚠️ No se pudo cargar el usuario:', error);
  }
}

// ================= EVENTOS =================
function configurarEventos() {
  // Búsqueda con Enter
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') buscarFichas();
    });
  }

  // Filtro de tipo (Moto/Vehículo)
  const filtroTipo = document.getElementById('filtroTipo');
  if (filtroTipo) {
    filtroTipo.addEventListener('change', () => {
      paginaActual = 1;
      aplicarFiltros();
    });
  }

  // Botones de paginación
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  if (prevBtn) prevBtn.addEventListener('click', () => cambiarPagina(paginaActual - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => cambiarPagina(paginaActual + 1));

  // Modal: cerrar con X o clic fuera
  const modalClose = document.querySelector('.modal-close');
  const modal = document.getElementById('fichaModal');
  if (modalClose) modalClose.addEventListener('click', cerrarModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrarModal();
    });
  }

  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = '../login.html';
    });
  }
}

// ================= BÚSQUEDA PRINCIPAL =================
window.buscarVehiculo = async function() {
  await buscarFichas();
};

async function buscarFichas() {
  const termino = document.getElementById('searchInput')?.value.trim() || '';
  const btn = document.getElementById('btnSearch');
  
  // UI de carga
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span><span>Buscando...</span>';
  }
  mostrarTablaCargando(true);

  try {
    // Consulta base
    let query = supabaseClient
      .from('fichas_tecnicas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000); // Límite para rendimiento

    // Filtro por texto en múltiples campos
    if (termino) {
      query = query.or(
        `placa.ilike.%${termino}%,facsimil.ilike.%${termino}%,s_carroceria.ilike.%${termino}%,s_motor.ilike.%${termino}%,marca.ilike.%${termino}%,modelo.ilike.%${termino}%`
      );
    }

    const { data, error } = await query;
    
    if (error) throw error;

    // Guardar datos y aplicar filtros
    fichasData = data || [];
    paginaActual = 1;
    aplicarFiltros();
    
    mostrarAlerta(`✅ ${fichasData.length} registro(s) encontrado(s)`, 'success');
    
  } catch (err) {
    console.error('❌ Error en búsqueda:', err);
    mostrarAlerta('Error al consultar la base de datos. Intente nuevamente.', 'error');
    fichasData = [];
    fichasFiltradas = [];
    renderizarTabla();
  } finally {
    // Restaurar botón
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🔍</span><span>Buscar</span>';
    }
  }
}

// ================= LIMPIAR BÚSQUEDA =================
window.limpiarBusqueda = function() {
  const searchInput = document.getElementById('searchInput');
  const filtroTipo = document.getElementById('filtroTipo');
  
  if (searchInput) searchInput.value = '';
  if (filtroTipo) filtroTipo.value = 'todos';
  
  fichasData = [];
  fichasFiltradas = [];
  paginaActual = 1;
  
  renderizarTabla();
  renderizarPaginacion();
  ocultarAlerta();
};

// ================= FILTROS =================
function aplicarFiltros() {
  const filtroValor = document.getElementById('filtroTipo')?.value || 'todos';
  
  fichasFiltradas = fichasData.filter(ficha => {
    // Detectar si es moto (columnas tipo o clase)
    const tipo = (ficha.tipo || '').toUpperCase();
    const clase = (ficha.clase || '').toUpperCase();
    const esMoto = tipo.includes('MOTO') || clase.includes('MOTO') || tipo === 'ENDURO';
    
    // Aplicar filtro de tipo
    if (filtroValor === 'moto' && !esMoto) return false;
    if (filtroValor === 'vehiculo' && esMoto) return false;
    
    return true;
  });
  
  renderizarTabla();
  renderizarPaginacion();
}

// ================= RENDERIZAR TABLA =================
function renderizarTabla() {
  const tbody = document.getElementById('resultsBody');
  if (!tbody) return;

  // Mensaje si no hay datos
  if (fichasFiltradas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:40px;color:#666;font-size:15px">
          📭 No se encontraron registros. Ajuste los filtros o realice una nueva búsqueda.
        </td>
      </tr>`;
    return;
  }

  // Calcular página actual
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const fin = inicio + POR_PAGINA;
  const paginaData = fichasFiltradas.slice(inicio, fin);

  // Generar filas
  tbody.innerHTML = paginaData.map(ficha => {
    const placa = escapeHtml(ficha.placa || '-');
    const marca = escapeHtml(ficha.marca || '-');
    const modelo = escapeHtml(ficha.modelo || '-');
    const tipo = escapeHtml(ficha.tipo || '-');
    const color = escapeHtml(ficha.color || '-');
    const estatus = escapeHtml(ficha.estatus_ficha || 'N/A');
    const dependencia = escapeHtml(ficha.dependencia || '-');
    const id = ficha.id;
    const estatusClass = getEstatusClass(ficha.estatus_ficha);
    
    return `
      <tr>
        <td><strong>${placa}</strong></td>
        <td>${marca}</td>
        <td>${modelo}</td>
        <td>${tipo}</td>
        <td>${color}</td>
        <td><span class="status-badge ${estatusClass}">${estatus}</span></td>
        <td>${dependencia}</td>
        <td>
          <button class="btn-view" onclick="verDetalle('${id}')">👁️ Ver Ficha</button>
          <button class="btn-print" onclick="imprimirDesdeTabla('${id}')">🖨️</button>
        </td>
      </tr>
    `;
  }).join('');
}

// ================= PAGINACIÓN =================
function renderizarPaginacion() {
  const total = fichasFiltradas.length;
  const totalPages = Math.max(1, Math.ceil(total / POR_PAGINA));
  
  // Info de registros
  const inicio = total === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1;
  const fin = Math.min(paginaActual * POR_PAGINA, total);
  const infoEl = document.getElementById('paginationInfo');
  if (infoEl) {
    infoEl.textContent = `Mostrando ${inicio} - ${fin} de ${total} registros`;
  }

  // Botones Anterior/Siguiente
  const prevBtn = document.getElementById('prevPage');
