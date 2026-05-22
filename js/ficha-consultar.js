/**
 * ========================================
 * FICHA-CONSULTAR.JS - Versión Final
 * ========================================
 */

// Variables globales
let datosFichas = [];
let datosFiltrados = [];
let paginaActual = 1;
const POR_PAGINA = 15;
let supabase = null;

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Validar configuración
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
      throw new Error('Configuración de Supabase no cargada');
    }

    // Inicializar cliente Supabase
    supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

    // Mostrar usuario logueado
    await mostrarUsuarioLogueado();

    // Configurar eventos
    configurarEventos();

    // Cargar datos iniciales (opcional: comentar si prefieres búsqueda manual)
    // await cargarFichas();

  } catch (error) {
    console.error('❌ Error de inicialización:', error);
    mostrarAlerta('Error al conectar con el sistema. Recarga la página.', 'error');
  }
});

// ================= USUARIO LOGUEADO =================
async function mostrarUsuarioLogueado() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email || 'usuario@institucion.com';
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = email;
  } catch (error) {
    console.warn('⚠️ No se pudo obtener el usuario:', error);
  }
}

// ================= EVENTOS =================
function configurarEventos() {
  // Búsqueda con Enter
  document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscarFichas();
  });

  // Filtro tipo
  document.getElementById('filtroTipo')?.addEventListener('change', () => {
    paginaActual = 1;
    aplicarFiltros();
  });

  // Botones de paginación
  document.getElementById('prevPage')?.addEventListener('click', () => cambiarPagina(paginaActual - 1));
  document.getElementById('nextPage')?.addEventListener('click', () => cambiarPagina(paginaActual + 1));

  // Cerrar modal con X o clic fuera
  document.querySelector('.modal-close')?.addEventListener('click', cerrarModal);
  document.getElementById('fichaModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'fichaModal') cerrarModal();
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = '../login.html';
  });
}

