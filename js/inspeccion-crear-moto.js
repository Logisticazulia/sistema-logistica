document.addEventListener('DOMContentLoaded', async () => {
    async function initSupabase() {
        let attempts = 0;
        while (!window.supabase && attempts < 50) {
            await new Promise(res => setTimeout(res, 100));
            attempts++;
        }
        if (!window.supabase) {
            mostrarAlerta('error', '❌ No se cargó Supabase');
            return null;
        }
        if (window.supabase.auth) return window.supabase;
        const createFn = window.supabase.createClient || window.createClient;
        if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
            try {
                window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY);
                return window.supabase;
            } catch (err) {
                console.error('❌ Error init', err);
                return null;
            }
        }
        return null;
    }

    const supabase = await initSupabase();
    if (!supabase) return;

    let usuarioActual = null;
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            usuarioActual = user;
            const el = document.getElementById('userEmail');
            if(el) el.textContent = user.email || 'Usuario';
        }
    } catch (err) { console.warn('Sesión no verificada'); }

    const searchInput = document.getElementById('searchMoto');
    const btnSearch = document.getElementById('btnSearch');
    const btnSearchText = btnSearch ? btnSearch.querySelector('.btn-search-text') : null;
    const btnSearchLoader = btnSearch ? btnSearch.querySelector('.btn-search-loader') : null;
    
    const inspectionForm = document.getElementById('motoForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnClear = document.getElementById('btnClearSearch') || document.getElementById('btnClear');
    
    const motoIdInput = document.getElementById('motoId');
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');
    const alertInfo = document.getElementById('alertInfo');

    function mostrarAlerta(tipo, mensaje) {
        [alertSuccess, alertError, alertInfo].forEach(el => { if(el) el.style.display = 'none'; });
        const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
        if(target) {
            target.querySelector('span:last-child').textContent = mensaje;
            target.style.display = 'flex';
        }
    }

    function toggleFormState(activo) {
        inspectionForm.style.opacity = activo ? '1' : '0.6';
        inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
        btnSubmit.disabled = !activo || !usuarioActual;
    }

    // 🔵 FUNCIÓN ACTUALIZADA: Genera el siguiente número secuencial desde la BD
    async function generarNInspeccion() {
        const now = new Date();
        const y = now.getFullYear();
        
        try {
            // 1. Buscar el último registro en la tabla 'inspecciones_pvr' ordenado por fecha descendente
            const { data, error } = await supabase
                .from('inspecciones_pvr')
                .select('n_inspeccion')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (error) throw error;

            let nextSeq = 1; // Por defecto empieza en 1 si no hay registros

            if (data && data.n_inspeccion) {
                // 2. Extraer el número secuencial del último registro (ej: "PVR-2026-0000001" -> 1)
                // Buscamos el patrón de dígitos al final del string
                const match = data.n_inspeccion.match(/(\d+)$/);
                if (match) {
                    const lastNum = parseInt(match[1], 10);
                    nextSeq = lastNum + 1;
                }
            }

            // 3. Formatear el número con ceros a la izquierda (7 dígitos)
            const seqStr = String(nextSeq).padStart(7, '0');
            return `PVR-${y}-${seqStr}`;

        } catch (err) {
            console.error("Error generando número secuencial:", err);
            // En caso de error de conexión, retornamos uno basado en fecha y random para no bloquear
            const m = String(now.getMonth()+1).padStart(2,'0');
            const d = String(now.getDate()).padStart(2,'0');
            const r = String(Math.floor(Math.random()*1000)).padStart(3,'0');
            return `PVR-${y}${m}${d}-${r}`;
        }
    }

    async function setDefaults() {
        const now = new Date();
        const f = document.getElementById('fecha_inspeccion');
        if(f) f.value = now.toISOString().split('T')[0];
        const h = document.getElementById('hora');
        if(h) h.value = now.toTimeString().slice(0,5);
        
        const n = document.getElementById('n_inspeccion');
        if(n) {
            n.value = 'Generando...';
            n.value = await generarNInspeccion();
        }
        updatePreview();
    }

    async function buscarMoto() {
        const q = searchInput.value.trim();
        if(!q) { mostrarAlerta('info', 'Ingrese Placa o Serial para buscar'); return; }
        
        if(btnSearch) {
            btnSearch.disabled=true;
            if(btnSearchText) btnSearchText.style.display='none';
            if(btnSearchLoader) btnSearchLoader.style.display='inline';
        }
        
        mostrarAlerta('info', '🔍 Buscando Moto...');
        
        try {
            const cleanQ = q.replace(/\s+/g, '').toUpperCase();
            
            // 🔍 Búsqueda optimizada: busca por placa, facsimil, serial carrocería o motor
            // Y filtra SOLO para MOTO o ESPECIAL
            const { data, error } = await supabase
                .from('vehiculos')
                .select('*')
                .or(`placa.ilike.%${cleanQ}%,facsimil.ilike.%${cleanQ}%,s_carroceria.ilike.%${cleanQ}%,s_motor.ilike.%${cleanQ}%`)
                .in('clase', ['MOTO', 'ESPECIAL']) // ✅ Filtro estricto para MOTO y ESPECIALES
                .limit(1)
                .maybeSingle();
            
            if(error) throw error;
            
            if(!data) {
                mostrarAlerta('error', '❌ Moto o Especial no encontrada');
                toggleFormState(false);
                return;
            }
            
            // Validación extra por seguridad
            const clase = (data.clase || '').toUpperCase();
            if(clase !== 'MOTO' && clase !== 'ESPECIAL') {
                mostrarAlerta('error', `⚠️ El vehículo encontrado es de clase '${data.clase}', no MOTO/ESPECIAL.`);
                toggleFormState(false);
                return;
            }
            
            // Llenado de formulario
            document.getElementById('placa').value = data.placa || '';
            document.getElementById('marca').value = (data.marca || '').toUpperCase();
            document.getElementById('modelo').value = (data.modelo || '').toUpperCase();
            document.getElementById('ano').value = data.ano || '';
            document.getElementById('color').value = data.color || '';
            document.getElementById('s_carroceria').value = data.s_carroceria || '';
            document.getElementById('s_motor').value = data.s_motor || '';
            document.getElementById('n_identificacion').value = data.n_identificacion || '';
            motoIdInput.value = data.id;
            
            setDefaults();
            toggleFormState(true);
            mostrarAlerta('success', `✅ ${clase} encontrada. Complete la inspección y firmas.`);
            
        } catch(err) {
            console.error(err);
            mostrarAlerta('error', `Error: ${err.message}`);
        } finally {
            if(btnSearch) {
                btnSearch.disabled = false;
                if(btnSearchText) btnSearchText.style.display = 'inline';
                if(btnSearchLoader) btnSearchLoader.style.display = 'none';
            }
        }
    }

    function limpiarFormulario() {
        searchInput.value = '';
        inspectionForm.reset();
        motoIdInput.value = '';
        toggleFormState(false);
        updatePreview();
        mostrarAlerta('info', 'Ingrese Placa o Serial para buscar una Moto o Especial');
        setDefaults(); // Regenerar número al limpiar para obtener el siguiente disponible
    }

    function updatePreview() {
        const v = id => document.getElementById(id).value || '-';
        document.getElementById('pv_n_inspeccion').textContent = v('n_inspeccion');
        document.getElementById('pv_fecha').textContent = v('fecha_inspeccion');
        document.getElementById('pv_hora').textContent = v('hora');
        document.getElementById('pv_motivo').textContent = v('motivo_inspeccion');
        document.getElementById('pv_lugar').textContent = `${v('lugar')} - ${v('asignacion')}`;
        document.getElementById('pv_placa').textContent = v('placa');
        document.getElementById('pv_marca_modelo').textContent = `${v('marca')} ${v('modelo')}`;
        document.getElementById('pv_ano_tipo').textContent = `${v('ano')} - MOTO/ESP`;
        document.getElementById('pv_color').textContent = v('color');
        document.getElementById('pv_s_carroceria').textContent = v('s_carroceria');
        document.getElementById('pv_s_motor').textContent = v('s_motor');
        document.getElementById('pv_n_id').textContent = v('n_identificacion');
        document.getElementById('pv_observaciones').textContent = v('observaciones') || 'Sin observaciones.';
        document.getElementById('pv_coord_nombre').textContent = v('coord_nombre');
        document.getElementById('pv_coord_rango').textContent = document.getElementById('coord_rango').options[document.getElementById('coord_rango').selectedIndex].text || '-';
        document.getElementById('pv_coord_cedula').textContent = v('coord_cedula');
        document.getElementById('pv_insp_nombre').textContent = v('insp_nombre');
        document.getElementById('pv_insp_rango').textContent = document.getElementById('insp_rango').options[document.getElementById('insp_rango').selectedIndex].text || '-';
        document.getElementById('pv_insp_cedula').textContent = v('insp_cedula');
        
        // Componentes
        const compGrid = document.getElementById('pv_comps_grid');
        if(compGrid) {
            compGrid.innerHTML = '';
            document.querySelectorAll('.inspection-item').forEach(item => {
                const label = item.querySelector('.item-label').textContent || '';
                const radio = item.querySelector('input:checked');
                const val = radio ? radio.value : 'NT';
                const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : 'status-NT';
                const div = document.createElement('div');
                div.className = 'pv-comp';
                div.innerHTML = `<div class="pv-comp-label">${label}</div><div class="pv-comp-status ${cls}">${val}</div>`;
                compGrid.appendChild(div);
            });
        }
    }

    function getComponentesMotoValues() {
        const componentes = {};
        document.querySelectorAll('.inspection-item input[type="radio"]').forEach(r => {
            if (!componentes[r.name]) componentes[r.name] = 'NT';
            if (r.checked) componentes[r.name] = r.value;
        });
        return componentes;
    }

    // Event Listeners
    if(btnSearch) btnSearch.addEventListener('click', buscarMoto);
    if(searchInput) searchInput.addEventListener('keypress', e => { if(e.key==='Enter') buscarMoto(); });
    if(btnClear) btnClear.addEventListener('click', limpiarFormulario);
    inspectionForm.addEventListener('input', updatePreview);
    inspectionForm.addEventListener('change', updatePreview);
    
    inspectionForm.addEventListener('submit', async e => {
        e.preventDefault();
        if(!usuarioActual) { mostrarAlerta('error','🔐 Inicie sesión'); return; }
        if(!motoIdInput.value) { mostrarAlerta('error','Busque una moto primero'); return; }
        
        btnSubmit.disabled = true;
        if(btnSubmit.querySelector('.btn-text')) btnSubmit.querySelector('.btn-text').style.display = 'none';
        if(btnSubmit.querySelector('.btn-loader')) btnSubmit.querySelector('.btn-loader').style.display = 'inline';
        
        try {
            const toIntOrNull = val => {
                const num = parseInt(val, 10);
                return isNaN(num) || val === '' ? null : num;
            };
            
            const payload = {
                vehiculo_id: toIntOrNull(motoIdInput.value),
                n_inspeccion: document.getElementById('n_inspeccion').value || null,
                fecha_inspeccion: document.getElementById('fecha_inspeccion').value || null,
                hora: document.getElementById('hora').value || null,
                motivo: document.getElementById('motivo_inspeccion').value || null,
                lugar: document.getElementById('lugar').value || null,
                asignacion: document.getElementById('asignacion').value || null,
                supervision: document.getElementById('supervision').value || null,
                placa: document.getElementById('placa').value || null,
                marca: document.getElementById('marca').value || null,
                modelo: document.getElementById('modelo').value || null,
                ano: toIntOrNull(document.getElementById('ano').value),
                color: document.getElementById('color').value || null,
                s_carroceria: document.getElementById('s_carroceria').value || null,
                s_motor: document.getElementById('s_motor').value || null,
                n_identificacion: document.getElementById('n_identificacion').value || null,
                observaciones: document.getElementById('observaciones').value || null,
                coord_nombre: document.getElementById('coord_nombre').value || null,
                coord_rango: document.getElementById('coord_rango').value || null,
                coord_cedula: document.getElementById('coord_cedula').value || null,
                coord_telefono: document.getElementById('coord_telefono').value || null,
                insp_nombre: document.getElementById('insp_nombre').value || null,
                insp_rango: document.getElementById('insp_rango').value || null,
                insp_cedula: document.getElementById('insp_cedula').value || null,
                insp_telefono: document.getElementById('insp_telefono').value || null,
                inspector: usuarioActual.email || 'sistema',
                created_at: new Date().toISOString(),
                componentes_moto: getComponentesMotoValues()
            };
            
            Object.keys(payload).forEach(key => {
                if (payload[key] === null || payload[key] === '') delete payload[key];
            });
            
            const { error } = await supabase.from('inspecciones_pvr').insert([payload]);
            if(error) throw error;
            
            mostrarAlerta('success', '✅ Inspección registrada exitosamente');
            alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { limpiarFormulario(); }, 2000);
            
        } catch(err) {
            console.error('Error detalle', err);
            mostrarAlerta('error', `Error: ${err.message}`);
        } finally {
            btnSubmit.disabled = false;
            if(btnSubmit.querySelector('.btn-text')) btnSubmit.querySelector('.btn-text').style.display = 'inline';
            if(btnSubmit.querySelector('.btn-loader')) btnSubmit.querySelector('.btn-loader').style.display = 'none';
        }
    });

    setDefaults();
    updatePreview();
    mostrarAlerta('info', '🔍 Busque una moto para habilitar el formulario');
});
