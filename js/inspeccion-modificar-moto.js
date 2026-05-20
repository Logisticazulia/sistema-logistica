document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // INICIALIZACIÓN DE SUPABASE
    // ==========================================
    async function initSupabase() {
        let attempts = 0;
        while (!window.supabase && attempts < 50) {
            await new Promise(res => setTimeout(res, 100));
            attempts++;
        }
        if (!window.supabase) {
            mostrarAlerta('error', '❌ No se cargó Supabase. Recargue la página.');
            return null;
        }
        if (window.supabase.auth) return window.supabase;
        const createFn = window.supabase.createClient || window.createClient;
        if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
            try {
                window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY);
                return window.supabase;
            } catch (err) {
                console.error('❌ Error inicializando Supabase:', err);
                return null;
            }
        }
        return null;
    }
    const supabase = await initSupabase();
    if (!supabase) return;

    // ==========================================
    // VARIABLES GLOBALES
    // ==========================================
    let usuarioActual = null;
    const searchInput = document.getElementById('searchInspection');
    const btnSearch = document.getElementById('btnSearch');
    const btnSearchText = btnSearch?.querySelector('.btn-search-text');
    const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
    const motoForm = document.getElementById('motoForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnClearSearch = document.getElementById('btnClearSearch'); // ID del botón en la barra
    const btnClearForm = document.getElementById('btnClear'); // ID del botón en el form
    const recordIdInput = document.getElementById('recordId');
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');
    const alertInfo = document.getElementById('alertInfo');

    // ==========================================
    // FUNCIONES DE UTILIDAD
    // ==========================================
    function mostrarAlerta(tipo, mensaje) {
        [alertSuccess, alertError, alertInfo].forEach(el => { if(el) el.style.display = 'none'; });
        const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
        if(target) {
            const span = target.querySelector('span:last-child');
            if(span) span.textContent = mensaje;
            target.style.display = 'flex';
        }
        if (tipo !== 'info') {
            setTimeout(() => { if(target) target.style.display = 'none'; }, 5000);
        }
    }

    function toggleFormState(activo) {
        if (!motoForm) return;
        motoForm.style.opacity = activo ? '1' : '0.6';
        motoForm.style.pointerEvents = activo ? 'auto' : 'none';
        if (btnSubmit) {
            btnSubmit.disabled = !activo || !usuarioActual;
        }
    }

    // ==========================================
    // VERIFICAR SESIÓN
    // ==========================================
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            usuarioActual = user;
            const el = document.getElementById('userEmail');
            if(el) el.textContent = user.email || 'Usuario';
        }
    } catch (err) {
        console.warn('⚠️ Sesión no verificada:', err);
    }

    // ==========================================
    // FUNCIÓN DE BÚSQUEDA (VERSIÓN DEFINITIVA)
    // ==========================================
    async function buscarInspeccion() {
        const q = searchInput?.value.trim();
        if (!q) {
            mostrarAlerta('info', '⚠️ Ingrese Placa, Serial, Cédula o N° de Inspección');
            return;
        }

        if(btnSearch) {
            btnSearch.disabled = true;
            if(btnSearchText) btnSearchText.style.display = 'none';
            if(btnSearchLoader) btnSearchLoader.style.display = 'inline';
        }
        mostrarAlerta('info', '🔍 Consultando base de datos...');

        try {
            const cleanQ = q.replace(/\s+/g, '').toUpperCase();
            console.log('🔍 Término buscado:', cleanQ);

            // 📝 Cláusula OR SOLO con columnas que existen en inspecciones_pvr
            // (placa, s_carroceria, n_identificacion, s_motor, n_inspeccion)
            const orClause = `n_inspeccion.ilike.%${cleanQ}%,placa.ilike.%${cleanQ}%,s_carroceria.ilike.%${cleanQ}%,n_identificacion.ilike.%${cleanQ}%,s_motor.ilike.%${cleanQ}%`;
            
            console.log('📝 Cláusula OR:', orClause);

            // 1️⃣ Buscamos en inspecciones_pvr Y traemos 'clase' desde la tabla vehiculos
            // Esto asegura que validemos contra la clasificación real del vehículo
            const { data, error } = await supabase
                .from('inspecciones_pvr')
                .select('*, vehiculos!vehiculo_id(clase)') 
                .or(orClause)
                .limit(1)
                .maybeSingle();

            console.log('📦 Respuesta Supabase:', { data, error });

            if (error) {
                console.error('❌ Error de PostgREST:', error);
                throw error;
            }

            if (!data) {
                mostrarAlerta('error', '❌ No se encontró ningún PVR con ese dato.');
                toggleFormState(false);
                return;
            }

            // 2️⃣ Validar que sea MOTO usando la columna CLASE de la tabla vehiculos
            // Si no hay relación vehiculos, fallback a tipo (aunque el usuario pidió clase)
            const claseVal = data.vehiculos?.clase ? data.vehiculos.clase.toUpperCase().trim() : '';
            const tipoVal = (data.tipo || '').toUpperCase().trim();
            
            console.log('🏍️ Validación -> Clase:', claseVal, '| Tipo:', tipoVal);

            // Validamos que la CLASE contenga "MOTO"
            if (!claseVal.includes('MOTO')) {
                mostrarAlerta('error', `⚠️ Registro encontrado pero es clase '${claseVal || '(NO DEFINIDA)'}'. Este módulo SOLO permite editar MOTOS.`);
                toggleFormState(false);
                return;
            }

            // ✅ Cargar datos en el formulario
            recordIdInput.value = data.id;
            const camposBasicos = [
                'n_inspeccion', 'fecha_inspeccion', 'hora', 'motivo_inspeccion',
                'lugar', 'asignacion', 'supervision', 'placa', 'marca', 'modelo',
                'ano', 'color', 's_carroceria', 's_motor', 'n_identificacion',
                'observaciones', 'coord_nombre', 'coord_rango', 'coord_cedula',
                'coord_telefono', 'insp_nombre', 'insp_rango', 'insp_cedula', 'insp_telefono'
            ];
            camposBasicos.forEach(campo => {
                const el = document.getElementById(campo);
                if (el) el.value = data[campo] ?? '';
            });

            // Cargar componentes JSONB
            const comps = data.componentes_moto || {};
            document.querySelectorAll('.inspection-item input[type="radio"]').forEach(radio => {
                const valor = comps[radio.name];
                radio.checked = valor ? radio.value === valor : false;
            });

            toggleFormState(true);
            if (typeof updatePreview === 'function') updatePreview();
            mostrarAlerta('success', '✅ MOTO cargada correctamente. Edite y presione "Actualizar".');

        } catch (err) {
            console.error('💥 Error capturado:', err);
            mostrarAlerta('error', `Fallo al buscar: ${err.message || 'Revise consola F12'}`);
        } finally {
            if (btnSearch) {
                btnSearch.disabled = false;
                if (btnSearchText) btnSearchText.style.display = 'inline';
                if (btnSearchLoader) btnSearchLoader.style.display = 'none';
            }
        }
    }

    // ==========================================
    // LIMPIAR FORMULARIO
    // ==========================================
    function limpiarFormulario() {
        if(searchInput) searchInput.value = '';
        if(motoForm) motoForm.reset();
        if(recordIdInput) recordIdInput.value = '';
        toggleFormState(false);
        updatePreview();
        mostrarAlerta('info', '🔍 Busque una inspección para habilitar la edición');
    }

    // ==========================================
    // ACTUALIZAR VISTA PREVIA
    // ==========================================
    function updatePreview() {
        const v = (id) => { const el = document.getElementById(id); return el?.value || '-'; };
        const vs = (id) => { const el = document.getElementById(id); return el?.options[el.selectedIndex]?.text || '-'; };

        document.getElementById('pv_n_inspeccion').textContent = v('n_inspeccion');
        document.getElementById('pv_fecha').textContent = v('fecha_inspeccion');
        document.getElementById('pv_hora').textContent = v('hora');
        document.getElementById('pv_motivo').textContent = v('motivo_inspeccion');
        document.getElementById('pv_lugar').textContent = `${v('lugar')} / ${v('asignacion')}`;
        document.getElementById('pv_placa').textContent = v('placa');
        document.getElementById('pv_marca_modelo').textContent = `${v('marca')} ${v('modelo')}`;
        document.getElementById('pv_ano_tipo').textContent = `${v('ano')} - MOTO`;
        document.getElementById('pv_color').textContent = v('color');
        document.getElementById('pv_s_carroceria').textContent = v('s_carroceria');
        document.getElementById('pv_s_motor').textContent = v('s_motor');
        document.getElementById('pv_n_id').textContent = v('n_identificacion');
        document.getElementById('pv_observaciones').textContent = v('observaciones') || 'Sin observaciones.';
        document.getElementById('pv_coord_nombre').textContent = v('coord_nombre');
        document.getElementById('pv_coord_rango').textContent = vs('coord_rango');
        document.getElementById('pv_coord_cedula').textContent = v('coord_cedula');
        document.getElementById('pv_insp_nombre').textContent = v('insp_nombre');
        document.getElementById('pv_insp_rango').textContent = vs('insp_rango');
        document.getElementById('pv_insp_cedula').textContent = v('insp_cedula');

        const compGrid = document.getElementById('pv_comps_grid');
        if(compGrid) {
            compGrid.innerHTML = '';
            document.querySelectorAll('.inspection-item').forEach(item => {
                const labelEl = item.querySelector('.item-label');
                const radio = item.querySelector('input:checked');
                if (labelEl) {
                    const label = labelEl.textContent || '';
                    const val = radio?.value || 'NT';
                    const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : 'status-NT';
                    const div = document.createElement('div');
                    div.className = 'pv-comp';
                    div.innerHTML = `<div class="pv-comp-label">${label}</div><div class="pv-comp-status ${cls}">${val}</div>`;
                    compGrid.appendChild(div);
                }
            });
        }
    }

    // ==========================================
    // OBTENER VALORES DE COMPONENTES
    // ==========================================
    function getComponentesMotoValues() {
        const componentes = {};
        document.querySelectorAll('.inspection-item input[type="radio"]').forEach(radio => {
            if (!componentes[radio.name]) componentes[radio.name] = 'NT';
            if (radio.checked) componentes[radio.name] = radio.value;
        });
        return componentes;
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    if(btnSearch) btnSearch.addEventListener('click', buscarInspeccion);
    if(searchInput) searchInput.addEventListener('keypress', e => { if(e.key === 'Enter') buscarInspeccion(); });
    if(btnClearSearch) btnClearSearch.addEventListener('click', limpiarFormulario);
    if(btnClearForm) btnClearForm.addEventListener('click', limpiarFormulario);

    if(motoForm) {
        motoForm.addEventListener('input', updatePreview);
        motoForm.addEventListener('change', updatePreview);
        motoForm.addEventListener('submit', async e => {
            e.preventDefault();
            if(!usuarioActual) { mostrarAlerta('error', '🔐 Inicie sesión para guardar'); return; }
            if(!recordIdInput.value) { mostrarAlerta('error', 'Busque una inspección primero'); return; }
            
            btnSubmit.disabled = true;
            try {
                const payload = {
                    fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value || null,
                    hora: document.getElementById('hora')?.value || null,
                    motivo: document.getElementById('motivo_inspeccion').value = data.motivo || '';
                    lugar: document.getElementById('lugar')?.value || null,
                    asignacion: document.getElementById('asignacion')?.value || null,
                    supervision: document.getElementById('supervision')?.value || null,
                    observaciones: document.getElementById('observaciones')?.value || null,
                    coord_nombre: document.getElementById('coord_nombre')?.value || null,
                    coord_rango: document.getElementById('coord_rango')?.value || null,
                    coord_cedula: document.getElementById('coord_cedula')?.value || null,
                    coord_telefono: document.getElementById('coord_telefono')?.value || null,
                    insp_nombre: document.getElementById('insp_nombre')?.value || null,
                    insp_rango: document.getElementById('insp_rango')?.value || null,
                    insp_cedula: document.getElementById('insp_cedula')?.value || null,
                    insp_telefono: document.getElementById('insp_telefono')?.value || null,
                    componentes_moto: getComponentesMotoValues()
                };
                Object.keys(payload).forEach(key => { if (payload[key] === null) delete payload[key]; });

                const { error } = await supabase.from('inspecciones_pvr').update(payload).eq('id', recordIdInput.value);
                if(error) throw error;

                mostrarAlerta('success', '✅ Inspección de Moto actualizada');
                if(alertSuccess) alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(limpiarFormulario, 2000);
            } catch(err) {
                console.error('❌ Error al actualizar:', err);
                mostrarAlerta('error', `Error: ${err.message}`);
            } finally {
                btnSubmit.disabled = false;
            }
        });
    }

    updatePreview();
    mostrarAlerta('info', '🔍 Busque una inspección para habilitar la edición');
});