// ================= BÚSQUEDA =================
window.buscarFichas = async () => {
  const termino = document.getElementById('searchInput')?.value.trim() || '';
  const btn = document.getElementById('btnSearch');
  
  // UI de carga
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span><span>Buscando...</span>';
  mostrarTablaCargando(true);

  try {
    let query = supabase
      .from('fichas_tecnicas')
      .select('*')
      .order('created_at', { ascending: false });

    // Filtro por texto en múltiples campos
    if (termino) {
      query = query.or(
        `placa.ilike.%${termino}%,facsimil.ilike.%${termino}%,s_carroceria.ilike.%${termino}%,s_motor.ilike.%${termino}%,marca.ilike.%${termino}%,modelo.ilike.%${termino}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    datosFichas = data || [];
    paginaActual = 1;
    aplicarFiltros();
    
    mostrarAlerta(`✅ ${datosFichas.length} registro(s) encontrado(s)`, 'success');
  } catch (err) {
    console.error('❌ Error en búsqueda:', err);
    mostrarAlerta('Error al consultar la base de datos', 'error');
    datosFichas = [];
    datosFiltrados = [];
    renderizarTabla();
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>🔍</span><span>Buscar</span>';
  }
};

// ================= FILTROS =================
function aplicarFiltros() {
  const filtroTipo = document.getElementById('filtroTipo')?.value || 'todos';
  const termino = document.getElementById('searchInput')?.value.trim().toLowerCase() || '';

  datosFiltrados = datosFichas.filter(item => {
    // Filtro por tipo (Moto / Vehículo)
    const tipo = (item.tipo || '').toUpperCase();
    const clase = (item.clase || '').toUpperCase();
    const esMoto = tipo.includes('MOTO') || clase.includes('MOTO') || tipo === 'ENDURO';
    
    if (filtroTipo === 'moto' && !esMoto) return false;
    if (filtroTipo === 'vehiculo' && esMoto) return false;

    // Filtro por texto (búsqueda adicional)
    if (termino) {
      const texto = `${item.placa} ${item.facsimil} ${item.marca} ${item.modelo} ${item.s_carroceria} ${item.s_motor}`.toLowerCase();
      if (!texto.includes(termino)) return false;
    }

    return true;
  });

  renderizarTabla();
  renderizarPaginacion();
}

// ================= TABLA =================
function renderizarTabla() {
  const tbody = document.getElementById('resultsBody');
  if (!tbody) return;

  if (datosFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center;padding:40px;color:#666">
          📭 No se encontraron registros. Ajusta los filtros o realiza una nueva búsqueda.
        </td>
      </tr>`;
    return;
  }

  // Calcular página actual
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const fin = inicio + POR_PAGINA;
  const paginaData = datosFiltrados.slice(inicio, fin);

  tbody.innerHTML = paginaData.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.placa || '-')}</strong></td>
      <td>${escapeHtml(item.marca || '-')}</td>
      <td>${escapeHtml(item.modelo || '-')}</td>
      <td>${escapeHtml(item.tipo || '-')}</td>
      <td>${escapeHtml(item.color || '-')}</td>
      <td><span class="status-badge ${getEstatusClass(item.estatus_ficha)}">${escapeHtml(item.estatus_ficha || 'N/A')}</span></td>
      <td>${escapeHtml(item.dependencia || '-')}</td>
      <td>
        <button class="btn-view" onclick="verDetalle('${item.id}')">👁️ Ver</button>
        <button class="btn-print" onclick="imprimirDesdeTabla('${item.id}')">🖨️</button>
      </td>
    </tr>
  `).join('');
}

// ================= PAGINACIÓN =================
function renderizarPaginacion() {
  const total = datosFiltrados.length;
  const totalPages = Math.max(1, Math.ceil(total / POR_PAGINA));
  
  // Info
  const inicio = total === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1;
  const fin = Math.min(paginaActual * POR_PAGINA, total);
  const infoEl = document.getElementById('paginationInfo');
  if (infoEl) infoEl.textContent = `Mostrando ${inicio} - ${fin} de ${total} registros`;

  // Botones
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  if (prevBtn) prevBtn.disabled = paginaActual <= 1;
  if (nextBtn) nextBtn.disabled = paginaActual >= totalPages;

  // Números de página
  const pageNumbers = document.getElementById('pageNumbers');
  if (!pageNumbers) return;
  
  pageNumbers.innerHTML = '';
  const maxVisible = 5;
  let start = Math.max(1, paginaActual - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  for (let i = start; i <= end; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${i === paginaActual ? 'active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => cambiarPagina(i);
    pageNumbers.appendChild(btn);
  }
}

function cambiarPagina(nueva) {
  const totalPages = Math.ceil(datosFiltrados.length / POR_PAGINA) || 1;
  if (nueva < 1 || nueva > totalPages) return;
  
  paginaActual = nueva;
  renderizarTabla();
  renderizarPaginacion();
  
  // Scroll suave a la tabla
  document.querySelector('.results-section')?.scrollIntoView({ behavior: 'smooth' });
}

// ================= MODAL =================
window.verDetalle = (id) => {
  const ficha = datosFichas.find(f => f.id == id);
  if (!ficha) return;

  // Mapeo seguro de campos
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '-'; };
  
  set('modalMarca', ficha.marca);
  set('modalModelo', ficha.modelo);
  set('modalTipo', ficha.tipo);
  set('modalClase', ficha.clase);
  set('modalColor', ficha.color);
  set('modalPlaca', ficha.placa);
  set('modalFacsimilar', ficha.facsimil);
  set('modalSerialCarroceria', ficha.s_carroceria);
  set('modalSerialMotor', ficha.s_motor);
  set('modalEstatus', ficha.estatus_ficha);
  set('modalDependencia', ficha.dependencia);
  set('modalCausa', ficha.causa);
  set('modalMecanica', ficha.mecanica);
  set('modalDiagnostico', ficha.diagnostico);
  set('modalUbicacion', ficha.ubicacion);
  set('modalTapiceria', ficha.tapiceria);
  set('modalCauchos', ficha.cauchos);
  set('modalLuces', ficha.luces);
  set('modalObservaciones', ficha.observaciones);
  set('modalCreadoPor', ficha.creado_por);

  // Fecha formateada
  if (ficha.fecha_creacion) {
    const f = new Date(ficha.fecha_creacion);
    set('modalFechaCreacion', `${f.toLocaleDateString('es-VE')} ${f.toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'})}`);
  }

  // Imágenes
  for (let i = 1; i <= 4; i++) {
    const url = ficha[`foto${i}_url`] || ficha[`foto${i}`];
    const img = document.getElementById(`modalImg${i}`);
    const box = document.getElementById(`modalBox${i}`);
    const placeholder = box?.querySelector('span');
    
    if (img && box && placeholder) {
      if (url && url.trim() !== '') {
        img.src = url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
      } else {
        img.style.display = 'none';
        placeholder.style.display = 'block';
      }
    }
  }

  // Mostrar modal
  const modal = document.getElementById('fichaModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

window.cerrarModal = () => {
  const modal = document.getElementById('fichaModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = 'auto';
};

// ================= IMPRESIÓN =================
window.imprimirDesdeTabla = (id) => {
  verDetalle(id);
  setTimeout(() => window.imprimirFicha(), 400);
};

window.imprimirFicha = () => {
  window.print();
};

// ================= UTILIDADES =================
function mostrarTablaCargando(mostrar) {
  const tbody = document.getElementById('resultsBody');
  if (!tbody) return;
  
  if (mostrar) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#003366">⏳ Cargando...</td></tr>`;
  }
}

function mostrarAlerta(mensaje, tipo) {
  const alert = document.getElementById('searchAlert');
  if (!alert) return;
  
  alert.className = `alert alert-${tipo}`;
  alert.textContent = mensaje;
  alert.style.display = 'block';
  setTimeout(() => alert.style.display = 'none', 5000);
}

function getEstatusClass(estatus) {
  const e = (estatus || '').toUpperCase();
  if (e.includes('OPERATIVO')) return 'status-ok';
  if (e.includes('REPARACION') || e.includes('TALLER')) return 'status-warn';
  if (e.includes('INOPERATIVO') || e.includes('DESINCORPORADO')) return 'status-bad';
  return '';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Agregar estilos para badges de estatus si no existen
if (!document.getElementById('estatus-styles')) {
  const style = document.createElement('style');
  style.id = 'estatus-styles';
  style.textContent = `
    .status-badge { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .status-ok { background: #d4edda; color: #155724; }
    .status-warn { background: #fff3cd; color: #856404; }
    .status-bad { background: #f8d7da; color: #721c24; }
  `;
  document.head.appendChild(style);
}
