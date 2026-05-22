/**
 * ============================================
 * FICHA TÉCNICA - CONSULTAR / LISTAR / DETALLE
 * ============================================
 */
let supabaseClient = null;
let currentPage = 1;
const pageSize = 15;
let totalRecords = 0;
let isLoading = false;

// ================= CONFIGURACIÓN & INIT =================
async function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Librería Supabase no cargada');
    return false;
  }
  const url = window.SUPABASE_URL;
  const key = window.SUPABASE_KEY;
  if (!url || !key) {
    console.error('❌ Configuración de Supabase no encontrada');
    return false;
  }
  try {
    supabaseClient = window.supabase.createClient(url, key);
    return true;
  } catch (error) {
    console.error('❌ Error al inicializar Supabase:', error);
    return false;
  }
}

// ================= CARGAR FICHAS =================
async function cargarFichas() {
  if (isLoading) return;
  isLoading = true;
  document.getElementById('loadingState').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('fichasTableBody').innerHTML = '';
  document.getElementById('paginationControls').innerHTML = '';

  try {
    const searchTerm = document.getElementById('searchInput').value.trim();
    const tipoFilter = document.getElementById('tipoFilter').value;
    const estatusFilter = document.getElementById('estatusFilter').value;

    // Construir query base
    let query = supabaseClient.from('fichas_tecnicas').select('*', { count: 'exact' });

    // Filtro por texto
    if (searchTerm) {
      const term = `%${searchTerm}%`;
      query = query.or(`placa.ilike.${term},marca.ilike.${term},modelo.ilike.${term},dependencia.ilike.${term}`);
    }

    // Filtro por Tipo (Motos vs Vehículos)
    if (tipoFilter === 'motos') {
      query = query.ilike('tipo', '%MOTO%'); // Cubre ENDURO, PASEO, MOTO, TRIMOVIL
    } else if (tipoFilter === 'vehiculos') {
      query = query.not('tipo', 'ilike', '%MOTO%');
    }

    // Filtro por Estatus
    if (estatusFilter !== 'todos') {
      query = query.eq('estatus_ficha', estatusFilter);
    }

    // Conteo total para paginación
    const { count, error: countError } = await query;
    if (countError) throw countError;
    totalRecords = count || 0;

    if (totalRecords === 0) {
      document.getElementById('emptyState').style.display = 'block';
      document.getElementById('loadingState').style.display = 'none';
      isLoading = false;
      return;
    }

    // Aplicar paginación y orden (más recientes primero)
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw error;

    renderTable(data);
    renderPagination(totalRecords);
    document.getElementById('loadingState').style.display = 'none';
  } catch (error) {
    console.error('❌ Error al cargar fichas:', error);
    document.getElementById('loadingState').innerHTML = '❌ Error al cargar datos. Recargue la página.';
  } finally {
    isLoading = false;
  }
}

