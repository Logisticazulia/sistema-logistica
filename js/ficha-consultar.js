/**
 * ========================================
 * FICHA-CONSULTAR.JS - Versión Estable
 * ========================================
 */

let fichasData = [];
let fichasFiltradas = [];
let paginaActual = 1;
const POR_PAGINA = 15;
let supabaseClient = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
      throw new Error('Configuración de Supabase no disponible');
    }

    supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    await cargarUsuarioLogueado();
    configurarEventos();
  } catch (error) {
    console.error('❌ Error de inicialización:', error);
    mostrarAlerta('Error al conectar con el sistema. Verifica tu conexión.', 'error');
  }
});

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

function configurarEventos() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') buscarFichas();
    });
  }

  const filtroTipo = document.getElementById('filtroTipo');
  if (filtroTipo) {
    filtroTipo.addEventListener('change', () => {
      paginaActual = 1;
      aplicarFiltros();
    });
  }

  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  if (prevBtn) prevBtn.addEventListener('click', () => cambiarPagina(paginaActual - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => cambiarPagina(paginaActual + 1));

  const modalClose = document.querySelector('.modal-close');
  const modal = document.getElementById('fichaModal');
  if (modalClose) modalClose.addEventListener('click', cerrarModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrarModal();
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
      window.location.href = '../login.html';
    });
  }
}

// ================= FUNCIONES GLOBALES (para onclick en HTML) =================
window.buscarVehiculo = async function() {
  await buscarFichas();
};

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

