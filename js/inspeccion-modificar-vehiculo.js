document.addEventListener('DOMContentLoaded', async () => {

// ✅ Inicialización segura de Supabase
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

let usuarioActual = null;
try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) { 
        usuarioActual = user; 
        const el = document.getElementById('userEmail'); 
        if (el) el.textContent = user.email || 'Usuario'; 
    }
} catch (err) { 
    console.warn('⚠️ Sesión no verificada'); 
}

// ✅ Referencias al DOM con validación de existencia
const searchInput = document.getElementById('searchInspection');
const btnSearch = document.getElementById('btnSearch');
const btnSearchText = btnSearch?.querySelector('.btn-search-text');
const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
const inspectionForm = document.getElementById('inspectionForm');
const btnSubmit = document.getElementById('btnSubmit');
const btnClear = document.getElementById('btnClear');
const recordIdInput = document.getElementById('recordId');
const alertSuccess = document.getElementById('alertSuccess');
const alertError = document.getElementById('alertError');
const alertInfo = document.getElementById('alertInfo');

// ✅ Función de alertas segura
function mostrarAlerta(tipo, mensaje) {
    [alertSuccess, alertError, alertInfo].forEach(el => { 
        if (el) el.style.display = 'none'; 
    });
    const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
    if (target) { 
        const span = target.querySelector('span:last-child');
        if (span) span.textContent = mensaje; 
        target.style.display = 'flex'; 
    }
}

function toggleFormState(activo) {
    if (inspectionForm) {
        inspectionForm.style.opacity = activo ? '1' : '0.6';
        inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
    }
    if (btnSubmit) {
        btnSubmit.disabled = !activo || !usuarioActual;
        if (!usuarioActual) btnSubmit.title = '🔐 Requiere iniciar sesión';
    }
}

function setInput(id, val) { 
    const el = document.getElementById(id); 
    if (el) el.value = val || ''; 
}

function setSelect(id, val) { 
    const el = document.getElementById(id); 
    if (el) el.value = val || ''; 
}

function setRadio(name, val) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
        r.checked = (r.value === val);
    });
}

// ✅ Función updatePreview (sin cambios, solo asegurando null checks)
function updatePreview() {
    const v = id => document.getElementById(id)?.value || '-';
    const vr = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '-';
    const vs = id => { 
        const el = document.getElementById(id); 
        return el?.options[el.selectedIndex]?.text || '-'; 
    }
    
    // Actualizar elementos del preview (ejemplo parcial)
    const ids = [
        'pv_n_inspeccion', 'pv_fecha', 'pv_hora', 'pv_motivo', 'pv_lugar',
        'pv_placa', 'pv_marca_modelo', 'pv_ano_tipo', 'pv_color', 'pv_s_carroceria',
        'pv_n_id', 'pv_kms', 'pv_rin', 'pv_observaciones', 'pv_coord_nombre',
        'pv_coord_cedula', 'pv_insp_nombre', 'pv_insp_cedula'
    ];
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = v(id.replace('pv_', '')) || '-';
    });
    
    // Preview de accesorios y cauchos (simplificado)
    const accesorios = ['bateria', 'estacion_base', 'coctelera', 'triangulo', 'placas', 'herramientas', 'gato', 'sestacion_luces'];
    accesorios.forEach(acc => {
        const el = document.getElementById(`pv_${acc}`);
        if (el) el.textContent = vs(acc) || '-';
    });
    
    // Preview de componentes (grid)
    const compGrid = document.getElementById('pv_comps_grid');
    if (compGrid) {
        compGrid.innerHTML = '';
        document.querySelectorAll('.inspection-item').forEach(item => {
            const label = item.querySelector('.item-label')?.textContent || '';
            const radio = item.querySelector('input:checked');
            const val = radio?.value || '-';
            const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : val === 'NT' ? 'status-NT' : '';
            const div = document.createElement('div');
            div.className = 'pv-comp';
            div.innerHTML = `<div class="pv-comp-label">${label}</div><div class="pv-comp-status ${cls}">${val}</div>`;
            compGrid.appendChild(div);
        });
    }
}

