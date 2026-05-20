document.addEventListener('DOMContentLoaded', async () => {
    // ==========================================
    // 1. INICIALIZACIÓN DE SUPABASE
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
                console.error('❌ Error init Supabase:', err);
                return null;
            }
        }
        return null;
    }

    const supabase = await initSupabase();
    if (!supabase) return;

    // ==========================================
    // 2. VARIABLES GLOBALES
    // ==========================================
    let usuarioActual = null;
    const searchInput = document.getElementById('searchInspection');
    const btnSearch = document.getElementById('btnSearch');
    const btnSearchText = btnSearch?.querySelector('.btn-search-text');
    const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
    const motoForm = document.getElementById('motoForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnClearForm = document.getElementById('btnClear');
    const btnClearSearch = document.getElementById('btnClearSearch');
    const recordIdInput = document.getElementById('recordId');
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');
    const alertInfo = document.getElementById('alertInfo');

    // ==========================================
    // 3. FUNCIONES DE UTILIDAD
    // ==========================================
    function mostrarAlerta(tipo, mensaje) {
        [alertSuccess, alertError, alertInfo].forEach(el => { if (el) el.style.display = 'none'; });
        const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
        if (target) {
            const span = target.querySelector('span:last-child');
            if (span) span.textContent = mensaje;
            target.style.display = 'flex';
        }
        if (tipo !== 'info') {
            setTimeout(() => { if (target) target.style.display = 'none'; }, 5000);
        }
    }

    function toggleFormState(activo) {
        if (!motoForm) return;
        motoForm.style.opacity = activo ? '1' : '0.6';
        motoForm.style.pointerEvents = activo ? 'auto' : 'none';
        if (btnSubmit) btnSubmit.disabled = !activo || !usuarioActual;
    }

    // ==========================================
    // 4. VERIFICAR SESIÓN
    // ==========================================
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            usuarioActual = user;
            const el = document.getElementById('userEmail');
            if (el) el.textContent = user.email || 'Usuario';
        }
    } catch (err) {
        console.warn('⚠️ Sesión no verificada:', err);
    }

    // ==========================================
    // 5. FUNCIÓN DE BÚSQUEDA (VERSIÓN DEFINITIVA)
    // ==========================================
    async function buscarInspeccion() {
        const q = searchInput?.value.trim();
        if (!q) {
            mostrarAlerta('info', '⚠️ Ingrese Placa, Serial, Cédula o N° Inspección');
            return;
        }

        // UI Loading
        if (btnSearch) {
            btnSearch.disabled = true;
            if (btnSearchText) btnSearchText.style.display = 'none';
            if (btnSearchLoader) btnSearchLoader.style.display = 'inline';
        }
        mostrarAlerta('info', '🔍 Consultando base de datos...');

        try {
            const cleanQ = q.replace(/\s+/g, '').toUpperCase();
            console.log('🔍 Buscando:', cleanQ);

            // 📝 Cláusula OR con los 5 campos solicitados
            const orClause = `n_inspeccion.ilike.%${cleanQ}%,placa.ilike.%${cleanQ}%,s_carroceria.ilike.%${cleanQ}%,n_identificacion.ilike.%${cleanQ}%,s_motor.ilike.%${cleanQ}%`;

            // 🔍 Búsqueda + JOIN automático para traer 'clase' desde la tabla vehiculos
            const { data, error } = await supabase
                .from('inspecciones_pvr')
                .select('*, vehiculos!vehiculo_id(clase)')
                .or(orClause)
                .limit(1)
                .maybeSingle();

            console.log('📦 Respuesta:', { data, error });
            if (error) throw error;
            if (!data) {
                mostrarAlerta('error', '❌ No se encontró ningún PVR con ese dato.');
                toggleFormState(false);
                return;
            }

            // 🏍️ VALIDACIÓN ESTRICTA POR CLASE
            const claseVehiculo = (data.vehiculos?.clase || '').toUpperCase().trim();
            console.log('🏍️ Clase detectada:', claseVehiculo);

            if (!claseVehiculo.includes('MOTO')) {
                mostrarAlerta('error', `⚠️ Registro encontrado pero es clase '${claseVehiculo || 'NO DEFINIDA'}'. Este módulo SOLO permite editar MOTOS.`);
                toggleFormState(false);
                return;
            }

            // ✅ CARGA DE DATOS AL FORMULARIO
            recordIdInput.value = data.id || '';

            // Mapeo seguro de campos
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val ?? ''; };
            setVal('n_inspeccion', data.n_inspeccion);
            setVal('fecha_inspeccion', data.fecha_inspeccion);
            setVal('hora', data.hora);
            setVal('lugar', data.lugar);
            setVal('asignacion', data.asignacion);
            setVal('supervision', data.supervision);
            setVal('placa', data.placa);
            setVal('marca', data.marca);
            setVal('modelo', data.modelo);
            setVal('ano', data.ano);
            setVal('color', data.color);
            setVal('s_carroceria', data.s_carroceria);
            setVal('s_motor', data.s_motor);
            setVal('n_identificacion', data.n_identificacion);
            setVal('observaciones', data.observaciones);
            setVal('coord_nombre', data.coord_nombre);
            setVal('coord_rango', data.coord_rango);
            setVal('coord_cedula', data.coord_cedula);
            setVal('coord_telefono', data.coord_telefono);
            setVal('insp_nombre', data.insp_nombre);
            setVal('insp_rango', data.insp_rango);
            setVal('insp_cedula', data.insp_cedula);
            setVal('insp_telefono', data.insp_telefono);
            
            // ✅ CORRECCIÓN CRÍTICA: Leer 'motivo' directamente de la BD
            setVal('motivo_inspeccion', data.motivo);

            // Cargar componentes JSONB
            const comps = data.componentes_moto || {};
            document.querySelectorAll('.inspection-item input[type="radio"]').forEach(radio => {
                const valorGuardado = comps[radio.name];
                radio.checked = valorGuardado ? radio.value === valorGuardado : false;
            });

            toggleFormState(true);
            updatePreview();
            mostrarAlerta('success', '✅ MOTO cargada correctamente. Edite y presione "Actualizar".');

        } catch (err) {
            console.error('💥 Error búsqueda:', err);
            mostrarAlerta('error', `Fallo al buscar: ${err.message}`);
        } finally {
            if (btnSearch) {
                btnSearch.disabled = false;
                if (btnSearchText) btnSearchText.style.display = 'inline';
                if (btnSearchLoader) btnSearchLoader.style.display = 'none';
            }
        }
    }

    // ==========================================
    // 6. LIMPIAR FORMULARIO
    // ==========================================
    function limpiarFormulario() {
        if (searchInput) searchInput.value = '';
        if (motoForm) motoForm.reset();
        if (recordIdInput) recordIdInput.value = '';
        toggleFormState(false);
        updatePreview();
        mostrarAlerta('info', '🔍 Busque una inspección para habilitar la edición');
    }

    // ==========================================
    // 7. ACTUALIZAR VISTA PREVIA
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
        if (compGrid) {
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
    // 8. OBTENER VALORES DE COMPONENTES
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
    // 9. EVENT LISTENERS
    // ==========================================
    if (btnSearch) btnSearch.addEventListener('click', buscarInspeccion);
    if (searchInput) searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') buscarInspeccion(); });
    if (btnClearForm) btnClearForm.addEventListener('click', limpiarFormulario);
    if (btnClearSearch) btnClearSearch.addEventListener('click', limpiarFormulario);

    if (motoForm) {
        motoForm.addEventListener('input', updatePreview);
        motoForm.addEventListener('change', updatePreview);
        
        motoForm.addEventListener('submit', async e => {
            e.preventDefault();
            if (!usuarioActual) { mostrarAlerta('error', '🔐 Inicie sesión para guardar'); return; }
            if (!recordIdInput.value) { mostrarAlerta('error', 'Busque una inspección primero'); return; }
            
            btnSubmit.disabled = true;
            try {
                const payload = {
                    fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value || null,
                    hora: document.getElementById('hora')?.value || null,
                    motivo: document.getElementById('motivo_inspeccion')?.value || null,
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
                
                // Eliminar campos nulos para no sobreescribir con NULL
                Object.keys(payload).forEach(key => { if (payload[key] === null) delete payload[key]; });

                const { error } = await supabase
                    .from('inspecciones_pvr')
                    .update(payload)
                    .eq('id', recordIdInput.value);
                    
                if (error) throw error;

                mostrarAlerta('success', '✅ Inspección de Moto actualizada');
                if (alertSuccess) alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(limpiarFormulario, 2000);
            } catch (err) {
                console.error('❌ Error al actualizar:', err);
                mostrarAlerta('error', `Error: ${err.message}`);
            } finally {
                btnSubmit.disabled = false;
            }
        });
    }

    // Inicialización
    updatePreview();
    mostrarAlerta('info', '🔍 Busque una inspección para habilitar la edición');
});