// ================= RENDERIZAR TABLA =================
function renderTable(data) {
  const tbody = document.getElementById('fichasTableBody');
  tbody.innerHTML = '';

  data.forEach(ficha => {
    const estatusClass = `badge-${ficha.estatus_ficha?.toLowerCase().replace(' ', '') || 'default'}`;
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${ficha.placa || 'S/P'}</strong></td>
      <td>${ficha.marca || '-'}</td>
      <td>${ficha.modelo || '-'}</td>
      <td>${ficha.tipo || '-'}</td>
      <td>${ficha.color || '-'}</td>
      <td><span class="badge ${estatusClass}">${ficha.estatus_ficha || 'S/E'}</span></td>
      <td>${ficha.dependencia || '-'}</td>
      <td><button class="btn-detail" onclick="verDetalle('${ficha.id}')">👁️ Ver Detalle</button></td>
    `;
    tbody.appendChild(row);
  });
}

// ================= RENDERIZAR PAGINACIÓN =================
function renderPagination(total) {
  const container = document.getElementById('paginationControls');
  container.innerHTML = '';
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return;

  const createBtn = (text, page, disabled = false, active = false) => {
    const btn = document.createElement('button');
    btn.className = `page-btn ${active ? 'active' : ''}`;
    btn.textContent = text;
    btn.disabled = disabled;
    if (!disabled) btn.onclick = () => { currentPage = page; cargarFichas(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    return btn;
  };

  container.appendChild(createBtn('Anterior', currentPage - 1, currentPage === 1));
  container.appendChild(createBtn(`<span class="page-info">Pág ${currentPage} de ${totalPages}</span>`, currentPage, false, true));
  container.appendChild(createBtn('Siguiente', currentPage + 1, currentPage === totalPages));
}

// ================= VER DETALLE (MODAL) =================
async function verDetalle(id) {
  const modal = document.getElementById('fichaModal');
  const body = document.getElementById('fichaDetailBody');
  body.innerHTML = '<div class="loading"><div class="spinner"></div> Cargando detalle...</div>';
  modal.classList.add('active');

  try {
    const { data, error } = await supabaseClient.from('fichas_tecnicas').select('*').eq('id', id).single();
    if (error) throw error;

    body.innerHTML = `
      <h4 style="color:#003366; margin-bottom:15px; border-bottom:2px solid #eee; padding-bottom:5px;">🔍 Información General</h4>
      <div class="ficha-grid">
        <div class="ficha-item"><label>Placa</label><span>${data.placa || 'N/A'}</span></div>
        <div class="ficha-item"><label>Facsímil</label><span>${data.facsimil || 'N/A'}</span></div>
        <div class="ficha-item"><label>Marca / Modelo</label><span>${data.marca || '-'} ${data.modelo || ''}</span></div>
        <div class="ficha-item"><label>Tipo / Clase</label><span>${data.tipo || '-'} / ${data.clase || '-'}</span></div>
        <div class="ficha-item"><label>Color</label><span>${data.color || '-'}</span></div>
        <div class="ficha-item"><label>Estatus</label><span>${data.estatus_ficha || 'N/A'}</span></div>
        <div class="ficha-item"><label>Dependencia</label><span>${data.dependencia || 'N/A'}</span></div>
        <div class="ficha-item"><label>Causa</label><span>${data.causa || 'N/A'}</span></div>
      </div>

      <h4 style="color:#003366; margin:20px 0 15px; border-bottom:2px solid #eee; padding-bottom:5px;">🔧 Inspección Técnico Mecánica</h4>
      <div class="ficha-grid">
        <div class="ficha-item"><label>Mecánica</label><span>${data.mecanica || 'N/A'}</span></div>
        <div class="ficha-item"><label>Diagnóstico</label><span>${data.diagnostico || 'N/A'}</span></div>
        <div class="ficha-item"><label>Ubicación</label><span>${data.ubicacion || 'N/A'}</span></div>
        <div class="ficha-item"><label>Tapicería</label><span>${data.tapiceria || 'N/A'}</span></div>
        <div class="ficha-item"><label>Cauchos</label><span>${data.cauchos || 'N/A'}</span></div>
        <div class="ficha-item"><label>Luces</label><span>${data.luces || 'N/A'}</span></div>
      </div>
      <div class="ficha-item" style="margin-top:10px;"><label>Observaciones</label><span>${data.observaciones || 'Sin observaciones'}</span></div>

      <h4 style="color:#003366; margin:20px 0 15px; border-bottom:2px solid #eee; padding-bottom:5px;">📸 Evidencia Fotográfica</h4>
      <div class="photos-grid">
        ${renderPhotoBox(data.foto1_url, 'Foto 1 - General')}
        ${renderPhotoBox(data.foto2_url, 'Foto 2 - Detalle')}
        ${renderPhotoBox(data.foto3_url, 'Foto 3 - Interior/Mecánica')}
        ${renderPhotoBox(data.foto4_url, 'Foto 4 - Documentación/Placa')}
      </div>
      <p style="margin-top:15px; font-size:12px; color:#666; text-align:center;">
        📅 Creado: ${formatDate(data.created_at)} | 👤 Por: ${data.creado_por || 'N/A'}
      </p>
    `;
  } catch (error) {
    console.error('❌ Error al cargar detalle:', error);
    body.innerHTML = `<div class="empty-state">❌ No se pudo cargar el detalle: ${error.message}</div>`;
  }
}

function renderPhotoBox(url, label) {
  if (!url) return `<div class="photo-box"><span>${label} (No cargada)</span></div>`;
  return `
    <div class="photo-box">
      <img src="${url}" alt="${label}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'; this.nextElementSibling.textContent='⚠️ Error al cargar imagen';">
      <span>${label}</span>
    </div>
  `;
}

function cerrarModal() {
  document.getElementById('fichaModal').classList.remove('active');
}

function imprimirFicha() {
  window.print();
}

function formatDate(isoString) {
  if (!isoString) return 'N/A';
  const d = new Date(isoString);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ================= EVENT LISTENERS =================
document.addEventListener('DOMContentLoaded', async () => {
  if (!await initSupabase()) return;

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    if (confirm('¿Cerrar sesión?')) window.location.href = '../index.html';
  });

  // Debounce para búsqueda
  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { currentPage = 1; cargarFichas(); }, 500);
  });

  document.getElementById('tipoFilter').addEventListener('change', () => { currentPage = 1; cargarFichas(); });
  document.getElementById('estatusFilter').addEventListener('change', () => { currentPage = 1; cargarFichas(); });

  // Cerrar modal con ESC o click fuera
  document.getElementById('fichaModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('fichaModal')) cerrarModal();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrarModal(); });

  cargarFichas();
});
