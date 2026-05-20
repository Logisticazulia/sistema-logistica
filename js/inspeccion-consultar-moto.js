document.addEventListener('DOMContentLoaded', async () => {
    const ITEMS_PER_PAGE = 15;
    let currentPage = 1;
    let allInspections = [];
    let filteredInspections = [];

    // ================= ELEMENTOS DEL DOM =================
    const searchInput = document.getElementById('searchMoto');
    const btnSearch = document.getElementById('btnSearch');
    const btnClearSearch = document.getElementById('btnClearSearch');
    const resultsSection = document.getElementById('resultsSection');
    const resultsBody = document.getElementById('resultsBody');
    const resultsCount = document.getElementById('resultsCount');
    const emptyState = document.getElementById('emptyState');
    const detailModal = document.getElementById('detailModal');
    const modalClose = document.getElementById('modalClose');
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');
    const alertInfo = document.getElementById('alertInfo');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const currentPageNum = document.getElementById('currentPageNum');
    const totalPagesNum = document.getElementById('totalPagesNum');

    // Regex flexible para identificar motos
    const motoTypesRegex = /MOTO|ENDURO|PASEO|TRIMOVIL|TRACCION DE SANGRE/i;
    const motoModelRegex = /DR|VSTROM|YBR|KLR|TX|BRF|CLASSIC|XCAPE/i;

    // ================= INICIALIZAR SUPABASE =================
    async function initSupabase() {
        let attempts = 0;
        while (!window.supabase && attempts < 50) { await new Promise(res => setTimeout(res, 100)); attempts++; }
        if (!window.supabase) return null;
        if (window.supabase.auth) return window.supabase;
        const createFn = window.supabase.createClient || window.createClient;
        if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
            try { window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY); return window.supabase; }
            catch (err) { console.error('❌ Error init Supabase:', err); return null; }
        }
        return null;
    }

    const supabase = await initSupabase();
    if (!supabase) { mostrarAlerta('error', '❌ No se pudo conectar a Supabase. Revisa config.js'); return; }

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) { const el = document.getElementById('userEmail'); if (el) el.textContent = user.email || 'Usuario'; }
    } catch (err) { console.warn('Sesión no verificada'); }

    // ================= FUNCIONES AUXILIARES =================
    function mostrarAlerta(tipo, mensaje) {
        [alertSuccess, alertError, alertInfo].forEach(el => { if (el) el.style.display = 'none'; });
        const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
        if (target) { const span = target.querySelector('span:last-child'); if(span) span.textContent = mensaje; target.style.display = 'flex'; }
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
    }

    const esMoto = (r) => {
        if (!r) return false;
        const t = r.tipo || '';
        const m = r.modelo || '';
        const ma = r.marca || '';
        return motoTypesRegex.test(t) || motoModelRegex.test(m) || motoModelRegex.test(ma);
    };

    // ================= CARGAR TODO EL HISTORIAL =================
    async function cargarTodasInspecciones(page = 1) {
        try {
            resultsCount.textContent = '🔄 Cargando historial de motos...';
            const from = (page - 1) * ITEMS_PER_PAGE;

            // 1. Obtener datos
            const { data, error } = await supabase.from('inspecciones_pvr')
                .select('id, n_inspeccion, fecha_inspeccion, hora, placa, s_motor, motivo, tipo, marca, modelo')
                .order('fecha_inspeccion', { ascending: false })
                .range(from, from + ITEMS_PER_PAGE - 1);

            if (error) throw error;
            console.log('📊 Datos recibidos de BD:', data); // 🔍 DIAGNÓSTICO

            // 2. Filtrar motos en cliente (con fallback si 'tipo' es null)
            const motoData = (data || []).filter(r => esMoto(r));

            // Diagnóstico si no hay resultados
            if (motoData.length === 0 && data.length > 0) {
                console.warn('⚠️ Hay inspecciones pero ninguna tiene "tipo=MOTO". Verifica si el campo "tipo" está vacío en tu BD.');
                // Opcional: Mostrar todas temporalmente para depurar
                // allInspections = data; filteredInspections = data;
            }

            allInspections = motoData;
            filteredInspections = [...allInspections];
            currentPage = page;

            renderTabla();
            updatePaginationControls(data.length || 0);

            if (filteredInspections.length === 0) {
                resultsSection.classList.remove('active'); 
                emptyState.style.display = 'block';
            } else {
                resultsSection.classList.add('active'); 
                emptyState.style.display = 'none';
            }
        } catch (err) {
            console.error('❌ Error cargando inspecciones motos:', err);
            mostrarAlerta('error', `No se pudo cargar el listado: ${err.message}`);
        }
    }

    // ================= RENDERIZAR TABLA =================
    function renderTabla() {
        resultsBody.innerHTML = '';
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageData = filteredInspections.slice(start, start + ITEMS_PER_PAGE);

        if (pageData.length === 0) {
            resultsBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color: #64748b;">📭 No hay resultados para mostrar</td></tr>';
            return;
        }

        pageData.forEach(insp => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="n-inspeccion">${insp.n_inspeccion || '-'}</td>
                <td class="fecha">${formatDate(insp.fecha_inspeccion)}</td>
                <td class="fecha">${insp.hora || '-'}</td>
                <td class="placa">${insp.placa || '-'}</td>
                <td class="s-motor" style="font-family:monospace; font-size:0.85rem; color:#475569;">${insp.s_motor || '-'}</td>
                <td class="motivo" title="${insp.motivo || ''}">${insp.motivo || '-'}</td>
                <td><button class="btn-ver" data-id="${insp.id}">👁️ Ver Detalle</button></td>
            `;
            resultsBody.appendChild(tr);
        });

        resultsBody.querySelectorAll('.btn-ver').forEach(btn => {
            btn.addEventListener('click', () => abrirDetalle(btn.dataset.id));
        });
    }

    function updatePaginationControls(totalItems) {
        const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
        currentPageNum.textContent = currentPage;
        totalPagesNum.textContent = totalPages;
        
        if (btnPrev) btnPrev.disabled = currentPage <= 1;
        if (btnNext) btnNext.disabled = currentPage >= totalPages;
        
        resultsCount.textContent = `${filteredInspections.length} registro${filteredInspections.length !== 1 ? 's' : ''} encontrados`;
    }

    // ================= BÚSQUEDA DIRECTA =================
    async function buscarMoto() {
        const rawQuery = searchInput?.value.trim();
        if (!rawQuery) { mostrarAlerta('info', '📝 Ingrese Placa, Serial o Identificación para buscar.'); return; }
        if (btnSearch) btnSearch.disabled = true;
        mostrarAlerta('info', '🔍 Buscando motocicleta...');

        try {
            const q = rawQuery.replace(/\s+/g, '').toUpperCase();
            
            // Buscar en inspecciones_pvr
            const { data, error } = await supabase.from('inspecciones_pvr')
                .select('id, n_inspeccion, fecha_inspeccion, hora, placa, s_motor, motivo, tipo, marca, modelo')
                .or(`placa.ilike.${q},s_motor.ilike.${q},n_identificacion.ilike.${q},n_inspeccion.ilike.${q}`)
                .order('fecha_inspeccion', { ascending: false });

            if (error) throw error;

            // Filtrar solo motos
            allInspections = (data || []).filter(r => esMoto(r));
            filteredInspections = [...allInspections];
            currentPage = 1;

            if (filteredInspections.length === 0) {
                mostrarAlerta('error', '❌ No se encontraron inspecciones de MOTO con ese dato.');
                resultsSection.classList.remove('active'); 
                emptyState.style.display = 'block';
            } else {
                renderTabla(); 
                updatePaginationControls(filteredInspections.length);
                resultsSection.classList.add('active'); 
                emptyState.style.display = 'none';
                mostrarAlerta('success', `✅ ${filteredInspections.length} inspección(es) encontrada(s).`);
            }
        } catch (err) {
            console.error('❌ Error búsqueda:', err);
            mostrarAlerta('error', `Error al buscar: ${err.message}`);
        } finally { 
            if (btnSearch) btnSearch.disabled = false; 
        }
    }

    function limpiarBusqueda() {
        if(searchInput) searchInput.value = '';
        mostrarAlerta('info', '🔄 Cargando historial completo...');
        cargarTodasInspecciones(1);
    }

    // ================= MODAL Y VISTA PREVIA =================
    async function abrirDetalle(id) {
        try {
            const { data, error } = await supabase.from('inspecciones_pvr').select('*').eq('id', id).single();
            if (error) throw error; if (!data) return;
            poblarVistaPrevia(data);
            if (detailModal) { detailModal.classList.add('active'); document.body.style.overflow = 'hidden'; }
        } catch (err) {
            console.error('❌ Error cargando detalle:', err);
            mostrarAlerta('error', `No se pudo cargar el detalle: ${err.message}`);
        }
    }

    function cerrarModal() { if (detailModal) { detailModal.classList.remove('active'); document.body.style.overflow = ''; } }

    function poblarVistaPrevia(data) {
        const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || '-'; };
        set('pv_n_inspeccion', data.n_inspeccion); set('pv_fecha', formatDate(data.fecha_inspeccion)); set('pv_hora', data.hora);
        set('pv_motivo', data.motivo); set('pv_lugar', `${data.lugar || '-'} / ${data.asignacion || '-'}`);
        set('pv_placa', data.placa); set('pv_marca_modelo', `${data.marca || '-'} ${data.modelo || '-'}`);
        set('pv_ano_color', `${data.ano || '-'} / ${data.color || '-'}`);
        set('pv_s_carroceria', data.s_carroceria); set('pv_s_motor', data.s_motor);
        set('pv_n_id', data.n_identificacion); set('pv_kms', data.kms ? `${Number(data.kms).toLocaleString()} km` : '-');
        set('pv_coord_nombre', data.coord_nombre); set('pv_coord_rango', data.coord_rango); set('pv_coord_cedula', data.coord_cedula);
        set('pv_insp_nombre', data.insp_nombre); set('pv_insp_rango', data.insp_rango); set('pv_insp_cedula', data.insp_cedula);
        set('pv_observaciones', data.observaciones || 'Sin observaciones.');

        const compGrid = document.getElementById('pv_comps_grid'); compGrid.innerHTML = '';
        let comps = data.componentes_moto || {};
        const compKeys = Object.keys(comps);
        
        if (compKeys.length > 0) {
            compKeys.forEach(key => {
                const val = comps[key] || 'NT';
                const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : 'status-NT';
                const div = document.createElement('div');
                div.className = 'pv-comp';
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                div.innerHTML = `<div class="pv-comp-label">${label}</div><div class="pv-comp-status ${cls}">${val}</div>`;
                compGrid.appendChild(div);
            });
        } else {
            compGrid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:#999; padding:20px;">⚠️ Sin componentes registrados.</div>';
        }
    }

    // ================= EVENT LISTENERS =================
    if (btnSearch) btnSearch.addEventListener('click', buscarMoto);
    if (btnClearSearch) btnClearSearch.addEventListener('click', limpiarBusqueda);
    if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarMoto(); });
    if (modalClose) modalClose.addEventListener('click', cerrarModal);
    if (detailModal) detailModal.addEventListener('click', (e) => { if (e.target === detailModal) cerrarModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && detailModal && detailModal.classList.contains('active')) cerrarModal(); });
    
    if (btnPrev) btnPrev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTabla(); updatePaginationControls(filteredInspections.length || allInspections.length); resultsSection.scrollIntoView({ behavior: 'smooth' }); } });
    if (btnNext) btnNext.addEventListener('click', () => { const tp = Math.ceil((filteredInspections.length || allInspections.length) / ITEMS_PER_PAGE); if (currentPage < tp) { currentPage++; renderTabla(); updatePaginationControls(filteredInspections.length || allInspections.length); resultsSection.scrollIntoView({ behavior: 'smooth' }); } });

    await cargarTodasInspecciones(1);
});
