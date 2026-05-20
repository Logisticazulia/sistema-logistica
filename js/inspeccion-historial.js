document.addEventListener('DOMContentLoaded', async () => {
    // 🔹 CONFIGURACIÓN
    const ITEMS_PER_PAGE = 10;
    let currentPage = 1;
    let allData = [];
    let filteredData = [];
    let charts = {};

    // 🔹 INICIALIZAR SUPABASE
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
    if (!supabase) return;

    // 🧠 LÓGICA MEJORADA PARA DETECTAR SI ES MOTO (FUNCIONA INCLUSO SI 'tipo' ESTÁ VACÍO)
    function esMoto(row) {
        if (!row) return false;
        
        // 1. Prioridad: Si tiene componentes_moto rellenos, es moto
        if (row.componentes_moto) {
            let c = row.componentes_moto;
            if (typeof c === 'string') { try { c = JSON.parse(c); } catch(e){ c={}; } }
            if (Object.keys(c).length > 0) return true;
        }

        // 2. Verificar columna 'tipo'
        const t = (row.tipo || '').toLowerCase();
        if (t.includes('moto') || t.includes('enduro') || t.includes('paseo') || t.includes('trimovil') || t.includes('bicicleta')) return true;

        // 3. Verificar palabras clave en modelo/marca (fallback)
        const m = (row.modelo || '').toLowerCase();
        const ma = (row.marca || '').toLowerCase();
        const keywords = ['dr ', 'dr650', 'dr-650', 'xt', 'ybr', 'xlr', 'bross', 'falcon', 'xcape', 'vstrom', 'kdx', 'klr'];
        
        if (keywords.some(k => m.includes(k))) return true;
        if (['yamaha', 'suzuki', 'kawasaki', 'honda', 'hero', 'bajaj', 'empire', 'bera', 'kadi'].some(k => ma.includes(k))) return true;
        
        return false;
    }

    // 🧩 EXTRACCIÓN INTELIGENTE DE COMPONENTES
    function obtenerComponentes(row) {
        const res = {};
        
        // Si es Moto, usar JSONB
        if (row.componentes_moto) {
            let c = row.componentes_moto;
            if (typeof c === 'string') { try { c = JSON.parse(c); } catch(e){ c={}; } }
            Object.assign(res, c);
        }

        // Si es Vehículo/Patrulla, escanear columnas buscando valores B/M/NT
        const metaKeys = ['id','vehiculo_id','n_inspeccion','fecha_inspeccion','hora','motivo','lugar','asignacion','supervision','placa','marca','modelo','ano','tipo','color','n_identificacion','s_carroceria','kms','inspector','created_at','observaciones','coord_nombre','coord_rango','coord_cedula','coord_telefono','insp_nombre','insp_rango','insp_cedula','insp_telefono','componentes_moto','s_motor','facsimil'];
        
        Object.keys(row).forEach(k => {
            if (!metaKeys.includes(k)) {
                const val = (row[k] || '').toString().toUpperCase();
                if (['B', 'M', 'NT'].includes(val)) {
                    res[k] = val;
                }
            }
        });
        return res;
    }

    // 🔹 CARGAR DATOS DE INSPECCIONES (SIN JOIN ERRÓNEO)
    async function cargarDatos(filtros = {}) {
        try {
            let query = supabase.from('inspecciones_pvr').select('*');
            
            if (filtros.desde) query = query.gte('fecha_inspeccion', filtros.desde);
            if (filtros.hasta) query = query.lte('fecha_inspeccion', filtros.hasta);
            if (filtros.placa) query = query.ilike('placa', `%${filtros.placa}%`);

            const { data, error } = await query.order('fecha_inspeccion', { ascending: false });
            if (error) throw error;

            // Filtrado en cliente para asegurar precisión
            let result = data || [];
            if (filtros.tipo === 'moto') result = result.filter(r => esMoto(r));
            if (filtros.tipo === 'patrulla') result = result.filter(r => !esMoto(r));

            return result;
        } catch (err) {
            console.error('❌ Error cargando datos:', err);
            return [];
        }
    }

    // 🔹 CALCULAR KPIS
    function calcularKpis(data) {
        const total = data.length;
        const motos = data.filter(r => esMoto(r)).length;
        const patrullas = total - motos;
        
        let totalComponentes = 0, malos = 0;
        data.forEach(d => {
            const comps = obtenerComponentes(d);
            Object.values(comps).forEach(v => {
                if (v) { totalComponentes++; if (v === 'M') malos++; }
            });
        });

        document.getElementById('kpiTotal').textContent = total.toLocaleString();
        document.getElementById('kpiPatrullas').textContent = patrullas.toLocaleString();
        document.getElementById('kpiMotos').textContent = motos.toLocaleString();
        document.getElementById('kpiMalos').textContent = malos.toLocaleString();
        
        const porcentaje = totalComponentes > 0 ? ((malos / totalComponentes) * 100).toFixed(1) : 0;
        document.getElementById('kpiPorcentaje').textContent = `⚠️ ${porcentaje}% del total`;
    }

    // 🔹 RENDERIZAR GRÁFICOS
    function renderGraficos(data) {
        // 1️⃣ Inspecciones por Mes
        const porMes = {};
        data.forEach(d => {
            const mes = d.fecha_inspeccion?.slice(0, 7) || 'Desconocido';
            porMes[mes] = (porMes[mes] || 0) + 1;
        });
        const labelsMeses = Object.keys(porMes).sort();
        const valoresMeses = labelsMeses.map(m => porMes[m]);

        if (charts.meses) charts.meses.destroy();
        charts.meses = new Chart(document.getElementById('chartMeses'), {
            type: 'line',
            data: {
                labels: labelsMeses.map(m => { const [y, mm] = m.split('-'); return `${mm}/${y.slice(2)}`; }),
                datasets: [{ label: 'Inspecciones', data: valoresMeses, borderColor: '#005b96', backgroundColor: 'rgba(0, 91, 150, 0.1)', tension: 0.4, fill: true }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // 2️⃣ Distribución B/M/NT
        let b = 0, m = 0, nt = 0;
        data.forEach(d => {
            Object.values(obtenerComponentes(d)).forEach(v => {
                if (v === 'B') b++; else if (v === 'M') m++; else nt++;
            });
        });

        if (charts.distribucion) charts.distribucion.destroy();
        charts.distribucion = new Chart(document.getElementById('chartDistribucion'), {
            type: 'doughnut',
            data: { labels: ['Bueno', 'Malo', 'N/T'], datasets: [{ data: [b, m, nt], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'], borderWidth: 0 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // 3️⃣ Top 10 Componentes Fallados
        const fallados = {};
        data.forEach(d => {
            Object.entries(obtenerComponentes(d)).forEach(([k, v]) => {
                if (v === 'M') {
                    const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    fallados[label] = (fallados[label] || 0) + 1;
                }
            });
        });
        const topFallados = Object.entries(fallados).sort((a, b) => b[1] - a[1]).slice(0, 10);
        
        if (charts.topFallados) charts.topFallados.destroy();
        charts.topFallados = new Chart(document.getElementById('chartTopFallados'), {
            type: 'bar',
            data: { labels: topFallados.map(([k]) => k), datasets: [{ label: 'Veces en Mal Estado', data: topFallados.map(([, v]) => v), backgroundColor: '#ef4444', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true } } }
        });

        // 4️⃣ Inspecciones por Inspector
        const porInspector = {};
        data.forEach(d => { porInspector[d.insp_nombre || 'Sin asignar'] = (porInspector[d.insp_nombre || 'Sin asignar'] || 0) + 1; });
        const topInspectores = Object.entries(porInspector).sort((a, b) => b[1] - a[1]).slice(0, 8);
        
        if (charts.inspectores) charts.inspectores.destroy();
        charts.inspectores = new Chart(document.getElementById('chartInspectores'), {
            type: 'bar',
            data: { labels: topInspectores.map(([k]) => k), datasets: [{ label: 'Inspecciones', data: topInspectores.map(([, v]) => v), backgroundColor: '#005b96', borderRadius: 4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    }

    // 🔹 RENDERIZAR TABLA
    function renderTabla(data, page = 1) {
        const start = (page - 1) * ITEMS_PER_PAGE;
        const pageData = data.slice(start, start + ITEMS_PER_PAGE);
        const tbody = document.getElementById('tableBody');
        tbody.innerHTML = '';

        if (pageData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color: #64748b;">No hay registros</td></tr>';
            return;
        }

        pageData.forEach(d => {
            const moto = esMoto(d);
            const tipoBadge = `<span class="badge ${moto ? 'badge-moto' : 'badge-patrulla'}">${moto ? '🏍️ Moto' : '🚓 Patrulla'}</span>`;
            
            // Contar componentes "M"
            let malos = 0;
            Object.values(obtenerComponentes(d)).forEach(v => { if (v === 'M') malos++; });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${d.n_inspeccion || '-'}</strong></td>
                <td>${d.fecha_inspeccion?.split('-').reverse().join('/') || '-'}</td>
                <td>${tipoBadge}</td>
                <td><strong>${d.placa || '-'}</strong></td>
                <td>${d.insp_nombre || '-'}</td>
                <td><span style="color: ${malos > 0 ? '#ef4444' : '#10b981'}; font-weight: 600;">${malos}</span></td>
                <td><button class="btn-ver-detalle" data-id="${d.id}">👁️ Ver</button></td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('tableCount').textContent = `${data.length} registro${data.length !== 1 ? 's' : ''}`;
        const btnPrev = document.getElementById('btnPrev');
        const btnNext = document.getElementById('btnNext');
        if(btnPrev) btnPrev.disabled = page <= 1;
        if(btnNext) btnNext.disabled = page >= Math.ceil(data.length / ITEMS_PER_PAGE);

        tbody.querySelectorAll('.btn-ver-detalle').forEach(btn => {
            btn.addEventListener('click', () => abrirDetalle(btn.dataset.id));
        });
    }

    // 🔹 ABRIR MODAL CON DETALLE
    async function abrirDetalle(id) {
        try {
            const { data, error } = await supabase.from('inspecciones_pvr').select('*').eq('id', id).single();
            if (error) throw error; if (!data) return;

            document.getElementById('modalNInspeccion').textContent = data.n_inspeccion || '';
            const esM = esMoto(data);
            
            let html = `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                    <div><strong>N° Inspección:</strong> ${data.n_inspeccion || '-'}</div>
                    <div><strong>Fecha:</strong> ${data.fecha_inspeccion?.split('-').reverse().join('/') || '-'}</div>
                    <div><strong>Hora:</strong> ${data.hora || '-'}</div>
                    <div><strong>Motivo:</strong> ${data.motivo || '-'}</div>
                    <div><strong>Lugar:</strong> ${data.lugar || '-'}</div>
                    <div><strong>Asignación:</strong> ${data.asignacion || '-'}</div>
                    <div><strong>Tipo:</strong> ${esM ? '🏍️ MOTO' : '🚓 VEHÍCULO'}</div>
                    <div><strong>Placa:</strong> ${data.placa || '-'}</div>
                    <div><strong>Marca/Modelo:</strong> ${data.marca || '-'} ${data.modelo || ''}</div>
                </div>
                <div style="margin-bottom: 20px;"><strong>Observaciones:</strong><br>${data.observaciones || 'Sin observaciones.'}</div>
                <div style="margin-bottom: 20px;">
                    <strong>Componentes en Mal Estado (M):</strong>
                    <ul style="margin: 8px 0 0 20px; color: #ef4444;">
            `;
            
            const comps = obtenerComponentes(data);
            let hayMalos = false;
            Object.entries(comps).forEach(([k, v]) => {
                if (v === 'M') {
                    hayMalos = true;
                    html += `<li>${k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</li>`;
                }
            });
            if (!hayMalos) html += '<li style="color:#10b981">Todos los componentes reportados están en buen estado (B) o N/T.</li>';

            html += `</ul></div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                <div style="text-align: center;">
                    <div style="font-weight: 700; margin-bottom: 10px;">POR LA COORDINACIÓN</div>
                    <div style="border-top: 2px solid #000; width: 80%; margin: 0 auto 8px;"></div>
                    <div>${data.coord_nombre || '-'}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${data.coord_rango || ''}${data.coord_cedula ? ` | C.I. ${data.coord_cedula}` : ''}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-weight: 700; margin-bottom: 10px;">INSPECCIÓN REALIZADA POR:</div>
                    <div style="border-top: 2px solid #000; width: 80%; margin: 0 auto 8px;"></div>
                    <div>${data.insp_nombre || '-'}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${data.insp_rango || ''}${data.insp_cedula ? ` | C.I. ${data.insp_cedula}` : ''}</div>
                </div>
            </div>`;

            document.getElementById('modalBody').innerHTML = html;
            document.getElementById('detailModal').classList.add('active');
            document.body.style.overflow = 'hidden';
        } catch (err) {
            console.error('❌ Error cargando detalle:', err);
            alert('No se pudo cargar el detalle');
        }
    }

    function cerrarModal() {
        document.getElementById('detailModal').classList.remove('active');
        document.body.style.overflow = '';
    }

    // 🔹 EXPORTAR A EXCEL (CSV)
    function exportarExcel() {
        if (filteredData.length === 0) { alert('No hay datos para exportar'); return; }
        const headers = ['N° Inspección', 'Fecha', 'Hora', 'Tipo', 'Placa', 'Marca', 'Modelo', 'Motivo', 'Inspector', 'Componentes M'];
        const rows = filteredData.map(d => {
            let malos = 0;
            Object.values(obtenerComponentes(d)).forEach(v => { if (v === 'M') malos++; });
            return [
                d.n_inspeccion, d.fecha_inspeccion, d.hora, esMoto(d) ? 'Moto' : 'Patrulla',
                d.placa, d.marca, d.modelo, d.motivo, d.insp_nombre, malos
            ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inspecciones_historial_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // 🎧 EVENT LISTENERS
    document.getElementById('btnAplicarFiltros')?.addEventListener('click', async () => {
        const filtros = {
            desde: document.getElementById('filterDesde').value,
            hasta: document.getElementById('filterHasta').value,
            tipo: document.getElementById('filterTipo').value,
            placa: document.getElementById('filterPlaca').value.trim()
        };
        allData = await cargarDatos(filtros);
        filteredData = [...allData];
        currentPage = 1;
        calcularKpis(filteredData);
        renderGraficos(filteredData);
        renderTabla(filteredData, currentPage);
    });

    document.getElementById('btnExportar')?.addEventListener('click', exportarExcel);
    document.getElementById('btnPrev')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderTabla(filteredData, currentPage); } });
    document.getElementById('btnNext')?.addEventListener('click', () => { const maxPage = Math.ceil(filteredData.length / ITEMS_PER_PAGE); if (currentPage < maxPage) { currentPage++; renderTabla(filteredData, currentPage); } });
    document.getElementById('modalClose')?.addEventListener('click', cerrarModal);
    document.getElementById('detailModal')?.addEventListener('click', e => { if (e.target.id === 'detailModal') cerrarModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarModal(); });

    // 🚀 INICIALIZACIÓN
    const hoy = new Date().toISOString().split('T')[0];
    const hace30 = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];
    if(document.getElementById('filterDesde').value) document.getElementById('filterDesde').value = hace30;
    if(document.getElementById('filterHasta').value) document.getElementById('filterHasta').value = hoy;

    allData = await cargarDatos({ desde: hace30, hasta: hoy });
    filteredData = [...allData];
    calcularKpis(filteredData);
    renderGraficos(filteredData);
    renderTabla(filteredData, currentPage);
});
