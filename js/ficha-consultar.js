/**
* ========================================
* FICHA-CONSULTAR.JS - BÚSQUEDA EXACTA CORREGIDA
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
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
      throw new Error('Falta configuración de Supabase');
    }
    supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    await cargarUsuarioLogueado();
    configurarEventos();
    await buscarFichas();
  } catch (error) {
    console.error('❌ Error de inicialización:', error);
    mostrarAlerta('Error al conectar con el sistema.', 'error');
  }
});

// ================= USUARIO LOGUEADO =================
async function cargarUsuarioLogueado() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const email = session?.user?.email || 'usuario@institucion.com';
    const el = document.getElementById('userEmail');
    if (el) el.textContent = email;
  } catch (e) { console.warn('⚠️ Usuario no detectado:', e); }
}

// ================= EVENTOS =================
function configurarEventos() {
  document.getElementById('searchInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') buscarFichas(); });
  document.getElementById('filtroTipo')?.addEventListener('change', () => { paginaActual = 1; aplicarFiltros(); });
  document.getElementById('prevPage')?.addEventListener('click', () => cambiarPagina(paginaActual - 1));
  document.getElementById('nextPage')?.addEventListener('click', () => cambiarPagina(paginaActual + 1));
  document.querySelector('.modal-close')?.addEventListener('click', cerrarModal);
  document.getElementById('fichaModal')?.addEventListener('click', e => { if (e.target.id === 'fichaModal') cerrarModal(); });
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = '../login.html';
  });
}

// ================= BÚSQUEDA / CARGA =================
window.buscarVehiculo = async () => { await buscarFichas(); };

async function buscarFichas() {
  const termino = document.getElementById('searchInput')?.value.trim() || '';
  const btn = document.getElementById('btnSearch');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span>⏳</span><span>Cargando...</span>'; }
  mostrarTablaCargando(true);
  
  try {
    // Consulta base
    let query = supabaseClient
      .from('fichas_tecnicas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(2000);
    
    // ✅ BÚSQUEDA EXACTA en múltiples campos (incluye s_motor)
    if (termino) {
      const t = termino.toUpperCase(); // Normalizar a mayúsculas para comparación exacta
      query = query.or(
        `placa.eq.${t},facsimil.eq.${t},marca.eq.${t},modelo.eq.${t},s_carroceria.eq.${t},s_motor.eq.${t}`
      );
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    fichasData = data || [];
    paginaActual = 1;
    aplicarFiltros();
    
    if (fichasData.length > 0) {
      mostrarAlerta(`✅ ${fichasData.length} registro(s) encontrado(s).`, 'success');
    } else {
      mostrarAlerta('ℹ️ No se encontraron registros debe colocar seriales validos.', 'info');
    }
  } catch (err) {
    console.error('❌ Fallo en buscarFichas:', err);
    mostrarAlerta('Error al consultar la base de datos.', 'error');
    fichasData = [];
    fichasFiltradas = [];
    renderizarTabla();
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span>🔍</span><span>Buscar</span>'; }
  }
}

window.limpiarBusqueda = () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('filtroTipo').value = 'todos';
  fichasData = [];
  fichasFiltradas = [];
  paginaActual = 1;
  buscarFichas();
};

// ================= FILTROS =================
function aplicarFiltros() {
  const filtroValor = document.getElementById('filtroTipo')?.value || 'todos';
  const termino = document.getElementById('searchInput')?.value.trim().toUpperCase() || ''; // ✅ Normalizar a mayúsculas
  
  fichasFiltradas = fichasData.filter(ficha => {
    // Filtro por Tipo (Moto vs Vehículo)
    const tipo = (ficha.tipo || '').toUpperCase();
    const clase = (ficha.clase || '').toUpperCase();
    const esMoto = tipo.includes('MOTO') || clase.includes('MOTO') || tipo === 'ENDURO' || clase === 'ENDURO';
    
    if (filtroValor === 'moto' && !esMoto) return false;
    if (filtroValor === 'vehiculo' && esMoto) return false;
    
    // ✅ FILTRO EXACTO por texto (comparación exacta en mayúsculas)
    if (termino) {
      const coincide = 
        (ficha.placa || '').toUpperCase() === termino ||
        (ficha.facsimil || '').toUpperCase() === termino ||
        (ficha.marca || '').toUpperCase() === termino ||
        (ficha.modelo || '').toUpperCase() === termino ||
        (ficha.s_carroceria || '').toUpperCase() === termino ||
        (ficha.s_motor || '').toUpperCase() === termino;
      
      if (!coincide) return false;
    }
    return true;
  });
  
  renderizarTabla();
  renderizarPaginacion();
}

// ================= RENDERIZAR TABLA =================
function renderizarTabla() {
  const tbody = document.getElementById('resultsBody');
  if (!tbody) return;
  
  if (fichasFiltradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#666">📭 No se encontraron resultados con búsqueda exacta.</td></tr>`;
    return;
  }
  
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const fin = inicio + POR_PAGINA;
  const paginaData = fichasFiltradas.slice(inicio, fin);
  
  tbody.innerHTML = paginaData.map(function(f) {
    return `
    <tr>
      <td><strong>${escapeHtml(f.placa || '-')}</strong></td>
      <td>${escapeHtml(f.marca || '-')}</td>
      <td>${escapeHtml(f.modelo || '-')}</td>
      <td>${escapeHtml(f.tipo || '-')}</td>
      <td>${escapeHtml(f.color || '-')}</td>
      <td><span class="status-badge ${getEstatusClass(f.estatus_ficha)}">${escapeHtml(f.estatus_ficha || 'N/A')}</span></td>
      <td>${escapeHtml(f.dependencia || '-')}</td>
      <td>
        <button class="btn-view" onclick="verDetalle('${f.id}')">👁️ Ver</button>
        <button class="btn-print" onclick="imprimirDesdeTabla('${f.id}')">🖨️</button>
      </td>
    </tr>
    `;
  }).join('');
}

// ================= PAGINACIÓN =================
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
    btn.onclick = function() { cambiarPagina(i); };
    pageNumbers.appendChild(btn);
  }
}

function cambiarPagina(nueva) {
  const totalPages = Math.ceil(fichasFiltradas.length / POR_PAGINA) || 1;
  if (nueva < 1 || nueva > totalPages) return;
  paginaActual = nueva;
  renderizarTabla();
  renderizarPaginacion();
  document.querySelector('.results-section')?.scrollIntoView({ behavior: 'smooth' });
}

// ================= MODAL =================
window.verDetalle = function(id) {
  const f = fichasData.find(function(x) { return x.id == id; });
  if (!f) return;
  
  const set = function(sel, val) { 
    const el = document.getElementById(sel); 
    if (el) el.textContent = val || '-'; 
  };
  
  set('modalMarca', f.marca); 
  set('modalModelo', f.modelo); 
  set('modalTipo', f.tipo);
  set('modalClase', f.clase); 
  set('modalColor', f.color); 
  set('modalPlaca', f.placa);
  set('modalFacsimilar', f.facsimil); 
  set('modalSerialCarroceria', f.s_carroceria);
  set('modalSerialMotor', f.s_motor); 
  set('modalEstatus', f.estatus_ficha);
  set('modalDependencia', f.dependencia); 
  set('modalCausa', f.causa);
  set('modalMecanica', f.mecanica); 
  set('modalDiagnostico', f.diagnostico);
  set('modalUbicacion', f.ubicacion); 
  set('modalTapiceria', f.tapiceria);
  set('modalCauchos', f.cauchos); 
  set('modalLuces', f.luces);
  set('modalObservaciones', f.observaciones); 
  
  // Footer de impresión
  const printFecha = document.getElementById('printFechaCreacion');
  const printCreador = document.getElementById('printCreadoPor');
  if (f.fecha_creacion && printFecha) {
    const fecha = new Date(f.fecha_creacion);
    printFecha.textContent = `${fecha.toLocaleDateString('es-VE')} ${fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (f.creado_por && printCreador) {
    printCreador.textContent = f.creado_por;
  }
  
  // Imágenes
  for (let i = 1; i <= 4; i++) {
    const url = f[`foto${i}_url`] || f[`foto${i}`] || '';
    const img = document.getElementById(`modalImg${i}`);
    const box = document.getElementById(`modalBox${i}`);
    const span = box?.querySelector('span');
    if (img && box && span) {
      if (url && url.startsWith('http')) {
        img.src = url; 
        img.style.display = 'block'; 
        span.style.display = 'none';
      } else {
        img.style.display = 'none'; 
        span.style.display = 'block';
      }
    }
  }
  
  document.getElementById('fichaModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.cerrarModal = function() {
  document.getElementById('fichaModal').style.display = 'none';
  document.body.style.overflow = 'auto';
};

window.imprimirDesdeTabla = function(id) {
  verDetalle(id);
  setTimeout(function() { window.print(); }, 300);
};

window.imprimirFicha = function() { window.print(); };

// ================= UTILIDADES =================
function mostrarTablaCargando(mostrar) {
  const tbody = document.getElementById('resultsBody');
  if (tbody && mostrar) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#003366">⏳ Conectando con Supabase...</td></tr>`;
  }
}

function mostrarAlerta(msg, tipo) {
  const el = document.getElementById('searchAlert');
  if (!el) return;
  el.className = `alert alert-${tipo}`;
  el.textContent = msg;
  el.style.display = 'block';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ✅ CORREGIDO: Nombres de clases que coinciden con el CSS del HTML
function getEstatusClass(est) {
  const e = (est || '').toUpperCase().trim();
  if (e.includes('DESINCORPORADO')) return 'status-gray';
  if (e.includes('INOPERATIVO') || e.includes('REPARACION') || e.includes('TALLER')) return 'status-danger';
  if (e.includes('OPERATIVO')) return 'status-ok';
  return 'status-default';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Inyectar estilos para badges si no existen
if (!document.getElementById('estatus-styles')) {
  const style = document.createElement('style');
  style.id = 'estatus-styles';
  style.textContent = `
    .status-badge { padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; text-align: center; }
    .status-ok { background: #d1e7dd; color: #0f5132; border: 1px solid #badbcc; }
    .status-danger { background: #f8d7da; color: #842029; border: 1px solid #f5c2c7; }
    .status-gray { background: #e2e3e5; color: #41464b; border: 1px solid #d3d6d8; }
    .status-default { background: #fff3cd; color: #664d03; border: 1px solid #ffecb5; }
    .page-numbers { display: flex; gap: 6px; }
    .page-btn { min-width: 36px; height: 36px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .page-btn:hover:not(.active) { background: #f0f0f0; border-color: #003366; }
    .page-btn.active { background: #003366; color: white; border-color: #003366; }
    .btn-page:disabled { opacity: 0.5; cursor: not-allowed; }
  `;
  document.head.appendChild(style);
}
