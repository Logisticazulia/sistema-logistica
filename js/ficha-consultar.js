/**
 * ========================================
 * FICHA-CONSULTAR.JS
 * Lógica de búsqueda, filtrado, paginación y modal
 * ========================================
 */

// Variables globales
let datosVehiculos = [];
let datosFiltrados = [];
let paginaActual = 1;
const POR_PAGINA = 15;
let clienteSupabase = null;

// Inicialización al cargar el DOM
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Validar que Supabase y config estén cargados
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
    console.error('⚠️ Supabase o configuración no cargados correctamente.');
    mostrarAlerta('Error de configuración: No se pudo conectar a la base de datos.', 'error');
    return;
  }

  clienteSupabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

  // 2. Event Listeners
  document.getElementById('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.buscarVehiculo();
  });
  
  document.getElementById('filtroTipo').addEventListener('change', () => {
    aplicarFiltros();
  });

  // 3. Cargar datos iniciales (opcional: mostrar últimos registros o tabla vacía)
  // Si prefieres cargar todo al inicio, descomenta: await cargarDatos();
});

/**
 * 🔍 Función principal de búsqueda (llamada desde HTML)
 */
window.buscarVehiculo = async () => {
  const termino = document.getElementById('searchInput').value.trim();
  const btn = document.getElementById('btnSearch');
  
  // Estado de carga
  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span><span>Buscando...</span>';
  mostrarTablaCargando(true);

  try {
    let query = clienteSupabase
      .from('fichas_tecnicas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3000); // Límite seguro para evitar lentitud

    // Aplicar búsqueda por texto si hay término
    if (termino) {
      query = query.or(
        `marca.ilike.%${termino}%,modelo.ilike.%${termino}%,placa.ilike.%${termino}%,facsimil.ilike.%${termino}%,s_carroceria.ilike.%${termino}%,s_motor.ilike.%${termino}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    datosVehiculos = data || [];
    paginaActual = 1;
    aplicarFiltros();
    mostrarAlerta(`✅ Se encontraron ${datosVehiculos.length} registros.`, 'success');
  } catch (err) {
    console.error('❌ Error en búsqueda:', err);
    mostrarAlerta('Error al consultar la base de datos. Intente nuevamente.', 'error');
    datosVehiculos = [];
    datosFiltrados = [];
    renderizarTabla();
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>🔍</span><span>Buscar</span>';
  }
};

/**
 * 🧹 Limpiar búsqueda y filtros
 */
window.limpiarBusqueda = () => {
  document.getElementById('searchInput').value = '';
  document.getElementById('filtroTipo').value = 'todos';
  datosVehiculos = [];
  datosFiltrados = [];
  paginaActual = 1;
  renderizarTabla();
  renderizarPaginacion();
  ocultarAlerta();
};

/**
 * 🔽 Aplicar filtro por tipo (Moto / Vehículo)
 */
function aplicarFiltros() {
  const tipoFiltro = document.getElementById('filtroTipo').value;
  
  datosFiltrados = datosVehiculos.filter(item => {
    const tipo = (item.tipo || '').toUpperCase();
    const clase = (item.clase || '').toUpperCase();
    const esMoto = tipo.includes('MOTO') || clase.includes('MOTO');
    
    if (tipoFiltro === 'moto') return esMoto;
    if (tipoFiltro === 'vehiculo') return !esMoto;
    return true;
  });

  paginaActual = 1;
  renderizarTabla();
  renderizarPaginacion();
}

/**
 * 📊 Renderizar tabla de resultados
 */
function renderizarTabla() {
  const tbody = document.getElementById('resultsBody');
  tbody.innerHTML = '';

  const total = datosFiltrados.length;
  if (total === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
          📭 No se encontraron resultados. Ajuste los filtros o realice una nueva búsqueda.
        </td>
      </tr>`;
    renderizarPaginacion();
    return;
  }

  // Calcular rango de página
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const fin = inicio + POR_PAGINA;
  const paginaData = datosFiltrados.slice(inicio, fin);

  paginaData.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(item.placa || '-')}</strong></td>
      <td>${escapeHtml(item.marca || '-')}</td>
      <td>${escapeHtml(item.modelo || '-')}</td>
      <td>${escapeHtml(item.tipo || '-')}</td>
      <td>${escapeHtml(item.color || '-')}</td>
      <td><span class="status-badge ${getEstatusClass(item.estatus_ficha)}">${escapeHtml(item.estatus_ficha || 'N/A')}</span></td>
      <td>${escapeHtml(item.dependencia || '-')}</td>
      <td>
        <button class="btn-view" onclick="verDetalle('${item.id}')">👁️ Ver Ficha</button>
        <button class="btn-print" onclick="imprimirFichaDirecta('${item.id}')">🖨️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderizarPaginacion();
}

/**
 * 🔢 Renderizar controles de paginación
 */
function renderizarPaginacion() {
  const totalItems = datosFiltrados.length;
  const totalPages = Math.ceil(totalItems / POR_PAGINA) || 1;
  
  const inicio = (paginaActual - 1) * POR_PAGINA + 1;
  const fin = Math.min(paginaActual * POR_PAGINA, totalItems);
  
  document.getElementById('paginationInfo').textContent = 
    `Mostrando ${inicio} - ${fin} de ${totalItems} registros`;

  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  prevBtn.disabled = paginaActual === 1;
  nextBtn.disabled = paginaActual === totalPages;

  prevBtn.onclick = () => cambiarPagina(paginaActual - 1);
  nextBtn.onclick = () => cambiarPagina(paginaActual + 1);

  // Generar números de página
  const pageNumbers = document.getElementById('pageNumbers');
  pageNumbers.innerHTML = '';
  
  const maxVisibles = 5;
  let startPage = Math.max(1, paginaActual - Math.floor(maxVisibles / 2));
  let endPage = Math.min(totalPages, startPage + maxVisibles - 1);
  
  if (endPage - startPage < maxVisibles - 1) startPage = Math.max(1, endPage - maxVisibles + 1);

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${i === paginaActual ? 'active' : ''}`;
    btn.textContent = i;
    btn.onclick = () => cambiarPagina(i);
    pageNumbers.appendChild(btn);
  }
}

function cambiarPagina(nuevaPagina) {
  paginaActual = nuevaPagina;
  renderizarTabla();
  document.querySelector('.results-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * 👁️ Abrir modal con detalle de la ficha
 */
window.verDetalle = (id) => {
  const item = datosVehiculos.find(v => v.id == id);
  if (!item) return;

  // Rellenar campos del modal
  const set = (sel, val) => { const el = document.getElementById(sel); if (el) el.textContent = val || '-'; };
  
  set('modalMarca', item.marca);
  set('modalModelo', item.modelo);
  set('modalTipo', item.tipo);
  set('modalSerialCarroceria', item.s_carroceria);
  set('modalClase', item.clase);
  set('modalColor', item.color);
  set('modalPlaca', item.placa);
  set('modalFacsimilar', item.facsimil);
  set('modalDependencia', item.dependencia);
  set('modalSerialMotor', item.s_motor);
  set('modalEstatus', item.estatus_ficha);
  set('modalCausa', item.causa);
  set('modalDiagnostico', item.diagnostico);
  set('modalMecanica', item.mecanica);
  set('modalUbicacion', item.ubicacion);
  set('modalTapiceria', item.tapiceria);
  set('modalCauchos', item.cauchos);
  set('modalLuces', item.luces);
  set('modalObservaciones', item.observaciones);
  set('modalCreadoPor', item.creado_por);
  
  if (item.fecha_creacion) {
    const fecha = new Date(item.fecha_creacion);
    set('modalFechaCreacion', fecha.toLocaleDateString('es-VE') + ' ' + fecha.toLocaleTimeString('es-VE', {hour:'2-digit', minute:'2-digit'}));
  }

  // Imágenes
  for (let i = 1; i <= 4; i++) {
    const url = item[`foto${i}_url`];
    const img = document.getElementById(`modalImg${i}`);
    const box = document.getElementById(`modalBox${i}`);
    
    if (url && url.trim() !== '') {
      img.src = url;
      img.style.display = 'block';
      box.querySelector('span').style.display = 'none';
    } else {
      img.style.display = 'none';
      box.querySelector('span').style.display = 'block';
    }
  }

  document.getElementById('fichaModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

/**
 * 🖨️ Imprimir ficha (desde tabla o modal)
 */
window.imprimirFichaDirecta = (id) => {
  window.verDetalle(id);
  setTimeout(() => window.imprimirFicha(), 300);
};

window.imprimirFicha = () => {
  window.print();
};

window.cerrarModal = () => {
  document.getElementById('fichaModal').style.display = 'none';
  document.body.style.overflow = 'auto';
};

// Cerrar modal al hacer clic fuera del contenido
document.getElementById('fichaModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('fichaModal')) window.cerrarModal();
});

// ================= UTILIDADES =================

function mostrarTablaCargando(mostrar) {
  const tbody = document.getElementById('resultsBody');
  if (mostrar) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 50px; color: #003366;">⏳ Cargando datos...</td></tr>`;
  }
}

function mostrarAlerta(mensaje, tipo) {
  const alert = document.getElementById('searchAlert');
  alert.className = `alert alert-${tipo}`;
  alert.textContent = mensaje;
  alert.style.display = 'block';
  setTimeout(() => alert.style.display = 'none', 5000);
}

function ocultarAlerta() {
  document.getElementById('searchAlert').style.display = 'none';
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
