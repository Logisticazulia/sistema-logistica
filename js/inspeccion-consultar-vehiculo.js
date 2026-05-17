document.addEventListener('DOMContentLoaded', async () => {
// 🔹 1. INICIALIZACIÓN DE SUPABASE
async function initSupabase() {
let attempts = 0;
while (!window.supabase && attempts < 50) { await new Promise(res => setTimeout(res, 100)); attempts++; }
if (!window.supabase) { mostrarAlerta('error', '❌ No se cargó Supabase. Recargue la página.'); return null; }
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
const { data: { user }, error } = await supabase.auth.getUser();
if (!error && user) { usuarioActual = user; const el = document.getElementById('userEmail'); if (el) el.textContent = user.email || 'Usuario'; }
} catch (err) { console.warn('Sesión no verificada'); }

// 🔹 2. REFERENCIAS DOM
const searchInput = document.getElementById('searchVehicle');
const btnSearch = document.getElementById('btnSearch');
const btnSearchText = btnSearch?.querySelector('.btn-search-text');
const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
const inspectionForm = document.getElementById('inspectionForm'); // Nota: En este archivo de consulta no existe form, pero mantenemos la referencia por seguridad
const btnSubmit = document.getElementById('btnSubmit');
const btnClear = document.getElementById('btnClear');
const vehicleIdInput = document.getElementById('vehicleId');
const alertSuccess = document.getElementById('alertSuccess');
const alertError = document.getElementById('alertError');
const alertInfo = document.getElementById('alertInfo');
const resultsSection = document.getElementById('resultsSection');
const resultsBody = document.getElementById('resultsBody');
const resultsCount = document.getElementById('resultsCount');
const emptyState = document.getElementById('emptyState');
const detailModal = document.getElementById('detailModal');
const modalClose = document.getElementById('modalClose');

// 🔹 3. FUNCIONES AUXILIARES
function mostrarAlerta(tipo, mensaje) {
[alertSuccess, alertError, alertInfo].forEach(el => { if (el) el.style.display = 'none'; });
const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
if (target) { target.querySelector('span:last-child').textContent = mensaje; target.style.display = 'flex'; }
}

function toggleFormState(activo) {
// En el módulo de consulta, ocultamos/mostramos la sección de resultados si fuera necesario
if (resultsSection) resultsSection.style.display = activo ? 'block' : 'none';
}

function generarNInspeccion() {
const now = new Date();
const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0');
const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
return `PVR-${yyyy}${mm}${dd}-${rand}`;
}

function setDefaults() {
const now = new Date();
const f = document.getElementById('fecha_inspeccion'); if (f) f.value = now.toISOString().split('T')[0];
const h = document.getElementById('hora'); if (h) h.value = now.toTimeString().slice(0, 5);
const n = document.getElementById('n_inspeccion'); if (n) n.value = generarNInspeccion();
updatePreview();
}

// 🔍 4. BÚSQUEDA ROBUSTA DE VEHÍCULO (✅ CORREGIDA)
async function buscarVehiculo() {
    const rawQuery = searchInput?.value.trim();
    if (!rawQuery) { mostrarAlerta('info', 'Ingrese Placa, Facsímil o Serial para buscar'); return; }

    if (btnSearch) { btnSearch.disabled = true; btnSearchText.style.display = 'none'; btnSearchLoader.style.display = 'inline'; }
    mostrarAlerta('info', '🔍 Buscando vehículo...');

    try {
        // ✅ CORRECCIÓN: Ya NO eliminamos los espacios. Usamos trim() solo para limpiar extremos.
        const q = rawQuery.toUpperCase();
        console.log('🔍 Query enviada a DB:', q);

        // ✅ CORRECCIÓN: Agregamos % para búsqueda parcial en todos los campos
        const { data: vehiculo, error } = await supabase.from('vehiculos').select('id')
            .or(`placa.ilike.%${q}%,facsimil.ilike.%${q}%,s_carroceria.ilike.%${q}%,s_motor.ilike.%${q}%`)
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        console.log('📦 Resultado búsqueda vehículo:', vehiculo);

        if (!vehiculo) {
            mostrarAlerta('error', '❌ Vehículo no encontrado. Verifique los datos.');
            if (resultsSection) resultsSection.classList.remove('active');
            return;
        }

        // Ahora buscamos las inspecciones de ESE vehículo específico
        mostrarAlerta('info', '📋 Buscando historial de inspecciones...');
        
        const { data: inspecciones, error: inspError } = await supabase.from('inspecciones_pvr')
            .select('id, n_inspeccion, fecha_inspeccion, hora, placa, s_carroceria, motivo')
            .eq('vehiculo_id', vehiculo.id)
            .order('fecha_inspeccion', { ascending: false });

        if (inspError) throw inspError;

        renderTabla(inspecciones || []);

        if (!inspecciones || inspecciones.length === 0) {
            resultsSection.classList.add('active');
            emptyState.style.display = 'block';
            emptyState.innerHTML = '<div class="icon">📭</div><p>Este vehículo existe pero no tiene inspecciones registradas aún.</p>';
        } else {
            resultsSection.classList.add('active');
            emptyState.style.display = 'none';
        }
        mostrarAlerta('success', `✅ Vehículo encontrado. Mostrando ${inspecciones.length} inspección(es).`);

    } catch (err) {
        console.error('❌ Error búsqueda:', err);
        mostrarAlerta('error', `Error: ${err.message}`);
    } finally {
        if (btnSearch) { btnSearch.disabled = false; btnSearchText.style.display = 'inline'; btnSearchLoader.style.display = 'none'; }
    }
}

// 🗑️ 5. LIMPIAR BÚSQUEDA
function limpiarFormulario() {
    if (searchInput) searchInput.value = '';
    if (resultsSection) {
        resultsSection.classList.remove('active');
        emptyState.style.display = 'block';
        emptyState.innerHTML = '<div class="icon">📭</div><p>Busque un vehículo para ver su historial de inspecciones</p>';
    }
}

// 👁️ 6. VISTA PREVIA EN VIVO (Mismo código que en crear)
function updatePreview() {
    // Nota: Este módulo es de consulta, pero si se usa updatePreview, lo dejamos vacío o con la lógica correspondiente.
}

function getComponentesValues() {
    return {}; // No se usa en este módulo
}

// 🗂️ 7. RENDERIZADO DE TABLA
function renderTabla(inspecciones) {
    if (!resultsBody) return;
    resultsBody.innerHTML = '';
    
    if (inspecciones.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 30px; color: #64748b;">No se encontraron resultados</td></tr>';
        return;
    }

    inspecciones.forEach(insp => {
        const tr = document.createElement('tr');
        const fecha = insp.fecha_inspeccion ? new Date(insp.fecha_inspeccion).toLocaleDateString('es-ES') : '-';
        tr.innerHTML = `
            <td class="n-inspeccion">${insp.n_inspeccion || '-'}</td>
            <td class="fecha">${fecha}</td>
            <td class="fecha">${insp.hora || '-'}</td>
            <td class="placa">${insp.placa || '-'}</td>
            <td class="s-carroceria">${insp.s_carroceria || '-'}</td>
            <td class="motivo" title="${insp.motivo || ''}">${insp.motivo || '-'}</td>
            <td><button class="btn-ver" data-id="${insp.id}">👁️ Ver Detalle</button></td>
        `;
        resultsBody.appendChild(tr);
    });

    // Agregar listeners a los botones de ver
    resultsBody.querySelectorAll('.btn-ver').forEach(btn => {
        btn.addEventListener('click', () => abrirDetalle(btn.dataset.id));
    });

    if (resultsCount) resultsCount.textContent = `${inspecciones.length} registro(s)`;
}

// 📄 8. ABRIR DETALLE (MODAL)
async function abrirDetalle(id) {
    try {
        mostrarAlerta('info', '📄 Cargando detalles...');
        const { data, error } = await supabase.from('inspecciones_pvr').select('*').eq('id', id).single();
        if (error) throw error;
        if (!data) { mostrarAlerta('error', 'No se encontraron detalles'); return; }

        poblarVistaPrevia(data);
        if (detailModal) detailModal.classList.add('active');
        if (document) document.body.style.overflow = 'hidden';
    } catch (err) {
        console.error('❌ Error cargando detalle:', err);
        mostrarAlerta('error', `No se pudo cargar el detalle: ${err.message}`);
    }
}

function poblarVistaPrevia(data) {
    const set = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val || '-'; };
    set('pv_n_inspeccion', data.n_inspeccion);
    set('pv_fecha', data.fecha_inspeccion);
    set('pv_hora', data.hora);
    set('pv_motivo', data.motivo);
    set('pv_lugar', `${data.lugar || '-'} / ${data.asignacion || '-'}`);
    set('pv_placa', data.placa);
    set('pv_marca_modelo', `${data.marca || '-'} ${data.modelo || '-'}`);
    set('pv_ano_tipo', `${data.ano || '-'} - ${data.tipo || '-'}`);
    set('pv_color', data.color);
    set('pv_s_carroceria', data.s_carroceria);
    set('pv_n_id', data.n_identificacion);
    set('pv_kms', data.kms ? `${Number(data.kms).toLocaleString()} km` : '-');
    set('pv_rin', data.rin_numero);
    set('pv_bateria', data.bateria); set('pv_est_base', data.estacion_base);
    set('pv_coctelera', data.coctelera); set('pv_triangulo', data.triangulo);
    set('pv_placas', data.placas); set('pv_herramientas', data.herramientas);
    set('pv_gato', data.gato); set('pv_luces', data.sestacion_luces);
    set('pv_ca_d_izq', data.caucho_del_izq || '-'); set('pv_ca_d_der', data.caucho_del_der || '-');
    set('pv_ca_t_izq', data.caucho_tra_izq || '-'); set('pv_ca_t_der', data.caucho_tra_der || '-');
    set('pv_ca_rep', data.caucho_repuesto || '-'); set('pv_tapa', data.tapa_cauchos || '-');
    set('pv_observaciones', data.observaciones || 'Sin observaciones.');
    set('pv_coord_nombre', data.coord_nombre); set('pv_coord_rango', data.coord_rango); set('pv_coord_cedula', data.coord_cedula);
    set('pv_insp_nombre', data.insp_nombre); set('pv_insp_rango', data.insp_rango); set('pv_insp_cedula', data.insp_cedula);

    // Componentes
    const compGrid = document.getElementById('pv_comps_grid');
    if (compGrid) {
        compGrid.innerHTML = '';
        const compNames = [
            'guardafango_del_izq','guardafango_del_der','guardafango_tra_izq','guardafango_tra_der',
            'puerta_del_izq','puerta_del_der','puerta_tra_izq','puerta_tra_der','parachoque_trasero','parachoque_delantero',
            'capot','puerta_cabina','parabrisas_trasero','parabrisas_delantero','espejo_der','espejo_izq','cables_bateria',
            'tapa_gasolina','caja_velocidades','asientos_delanteros','vidrio_lat_del_izq','vidrio_lat_del_der','vidrio_lat_tra_izq',
            'vidrio_lat_tra_der','antena_gps','limpia_parabrisas','tablero_instrum','tablero_aa','stop_tras_der','stop_tras_izq',
            'faro_del_der','faro_del_izq','buche_del_der','buche_del_izq','buche_tras_der','buche_tras_izq','coctelera_comp',
            'tapa_radiador','tapa_distribuidor','asientos_traseros','volante','corneta','reproductor','luces_der','luces_izq',
            'faros_neblina_der','faros_neblina_izq','cerradura_der','cerradura_izq','bombonas_gas','cinturones','camara_motor',
            'electroventilador','alternador','compresor_aa','radiador_comp','aspa_radiador','varilla_aceite','tapa_bomba_hidr',
            'espoilder_del','radiador_aa','arranque','computadora','bomba_freno','bomba_direccion','fan_cooler','cajetin_direccion',
            'diferencial_trans','disco_freno_d_der','disco_freno_d_izq','tambor_freno_t_der','tambor_freno_t_izq','cuerpo_aceleracion',
            'parrilla_delantera','llave_cruz','cuña_inmovilizacion','extintor','cenicero','cardan_del','cardan_tras'
        ];
        compNames.forEach(name => {
            const val = data[name] || 'NT';
            const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : 'status-NT';
            const div = document.createElement('div');
            div.className = 'pv-comp';
            div.innerHTML = `<div class="pv-comp-label">${name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div><div class="pv-comp-status ${cls}">${val}</div>`;
            compGrid.appendChild(div);
        });
    }
}

function cerrarModal() { 
    if (detailModal) detailModal.classList.remove('active'); 
    if (document) document.body.style.overflow = ''; 
}

// 🎧 9. EVENT LISTENERS
btnSearch?.addEventListener('click', buscarVehiculo);
searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarVehiculo(); });
btnClear?.addEventListener('click', limpiarFormulario);
modalClose?.addEventListener('click', cerrarModal);
detailModal?.addEventListener('click', (e) => { if (e.target === detailModal) cerrarModal(); });

// Cargar todas las inspecciones al inicio
async function cargarTodasInspecciones() {
    try {
        if (resultsCount) resultsCount.textContent = '🔄 Cargando historial...';
        const { data, error } = await supabase.from('inspecciones_pvr')
            .select('id, n_inspeccion, fecha_inspeccion, hora, placa, s_carroceria, motivo')
            .order('fecha_inspeccion', { ascending: false })
            .limit(50); // Limitamos a las últimas 50 para no sobrecargar

        if (error) throw error;
        
        renderTabla(data || []);
        if (resultsSection) resultsSection.classList.add('active');
        if (!data || data.length === 0) {
            emptyState.style.display = 'block';
            emptyState.innerHTML = '<div class="icon">📭</div><p>No hay inspecciones registradas aún</p>';
        } else {
            emptyState.style.display = 'none';
        }
    } catch (err) {
        console.error('❌ Error cargando historial:', err);
        mostrarAlerta('error', `Error cargando lista: ${err.message}`);
    }
}

// 🚀 INICIALIZACIÓN
cargarTodasInspecciones();
});
