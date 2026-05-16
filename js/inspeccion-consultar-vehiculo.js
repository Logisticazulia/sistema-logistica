document.addEventListener('DOMContentLoaded', async () => {
  // 🔹 CONFIGURACIÓN DE PAGINACIÓN
  const ITEMS_PER_PAGE = 15;
  let currentPage = 1;
  let allInspections = [];
  let filteredInspections = [];

  // 🔹 INICIALIZACIÓN SUPABASE
  async function initSupabase() {
    let attempts = 0;
    while (!window.supabase && attempts < 50) { await new Promise(res => setTimeout(res, 100)); attempts++; }
    if (!window.supabase) { mostrarAlerta('error', '❌ No se cargó Supabase'); return null; }
    if (window.supabase.auth) return window.supabase;
    const createFn = window.supabase.createClient || window.createClient;
    if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try { window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY); return window.supabase; }
      catch (err) { console.error('❌ Error init Supabase:', err); return null; }
    }
    return null;
  }

  const supabase = await initSupabase();
  if (!supabase) return;

  let usuarioActual = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { usuarioActual = user; const el = document.getElementById('userEmail'); if (el) el.textContent = user.email || 'Usuario'; }
  } catch (err) { console.warn('Sesión no verificada'); }

  // 🔹 REFERENCIAS DOM
  const searchInput = document.getElementById('searchVehicle');
  const btnSearch = document.getElementById('btnSearch');
  const btnSearchText = btnSearch?.querySelector('.btn-search-text');
  const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
  const resultsSection = document.getElementById('resultsSection');
  const resultsBody = document.getElementById('resultsBody');
  const resultsCount = document.getElementById('resultsCount');
  const emptyState = document.getElementById('emptyState');
  const detailModal = document.getElementById('detailModal');
  const modalBody = document.getElementById('modalBody');
  const modalNInspeccion = document.getElementById('modalNInspeccion');
  const modalClose = document.getElementById('modalClose');
  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');
  const filterPlaca = document.getElementById('filterPlaca');
  const btnApplyFilter = document.getElementById('btnApplyFilter');
  const btnClearFilter = document.getElementById('btnClearFilter');
  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const currentPageNum = document.getElementById('currentPageNum');
  const totalPagesNum = document.getElementById('totalPagesNum');

  // 🔹 FUNCIONES AUXILIARES
  function mostrarAlerta(tipo, mensaje) {
    [alertSuccess, alertError, alertInfo].forEach(el => { if (el) el.style.display = 'none'; });
    const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
    if (target) { target.querySelector('span:last-child').textContent = mensaje; target.style.display = 'flex'; }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  function getStatusClass(val) {
    if (val === 'B') return 'status-B';
    if (val === 'M') return 'status-M';
    return 'status-NT';
  }

  // 🔹 CARGAR TODAS LAS INSPECCIONES (CON PAGINACIÓN)
  async function cargarTodasInspecciones(page = 1) {
    try {
      resultsCount.textContent = '🔄 Cargando...';
      
      // Contar total de registros
      const { count, error: countError } = await supabase.from('inspecciones_pvr')
        .select('*', { count: 'exact', head: true });
      if (countError) throw countError;

      // Obtener página actual (ordenado por fecha DESC)
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error } = await supabase.from('inspecciones_pvr')
        .select('id, n_inspeccion, fecha_inspeccion, hora, placa, s_carroceria, motivo, vehiculo_id')
        .order('fecha_inspeccion', { ascending: false })
        .range(from, to);

      if (error) throw error;

      allInspections = data || [];
      filteredInspections = [...allInspections];
      currentPage = page;
      
      renderTabla();
      updatePaginationControls(count || 0);
      
      if (filteredInspections.length === 0) {
        resultsSection.classList.remove('active');
        emptyState.style.display = 'block';
        emptyState.innerHTML = '<div class="icon">📭</div><p>No hay inspecciones registradas aún</p>';
      } else {
        resultsSection.classList.add('active');
        emptyState.style.display = 'none';
      }
    } catch (err) {
      console.error('❌ Error cargando inspecciones:', err);
      mostrarAlerta('error', `No se pudo cargar el listado: ${err.message}`);
    }
  }

  // 🔹 RENDERIZAR TABLA CON DATOS FILTRADOS/PAGINADOS
  function renderTabla() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const pageData = filteredInspections.slice(start, start + ITEMS_PER_PAGE);
    
    resultsBody.innerHTML = '';
    
    if (pageData.length === 0) {
      resultsBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color: #64748b;">No se encontraron resultados</td></tr>';
      return;
    }
    
    pageData.forEach(insp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="n-inspeccion">${insp.n_inspeccion || '-'}</td>
        <td class="fecha">${formatDate(insp.fecha_inspeccion)}</td>
        <td class="fecha">${insp.hora || '-'}</td>
        <td class="placa">${insp.placa || '-'}</td>
        <td class="s-carroceria">${insp.s_carroceria || '-'}</td>
        <td class="motivo" title="${insp.motivo || ''}">${insp.motivo || '-'}</td>
        <td><button class="btn-ver" data-id="${insp.id}">👁️ Ver Detalle</button></td>
      `;
      resultsBody.appendChild(tr);
    });

    // Agregar listeners a botones "Ver Detalle"
    resultsBody.querySelectorAll('.btn-ver').forEach(btn => {
      btn.addEventListener('click', () => abrirDetalle(btn.dataset.id));
    });
  }

  // 🔹 ACTUALIZAR CONTROLES DE PAGINACIÓN
  function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    currentPageNum.textContent = currentPage;
    totalPagesNum.textContent = totalPages || 1;
    
    btnPrev.disabled = currentPage <= 1;
    btnNext.disabled = currentPage >= totalPages;
    
    resultsCount.textContent = `${filteredInspections.length} registro${filteredInspections.length !== 1 ? 's' : ''} encontrado${filteredInspections.length !== 1 ? 's' : ''}`;
  }

  // 🔹 FILTRAR POR PLACA
  function aplicarFiltroPlaca() {
    const filtro = filterPlaca.value.trim().toUpperCase();
    if (!filtro) {
      filteredInspections = [...allInspections];
    } else {
      filteredInspections = allInspections.filter(insp => 
        (insp.placa || '').toUpperCase().includes(filtro)
      );
    }
    currentPage = 1;
    renderTabla();
    updatePaginationControls(filteredInspections.length);
  }

  // 🔹 BUSCAR VEHÍCULO Y FILTRAR SUS INSPECCIONES
  async function buscarVehiculo() {
    const rawQuery = searchInput?.value.trim();
    if (!rawQuery) { mostrarAlerta('info', 'Ingrese Placa, Facsímil o Serial para buscar'); return; }
    
    if (btnSearch) { btnSearch.disabled = true; btnSearchText.style.display = 'none'; btnSearchLoader.style.display = 'inline'; }
    mostrarAlerta('info', '🔍 Buscando vehículo...');

    try {
      const q = rawQuery.replace(/\s+/g, '').toUpperCase();
      const { data: vehiculo, error } = await supabase.from('vehiculos').select('id')
        .or(`placa.ilike.${q},facsimil.ilike.${q},s_carroceria.ilike.${q},s_motor.ilike.${q}`)
        .limit(1).maybeSingle();

      if (error) throw error;
      if (!vehiculo) { 
        mostrarAlerta('error', '❌ Vehículo no encontrado'); 
        return; 
      }

      // ✅ Cargar solo inspecciones de este vehículo
      const { data, error: inspError } = await supabase.from('inspecciones_pvr')
        .select('id, n_inspeccion, fecha_inspeccion, hora, placa, s_carroceria, motivo')
        .eq('vehiculo_id', vehiculo.id)
        .order('fecha_inspeccion', { ascending: false });

      if (inspError) throw inspError;

      allInspections = data || [];
      filteredInspections = [...allInspections];
      currentPage = 1;
      
      if (filteredInspections.length === 0) {
        resultsSection.classList.remove('active');
        emptyState.style.display = 'block';
        emptyState.innerHTML = '<div class="icon">📭</div><p>Este vehículo no tiene inspecciones registradas</p>';
      } else {
        resultsSection.classList.add('active');
        emptyState.style.display = 'none';
        renderTabla();
        updatePaginationControls(filteredInspections.length);
      }
      
      mostrarAlerta('success', `✅ Vehículo encontrado. Mostrando ${filteredInspections.length} inspección(es).`);
    } catch (err) {
      console.error('❌ Error búsqueda:', err); 
      mostrarAlerta('error', `Error: ${err.message}`);
    } finally {
      if (btnSearch) { btnSearch.disabled = false; btnSearchText.style.display = 'inline'; btnSearchLoader.style.display = 'none'; }
    }
  }

  // 🔹 ABRIR MODAL CON DETALLE COMPLETO
  async function abrirDetalle(inspeccionId) {
    try {
      const { data, error } = await supabase.from('inspecciones_pvr').select('*').eq('id', inspeccionId).single();
      if (error) throw error;
      if (!data) return;

      modalNInspeccion.textContent = data.n_inspeccion || '';
      
      let html = `
        <div class="detail-grid">
          <div class="detail-item"><span class="detail-label">N° Inspección</span><div class="detail-value">${data.n_inspeccion || '-'}</div></div>
          <div class="detail-item"><span class="detail-label">Fecha</span><div class="detail-value">${formatDate(data.fecha_inspeccion)}</div></div>
          <div class="detail-item"><span class="detail-label">Hora</span><div class="detail-value">${data.hora || '-'}</div></div>
          <div class="detail-item"><span class="detail-label">Motivo</span><div class="detail-value">${data.motivo || '-'}</div></div>
          <div class="detail-item"><span class="detail-label">Lugar</span><div class="detail-value">${data.lugar || '-'}</div></div>
          <div class="detail-item"><span class="detail-label">Asignación</span><div class="detail-value">${data.asignacion || '-'}</div></div>
          <div class="detail-item"><span class="detail-label">Supervisión</span><div class="detail-value">${data.supervision || '-'}</div></div>
          <div class="detail-item"><span class="detail-label">Kilometraje</span><div class="detail-value">${data.kms ? `${data.kms.toLocaleString()} km` : '-'}</div></div>
        </div>
        <div class="detail-section">
          <h4 class="detail-section-title">🚘 Datos del Vehículo</h4>
          <div class="detail-grid">
            <div class="detail-item"><span class="detail-label">Placa</span><div class="detail-value">${data.placa || '-'}</div></div>
            <div class="detail-item"><span class="detail-label">Marca</span><div class="detail-value">${data.marca || '-'}</div></div>
            <div class="detail-item"><span class="detail-label">Modelo</span><div class="detail-value">${data.modelo || '-'}</div></div>
            <div class="detail-item"><span class="detail-label">Año</span><div class="detail-value">${data.ano || '-'}</div></div>
            <div class="detail-item"><span class="detail-label">Tipo</span><div class="detail-value">${data.tipo || '-'}</div></div>
            <div class="detail-item"><span class="detail-label">Color</span><div class="detail-value">${data.color || '-'}</div></div>
            <div class="detail-item full"><span class="detail-label">S/Carrocería</span><div class="detail-value">${data.s_carroceria || '-'}</div></div>
            <div class="detail-item full"><span class="detail-label">N° Identificación</span><div class="detail-value">${data.n_identificacion || '-'}</div></div>
          </div>
        </div>
        <div class="detail-section">
          <h4 class="detail-section-title">📦 Accesorios</h4>
          <div class="detail-grid">
            ${renderAccesorio('Batería', data.bateria)}
            ${renderAccesorio('Est. Base', data.estacion_base)}
            ${renderAccesorio('Coctelera', data.coctelera)}
            ${renderAccesorio('Triángulo', data.triangulo)}
            ${renderAccesorio('Placas', data.placas)}
            ${renderAccesorio('Herramientas', data.herramientas)}
            ${renderAccesorio('Gato', data.gato)}
            ${renderAccesorio('Est. Luces', data.sestacion_luces)}
          </div>
        </div>
        <div class="detail-section">
          <h4 class="detail-section-title">🛞 Estado de Cauchos</h4>
          <div class="detail-grid">
            ${renderCaucho('Del. Izq.', data.caucho_del_izq)}
            ${renderCaucho('Del. Der.', data.caucho_del_der)}
            ${renderCaucho('Tra. Izq.', data.caucho_tra_izq)}
            ${renderCaucho('Tra. Der.', data.caucho_tra_der)}
            ${renderCaucho('Repuesto', data.caucho_repuesto)}
            <div class="detail-item"><span class="detail-label">Tapa</span><div class="detail-value">${data.tapa_cauchos || '-'}</div></div>
            <div class="detail-item"><span class="detail-label">Nº Rin</span><div class="detail-value">${data.rin_numero || '-'}</div></div>
          </div>
        </div>
        <div class="detail-section">
          <h4 class="detail-section-title">🔧 Componentes (B=Bueno | M=Malo | N/T=No Tiene)</h4>
          <div class="components-grid">
            ${renderComponente('Guardaf. Del. Izq.', data.guardafango_del_izq)}
            ${renderComponente('Guardaf. Del. Der.', data.guardafango_del_der)}
            ${renderComponente('Guardaf. Tra. Izq.', data.guardafango_tra_izq)}
            ${renderComponente('Guardaf. Tra. Der.', data.guardafango_tra_der)}
            ${renderComponente('Puerta Del. Izq.', data.puerta_del_izq)}
            ${renderComponente('Puerta Del. Der.', data.puerta_del_der)}
            ${renderComponente('Puerta Tra. Izq.', data.puerta_tra_izq)}
            ${renderComponente('Puerta Tra. Der.', data.puerta_tra_der)}
            ${renderComponente('Parach. Trasero', data.parachoque_trasero)}
            ${renderComponente('Parach. Delantero', data.parachoque_delantero)}
            ${renderComponente('Capot', data.capot)}
            ${renderComponente('Pta. Cabina', data.puerta_cabina)}
            ${renderComponente('Parab. Trasero', data.parabrisas_trasero)}
            ${renderComponente('Parab. Delantero', data.parabrisas_delantero)}
            ${renderComponente('Espejo Der.', data.espejo_der)}
            ${renderComponente('Espejo Izq.', data.espejo_izq)}
            ${renderComponente('Cables Batería', data.cables_bateria)}
            ${renderComponente('Tapa Gasolina', data.tapa_gasolina)}
            ${renderComponente('Caja Veloc.', data.caja_velocidades)}
            ${renderComponente('Asientos Del.', data.asientos_delanteros)}
            ${renderComponente('Vidrio Lat. D.Izq.', data.vidrio_lat_del_izq)}
            ${renderComponente('Vidrio Lat. D.Der.', data.vidrio_lat_del_der)}
            ${renderComponente('Vidrio Lat. T.Izq.', data.vidrio_lat_tra_izq)}
            ${renderComponente('Vidrio Lat. T.Der.', data.vidrio_lat_tra_der)}
            ${renderComponente('Antena GPS', data.antena_gps)}
            ${renderComponente('Limpia Parab.', data.limpia_parabrisas)}
            ${renderComponente('Tablero Instrum.', data.tablero_instrum)}
            ${renderComponente('Tablero A/A', data.tablero_aa)}
            ${renderComponente('Stop Tras. Der.', data.stop_tras_der)}
            ${renderComponente('Stop Tras. Izq.', data.stop_tras_izq)}
            ${renderComponente('Faro Del. Der.', data.faro_del_der)}
            ${renderComponente('Faro Del. Izq.', data.faro_del_izq)}
            ${renderComponente('Buche Del. Der.', data.buche_del_der)}
            ${renderComponente('Buche Del. Izq.', data.buche_del_izq)}
            ${renderComponente('Buche Tras. Der.', data.buche_tras_der)}
            ${renderComponente('Buche Tras. Izq.', data.buche_tras_izq)}
            ${renderComponente('Coctelera', data.coctelera_comp)}
            ${renderComponente('Tapa Radiador', data.tapa_radiador)}
            ${renderComponente('Tapa Distrib.', data.tapa_distribuidor)}
            ${renderComponente('Asientos Tras.', data.asientos_traseros)}
            ${renderComponente('Volante', data.volante)}
            ${renderComponente('Corneta', data.corneta)}
            ${renderComponente('Reproductor', data.reproductor)}
            ${renderComponente('Luces Der.', data.luces_der)}
            ${renderComponente('Luces Izq.', data.luces_izq)}
            ${renderComponente('Faro Neb. Der.', data.faros_neblina_der)}
            ${renderComponente('Faro Neb. Izq.', data.faros_neblina_izq)}
            ${renderComponente('Cerradura Der.', data.cerradura_der)}
            ${renderComponente('Cerradura Izq.', data.cerradura_izq)}
            ${renderComponente('Bombonas Gas', data.bombonas_gas)}
            ${renderComponente('Cinturones', data.cinturones)}
            ${renderComponente('Cámara Motor', data.camara_motor)}
            ${renderComponente('Electrovent.', data.electroventilador)}
            ${renderComponente('Alternador', data.alternador)}
            ${renderComponente('Compresor A/A', data.compresor_aa)}
            ${renderComponente('Radiador', data.radiador_comp)}
            ${renderComponente('Aspa Radiador', data.aspa_radiador)}
            ${renderComponente('Varilla Aceite', data.varilla_aceite)}
            ${renderComponente('Tapa Bomba Hidr.', data.tapa_bomba_hidr)}
            ${renderComponente('Espoilder Del.', data.espoilder_del)}
            ${renderComponente('Radiador A/A', data.radiador_aa)}
            ${renderComponente('Arranque', data.arranque)}
            ${renderComponente('Computadora', data.computadora)}
            ${renderComponente('Bomba Freno', data.bomba_freno)}
            ${renderComponente('Bomba Dirección', data.bomba_direccion)}
            ${renderComponente('Fan Cooler', data.fan_cooler)}
            ${renderComponente('Cajetín Dirección', data.cajetin_direccion)}
            ${renderComponente('Diferencial Trans.', data.diferencial_trans)}
            ${renderComponente('Disco Freno D.Der.', data.disco_freno_d_der)}
            ${renderComponente('Disco Freno D.Izq.', data.disco_freno_d_izq)}
            ${renderComponente('Tambor Freno T.Der.', data.tambor_freno_t_der)}
            ${renderComponente('Tambor Freno T.Izq.', data.tambor_freno_t_izq)}
            ${renderComponente('Cuerpo Aceleración', data.cuerpo_aceleracion)}
            ${renderComponente('Parrilla Del.', data.parrilla_delantera)}
            ${renderComponente('Llave Cruz', data.llave_cruz)}
            ${renderComponente('Cuña Inmovil.', data.cuña_inmovilizacion)}
            ${renderComponente('Extintor', data.extintor)}
            ${renderComponente('Cenicero', data.cenicero)}
            ${renderComponente('Cardán Del.', data.cardan_del)}
            ${renderComponente('Cardán Tras.', data.cardan_tras)}
          </div>
        </div>
        ${data.observaciones ? `<div class="detail-section"><h4 class="detail-section-title">📝 Observaciones</h4><div class="detail-item full"><div class="detail-value">${data.observaciones}</div></div></div>` : ''}
        <div class="detail-section">
          <h4 class="detail-section-title">👥 Firmas y Responsables</h4>
          <div class="signatures-grid">
            <div class="signature-box">
              <div style="font-weight:700; margin-bottom:10px;">POR LA COORDINACIÓN</div>
              <div class="signature-name">${data.coord_nombre || '-'}</div>
              <div class="signature-rango">${data.coord_rango || ''}${data.coord_cedula ? ` | C.I. ${data.coord_cedula}` : ''}</div>
              <div class="signature-line"></div>
            </div>
            <div class="signature-box">
              <div style="font-weight:700; margin-bottom:10px;">INSPECCIÓN REALIZADA POR:</div>
              <div class="signature-name">${data.insp_nombre || '-'}</div>
              <div class="signature-rango">${data.insp_rango || ''}${data.insp_cedula ? ` | C.I. ${data.insp_cedula}` : ''}</div>
              <div class="signature-line"></div>
            </div>
          </div>
        </div>
      `;
      modalBody.innerHTML = html;
      detailModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    } catch (err) {
      console.error('❌ Error cargando detalle:', err);
      mostrarAlerta('error', `No se pudo cargar el detalle: ${err.message}`);
    }
  }

  // 🔹 HELPERS PARA RENDERIZAR
  function renderAccesorio(label, val) {
    return `<div class="detail-item"><span class="detail-label">${label}</span><div class="detail-value">${val || '-'}</div></div>`;
  }
  function renderCaucho(label, val) {
    const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : '';
    return `<div class="detail-item"><span class="detail-label">${label}</span><div class="detail-value ${cls}" style="padding:2px 8px; border-radius:4px; display:inline-block; font-weight:700;">${val || '-'}</div></div>`;
  }
  function renderComponente(label, val) {
    return `<div class="component-item"><span class="component-label">${label}</span><span class="component-status ${getStatusClass(val)}">${val || 'NT'}</span></div>`;
  }

  // 🔹 CERRAR MODAL
  function cerrarModal() {
    detailModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // 🎧 EVENT LISTENERS
  btnSearch?.addEventListener('click', buscarVehiculo);
  searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarVehiculo(); });
  
  // Filtros rápidos
  btnApplyFilter?.addEventListener('click', aplicarFiltroPlaca);
  filterPlaca?.addEventListener('keypress', (e) => { if (e.key === 'Enter') aplicarFiltroPlaca(); });
  btnClearFilter?.addEventListener('click', () => { filterPlaca.value = ''; filteredInspections = [...allInspections]; currentPage = 1; renderTabla(); updatePaginationControls(filteredInspections.length); });
  
  // Paginación
  btnPrev?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTabla(); updatePaginationControls(filteredInspections.length); resultsSection.scrollIntoView({ behavior: 'smooth' }); } });
  btnNext?.addEventListener('click', () => { const totalPages = Math.ceil(filteredInspections.length / ITEMS_PER_PAGE); if (currentPage < totalPages) { currentPage++; renderTabla(); updatePaginationControls(filteredInspections.length); resultsSection.scrollIntoView({ behavior: 'smooth' }); } });
  
  modalClose?.addEventListener('click', cerrarModal);
  detailModal?.addEventListener('click', (e) => { if (e.target === detailModal) cerrarModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && detailModal.classList.contains('active')) cerrarModal(); });

  // 🚀 INICIALIZACIÓN: Cargar todas las inspecciones al abrir la página
  await cargarTodasInspecciones(1);
});