// ✅ FUNCIÓN DE BÚSQUEDA CORREGIDA CON FACSIMIL
async function buscarInspeccion() {
    // ✅ Validación segura de searchInput
    if (!searchInput) {
        mostrarAlerta('error', '❌ Error: Campo de búsqueda no encontrado en el HTML');
        return;
    }
    
    const rawQuery = searchInput.value.trim();
    if (!rawQuery) { 
        mostrarAlerta('info', 'Ingrese N° Inspección, Placa o Facsímil para buscar'); 
        return; 
    }
    
    if (btnSearch) { 
        btnSearch.disabled = true; 
        if (btnSearchText) btnSearchText.style.display = 'none'; 
        if (btnSearchLoader) btnSearchLoader.style.display = 'inline'; 
    }
    
    mostrarAlerta('info', '🔍 Cargando inspección...');
    
    try {
        const q = rawQuery.replace(/\s+/g, '').toUpperCase();
        
        // ✅ BÚSQUEDA POR: n_inspeccion, placa, Y AHORA facsimil
        const { data, error } = await supabase
            .from('inspecciones_pvr')
            .select('*')
            .or(`n_inspeccion.ilike.%${q}%,placa.ilike.%${q}%,facsimil.ilike.%${q}%`)
            .limit(1)
            .maybeSingle();
            
        if (error) throw error;
        
        if (!data) { 
            mostrarAlerta('error', '❌ Inspección no encontrada con: ' + rawQuery); 
            toggleFormState(false); 
            return; 
        }
        
        // ✅ Llenar formulario con datos encontrados
        recordIdInput.value = data.id;
        
        // Campos principales
        setInput('n_inspeccion', data.n_inspeccion);
        setInput('fecha_inspeccion', data.fecha_inspeccion);
        setInput('hora', data.hora);
        setInput('motivo_inspeccion', data.motivo);
        setInput('lugar', data.lugar);
        setInput('asignacion', data.asignacion);
        setInput('supervision', data.supervision);
        setInput('placa', data.placa);
        setInput('facsimil', data.facsimil); // ✅ NUEVO CAMPO
        setInput('marca', data.marca);
        setInput('modelo', data.modelo);
        setInput('ano', data.ano);
        setInput('tipo', data.tipo);
        setInput('color', data.color);
        setInput('n_identificacion', data.n_identificacion);
        setInput('s_carroceria', data.s_carroceria);
        setInput('kms', data.kms);
        setInput('rin_numero', data.rin_numero);
        setInput('observaciones', data.observaciones);
        
        // Coordinador e Inspector
        setInput('coord_nombre', data.coord_nombre);
        setSelect('coord_rango', data.coord_rango);
        setInput('coord_cedula', data.coord_cedula);
        setInput('coord_telefono', data.coord_telefono);
        setInput('insp_nombre', data.insp_nombre);
        setSelect('insp_rango', data.insp_rango);
        setInput('insp_cedula', data.insp_cedula);
        setInput('insp_telefono', data.insp_telefono);
        
        // Accesorios (selects)
        ['bateria', 'estacion_base', 'coctelera', 'triangulo', 'placas', 'herramientas', 'gato', 'sestacion_luces']
            .forEach(field => setSelect(field, data[field]));
        
        // Cauchos (radios)
        ['caucho_del_izq', 'caucho_del_der', 'caucho_tra_izq', 'caucho_tra_der', 'caucho_repuesto', 'tapa_cauchos']
            .forEach(field => setRadio(field, data[field]));
        
        // Componentes (~76 campos)
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
        compNames.forEach(name => setRadio(name, data[name]));
        
        toggleFormState(true);
        updatePreview();
        mostrarAlerta('success', '✅ Inspección cargada. Puede modificar y actualizar.');
        
    } catch (err) {
        console.error('❌ Error búsqueda:', err);
        mostrarAlerta('error', `Error: ${err.message}`);
    } finally {
        if (btnSearch) { 
            btnSearch.disabled = false; 
            if (btnSearchText) btnSearchText.style.display = 'inline'; 
            if (btnSearchLoader) btnSearchLoader.style.display = 'none'; 
        }
    }
}

function limpiarFormulario() {
    if (searchInput) searchInput.value = ''; 
    if (recordIdInput) recordIdInput.value = ''; 
    toggleFormState(false);
    if (inspectionForm) inspectionForm.reset(); 
    updatePreview();
    mostrarAlerta('info', 'Ingrese N° Inspección, Placa o Facsímil para buscar');
}

function getComponentesValues() {
    const componentes = {};
    document.querySelectorAll('.inspection-item input[type="radio"]').forEach(r => {
        if (!componentes[r.name]) componentes[r.name] = 'NT';
        if (r.checked) componentes[r.name] = r.value;
    });
    return componentes;
}