async function buscarFichas() {
  const termino = document.getElementById('searchInput')?.value.trim() || '';
  const btn = document.getElementById('btnSearch');

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span><span>Buscando...</span>';
  }
  mostrarTablaCargando(true);

  try {
    let query = supabaseClient
      .from('fichas_tecnicas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);

    if (termino) {
      query = query.or(
        `placa.ilike.%${termino}%,facsimil.ilike.%${termino}%,s_carroceria.ilike.%${termino}%,s_motor.ilike.%${termino}%,marca.ilike.%${termino}%,modelo.ilike.%${termino}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

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
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🔍</span><span>Buscar</span>';
    }
  }
}

function aplicarFiltros() {
  const filtroValor = document.getElementById('filtroTipo')?.value || 'todos';
  fichasFiltradas = fichasData.filter(ficha => {
    const tipo = (ficha.tipo || '').toUpperCase();
    const clase = (ficha.clase || '').toUpperCase();
    const esMoto = tipo.includes('MOTO') || clase.includes('MOTO') || tipo === 'ENDURO';
    if (filtroValor === 'moto' && !esMoto) return false;
    if (filtroValor === 'vehiculo' && esMoto) return false;
    return true;
  });
  renderizarTabla();
  renderizarPaginacion();
}

function renderizarTabla() {
  const tbody = document.getElementById('resultsBody');
  if (!tbody) return;

  if (fichasFiltradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#666;font-size:15px">📭 No se encontraron registros. Ajuste los filtros o realice una nueva búsqueda.</td></tr>`;
    return;
  }

  const inicio = (paginaActual - 1) * POR_PAGINA;
  const fin = inicio + POR_PAGINA;
  const paginaData = fichasFiltradas.slice(inicio, fin);

  tbody.innerHTML = paginaData.map(ficha => `
    <tr>
      <td><strong>${escapeHtml(ficha.placa || '-')}</strong></td>
      <td>${escapeHtml(ficha.marca || '-')}</td>
      <td>${escapeHtml(ficha.modelo || '-')}</td>
      <td>${escapeHtml(ficha.tipo || '-')}</td>
      <td>${escapeHtml(ficha.color || '-')}</td>
      <td><span class="status-badge ${getEstatusClass(ficha.estatus_ficha)}">${escapeHtml(ficha.estatus_ficha || 'N/A')}</span></td>
      <td>${escapeHtml(ficha.dependencia || '-')}</td>
      <td>
        <button class="btn-view" onclick="verDetalle('${ficha.id}')">👁️ Ver Ficha</button>
        <button class="btn-print" onclick="imprimirDesdeTabla('${ficha.id}')">🖨️</button>
      </td>
    </tr>
  `).join('');
}

function renderizarPaginacion() {
  const total = fichasFiltradas.length;
  const totalPages = Math.max(1, Math.ceil(total / POR_PAGINA));
  const inicio = total === 0 ? 0 : (paginaActual - 1) * POR_PAGINA + 1;
  const fin = Math.min(paginaActual * POR_PAGINA, total);
  const infoEl = document.getElementById('paginationInfo');
  if (infoEl) infoEl.textContent = `Mostrando ${inicio} - ${fin} de ${total} registros`;

  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  if (prevBtn) prevBtn.disabled = paginaActual <= 1;
  if (nextBtn) nextBtn.disabled = paginaActual >= totalPages;

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

function cambiarPagina(nuevaPagina) {
  const totalPages = Math.ceil(fichasFiltradas.length / POR_PAGINA) || 1;
  if (nuevaPagina < 1 || nuevaPagina > totalPages) return;
  paginaActual = nuevaPagina;
  renderizarTabla();
  renderizarPaginacion();
  document.querySelector('.results-section')?.scrollIntoView({ behavior: 'smooth' });
}

window.verDetalle = function(id) {
  const ficha = fichasData.find(f => f.id == id);
  if (!ficha) return;

  const set = (selector, value) => {
    const el = document.getElementById(selector);
    if (el) el.textContent = value || '-';
  };

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

  if (ficha.fecha_creacion) {
    const f = new Date(ficha.fecha_creacion);
    set('modalFechaCreacion', `${f.toLocaleDateString('es-VE')} ${f.toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'})}`);
  }

  for (let i = 1; i <= 4; i++) {
    const url = ficha[`foto${i}_url`] || ficha[`foto${i}`] || '';
    const img = document.getElementById(`modalImg${i}`);
    const box = document.getElementById(`modalBox${i}`);
    const placeholder = box?.querySelector('span');
    if (img && box && placeholder) {
      if (url && url.trim() !== '' && url.startsWith('http')) {
        img.src = url;
        img.style.display = 'block';
        placeholder.style.display = 'none';
      } else {
        img.style.display = 'none';
        placeholder.style.display = 'block';
      }
    }
  }

  const modal = document.getElementById('fichaModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
};

window.cerrarModal = function() {
  const modal = document.getElementById('fichaModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = 'auto';
};

window.imprimirDesdeTabla = function(id) {
  verDetalle(id);
  setTimeout(() => window.imprimirFicha(), 400);
};

window.imprimirFicha = function() {
  window.print();
};

// ================= UTILIDADES =================
function mostrarTablaCargando(mostrar) {
  const tbody = document.getElementById('resultsBody');
  if (!tbody) return;
  if (mostrar) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#003366;font-size:15px">⏳ Cargando datos de la base de datos...</td></tr>`;
  }
}

function mostrarAlerta(mensaje, tipo) {
  const alert = document.getElementById('searchAlert');
  if (!alert) return;
  alert.className = `alert alert-${tipo}`;
  alert.textContent = mensaje;
  alert.style.display = 'block';
  setTimeout(() => { alert.style.display = 'none'; }, 5000);
}

function ocultarAlerta() {
  const alert = document.getElementById('searchAlert');
  if (alert) alert.style.display = 'none';
}

function getEstatusClass(estatus) {
  const e = (estatus || '').toUpperCase();
  if (e.includes('OPERATIVO')) return 'status-ok';
  if (e.includes('REPARACION') || e.includes('TALLER') || e.includes('PROCESO')) return 'status-warn';
  if (e.includes('INOPERATIVO') || e.includes('DESINCORPORADO') || e.includes('DENUNCIADA')) return 'status-bad';
  return '';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

if (!document.getElementById('estatus-styles')) {
  const style = document.createElement('style');
  style.id = 'estatus-styles';
  style.textContent = `
    .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; display: inline-block; }
    .status-ok { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .status-warn { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
    .status-bad { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .page-numbers { display: flex; gap: 6px; }
    .page-btn { min-width: 36px; height: 36px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .page-btn:hover:not(.active) { background: #f0f0f0; border-color: #003366; }
    .page-btn.active { background: #003366; color: white; border-color: #003366; }
    .btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
}