// 🎧 Event Listeners con validación
if (btnSearch) {
    btnSearch.addEventListener('click', buscarInspeccion);
}
if (searchInput) {
    searchInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter') buscarInspeccion(); 
    });
}
if (btnClear) {
    btnClear.addEventListener('click', limpiarFormulario);
}
if (inspectionForm) {
    inspectionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!usuarioActual) { 
            mostrarAlerta('error', '🔐 Inicie sesión para guardar'); 
            return; 
        }
        if (!recordIdInput?.value) { 
            mostrarAlerta('error', 'Debe cargar una inspección primero'); 
            return; 
        }
        
        const rinVal = document.getElementById('rin_numero')?.value;
        if (rinVal && !/^\d{2}$/.test(rinVal)) { 
            mostrarAlerta('error', 'El Nº de Rin debe contener exactamente 2 dígitos.'); 
            return; 
        }
        
        if (btnSubmit) {
            btnSubmit.disabled = true; 
            const btnText = btnSubmit.querySelector('.btn-text');
            const btnLoader = btnSubmit.querySelector('.btn-loader');
            if (btnText) btnText.style.display = 'none'; 
            if (btnLoader) btnLoader.style.display = 'inline'; 
        }
        
        try {
            const payload = {
                fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value,
                hora: document.getElementById('hora')?.value,
                motivo: document.getElementById('motivo_inspeccion')?.value,
                lugar: document.getElementById('lugar')?.value, 
                asignacion: document.getElementById('asignacion')?.value,
                supervision: document.getElementById('supervision')?.value, 
                kms: parseFloat(document.getElementById('kms')?.value) || 0,
                inspector: usuarioActual.email || 'sistema',
                facsimil: document.getElementById('facsimil')?.value || '', // ✅ NUEVO CAMPO
                bateria: document.getElementById('bateria')?.value || 'NO', 
                estacion_base: document.getElementById('estacion_base')?.value || 'NO',
                coctelera: document.getElementById('coctelera')?.value || 'NO', 
                triangulo: document.getElementById('triangulo')?.value || 'NO',
                placas: document.getElementById('placas')?.value || 'NO', 
                herramientas: document.getElementById('herramientas')?.value || 'NO',
                gato: document.getElementById('gato')?.value || 'NO', 
                sestacion_luces: document.getElementById('sestacion_luces')?.value || 'NO',
                caucho_del_izq: document.querySelector('input[name="caucho_del_izq"]:checked')?.value || 'M',
                caucho_del_der: document.querySelector('input[name="caucho_del_der"]:checked')?.value || 'M',
                caucho_tra_izq: document.querySelector('input[name="caucho_tra_izq"]:checked')?.value || 'M',
                caucho_tra_der: document.querySelector('input[name="caucho_tra_der"]:checked')?.value || 'M',
                caucho_repuesto: document.querySelector('input[name="caucho_repuesto"]:checked')?.value || 'M',
                tapa_cauchos: document.querySelector('input[name="tapa_cauchos"]:checked')?.value || 'NO',
                rin_numero: rinVal || '', 
                observaciones: document.getElementById('observaciones')?.value || '',
                coord_nombre: document.getElementById('coord_nombre')?.value, 
                coord_rango: document.getElementById('coord_rango')?.value,
                coord_cedula: document.getElementById('coord_cedula')?.value, 
                coord_telefono: document.getElementById('coord_telefono')?.value,
                insp_nombre: document.getElementById('insp_nombre')?.value, 
                insp_rango: document.getElementById('insp_rango')?.value,
                insp_cedula: document.getElementById('insp_cedula')?.value, 
                insp_telefono: document.getElementById('insp_telefono')?.value,
                ...getComponentesValues()
            };
            
            const { error } = await supabase
                .from('inspecciones_pvr')
                .update(payload)
                .eq('id', recordIdInput.value);
                
            if (error) throw error;
            
            mostrarAlerta('success', '✅ Inspección actualizada correctamente');
            if (alertSuccess) alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => { limpiarFormulario(); }, 3000);
            
        } catch (err) {
            console.error('Error al actualizar:', err);
            mostrarAlerta('error', `No se pudo actualizar: ${err.message}`);
        } finally {
            if (btnSubmit) {
                btnSubmit.disabled = false; 
                const btnText = btnSubmit.querySelector('.btn-text');
                const btnLoader = btnSubmit.querySelector('.btn-loader');
                if (btnText) btnText.style.display = 'inline'; 
                if (btnLoader) btnLoader.style.display = 'none'; 
            }
        }
    });
    
    inspectionForm.addEventListener('input', updatePreview);
    inspectionForm.addEventListener('change', updatePreview);
}

updatePreview();
mostrarAlerta('info', '🔍 Busque una inspección para habilitar la edición');

});
