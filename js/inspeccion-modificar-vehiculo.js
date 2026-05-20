/**
 * MODIFICAR INSPECCIÓN PVR
 * Busca, valida clase de vehículo y permite edición segura
 */
(async function() {
    'use strict';

    // ================= CONFIGURACIÓN =================
    const CLASES_PERMITIDAS = ['AUTOMOVIL', 'CAMIONETA', 'AUTOBUS', 'CAMION'];
    const normalize = (str) => (str || '').trim().toUpperCase();
    
    let supabase = null;

    // Esperar a que el SDK cargue
    let attempts = 0;
    while (!window.supabase && attempts < 50) {
        await new Promise(res => setTimeout(res, 100));
        attempts++;
    }

    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
        console.error('❌ Error: Configuración o SDK de Supabase no disponible.');
        return;
    }

    try {
        supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    } catch (err) {
        console.error('❌ Error al inicializar Supabase:', err);
        return;
    }

    // ================= REFERENCIAS DOM =================
    const searchInput = document.getElementById('searchInspection');
    const btnSearch = document.getElementById('btnSearch');
    const btnSearchText = btnSearch?.querySelector('.btn-search-text');
    const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
    const form = document.getElementById('inspectionForm');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnClear = document.getElementById('btnClear');
    const recordIdInput = document.getElementById('recordId');
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');
    const alertInfo = document.getElementById('alertInfo');

    // ================= UTILIDADES =================
    function mostrarAlerta(tipo, mensaje) {
        [alertSuccess, alertError, alertInfo].forEach(el => { if (el) el.style.display = 'none'; });
        const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
        if (target) {
            target.querySelector('span:last-child').textContent = mensaje;
            target.style.display = 'flex';
        }
    }

    function setInput(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    }

    function setSelect(id, val) {
        const el = document.getElementById(id);
        if (el) el.value = val ?? '';
    }

    function setRadio(name, val) {
        document.querySelectorAll(`input[name="${name}"]`).forEach(r => r.checked = (r.value === val));
    }

    // ================= BUSCAR INSPECCIÓN =================
    async function buscarInspeccion() {
        const rawQuery = searchInput?.value.trim();
        if (!rawQuery) {
            mostrarAlerta('info', 'Ingrese N° Inspección o Placa para buscar');
            return;
        }

        btnSearch.disabled = true;
        btnSearchText.style.display = 'none';
        btnSearchLoader.style.display = 'inline';
        mostrarAlerta('info', '🔍 Buscando en base de datos...');

        try {
            const q = normalize(rawQuery);

            // 1️⃣ Buscar PVR
            const { data: pvr, error: errPvr } = await supabase
                .from('inspecciones_pvr')
                .select('*')
                .or(`n_inspeccion.ilike.${q},placa.ilike.${q}`)
                .limit(1)
                .maybeSingle();

            if (errPvr || !pvr) {
                mostrarAlerta('error', '❌ No se encontró ninguna inspección con esos datos.');
                form.classList.add('form-disabled');
                return;
            }

            // 2️⃣ Validar Clase del Vehículo Vinculado
            const { data: vehiculo, error: errVeh } = await supabase
                .from('vehiculos')
                .select('clase')
                .eq('id', pvr.vehiculo_id)
                .single();

            const clase = normalize(vehiculo?.clase);
            if (!CLASES_PERMITIDAS.includes(clase)) {
                mostrarAlerta('error', `⛔ Vehículo de clase "${clase}" no permitido. Solo se pueden editar PVR de: ${CLASES_PERMITIDAS.join(', ')}`);
                form.classList.add('form-disabled');
                return;
            }

            // ✅ Todo válido: Cargar formulario
            recordIdInput.value = pvr.id;
            llenarFormulario(pvr);
            form.classList.remove('form-disabled');
            mostrarAlerta('success', `✅ Inspección cargada correctamente (${clase}). Puede editar y guardar.`);

        } catch (err) {
            console.error('❌ Error en buscarInspeccion:', err);
            mostrarAlerta('error', `Error de conexión: ${err.message}`);
        } finally {
            btnSearch.disabled = false;
            btnSearchText.style.display = 'inline';
            btnSearchLoader.style.display = 'none';
        }
    }

    function limpiarFormulario() {
        searchInput.value = '';
        recordIdInput.value = '';
        form.reset();
        form.classList.add('form-disabled');
        mostrarAlerta('info', 'Ingrese N° Inspección o Placa para buscar');
    }

    // ================= LLENAR FORMULARIO =================
    function llenarFormulario(data) {
        // Campos de texto
        ['n_inspeccion','fecha_inspeccion','hora','motivo_inspeccion','lugar','asignacion','supervision',
         'placa','marca','modelo','ano','tipo','color','n_identificacion','s_carroceria','kms','rin_numero',
         'observaciones','coord_nombre','coord_cedula','coord_telefono','insp_nombre','insp_cedula','insp_telefono'
        ].forEach(field => setInput(field, data[field]));

        // Selects
        ['coord_rango','insp_rango','bateria','estacion_base','coctelera','triangulo','placas',
         'herramientas','gato','sestacion_luces'
        ].forEach(field => setSelect(field, data[field]));

        // Cauchos (Radio buttons)
        ['caucho_del_izq','caucho_del_der','caucho_tra_izq','caucho_tra_der','caucho_repuesto','tapa_cauchos']
            .forEach(field => setRadio(field, data[field]));

        // Componentes (~76 items)
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

        // Actualizar vista previa si existe
        if (typeof window.updatePreview === 'function') window.updatePreview();
    }

    // ================= GUARDAR INSPECCIÓN =================
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!recordIdInput.value) {
            mostrarAlerta('error', '⚠️ Debe buscar y cargar una inspección primero.');
            return;
        }

        const rinVal = document.getElementById('rin_numero')?.value;
        if (rinVal && !/^\d{2}$/.test(rinVal)) {
            mostrarAlerta('error', '⚠️ El Nº de Rin debe contener exactamente 2 dígitos.');
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.querySelector('.btn-text').style.display = 'none';
        btnSubmit.querySelector('.btn-loader').style.display = 'inline';

        try {
            // Recopilar componentes
            const componentes = {};
            document.querySelectorAll('.inspection-item input[type="radio"]').forEach(r => {
                if (!componentes[r.name]) componentes[r.name] = 'NT'; // Valor por defecto
                if (r.checked) componentes[r.name] = r.value;
            });

            const payload = {
                fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value,
                hora: document.getElementById('hora')?.value,
                motivo_inspeccion: document.getElementById('motivo_inspeccion')?.value,
                lugar: document.getElementById('lugar')?.value,
                asignacion: document.getElementById('asignacion')?.value,
                supervision: document.getElementById('supervision')?.value,
                kms: parseFloat(document.getElementById('kms')?.value) || 0,
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
                ...componentes // Inserta los ~76 componentes aquí
            };

            console.log('💾 Guardando inspección ID:', recordIdInput.value);
            const { error } = await supabase
                .from('inspecciones_pvr')
                .update(payload)
                .eq('id', recordIdInput.value);

            if (error) throw error;

            mostrarAlerta('success', '✅ Inspección actualizada exitosamente en la base de datos.');
            if (alertSuccess) alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            setTimeout(() => limpiarFormulario(), 2500);

        } catch (err) {
            console.error('❌ Error al guardar:', err);
            mostrarAlerta('error', `No se pudo actualizar: ${err.message}`);
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.querySelector('.btn-text').style.display = 'inline';
            btnSubmit.querySelector('.btn-loader').style.display = 'none';
        }
    });

    // ================= EVENT LISTENERS =================
    btnSearch?.addEventListener('click', buscarInspeccion);
    searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarInspeccion(); });
    btnClear?.addEventListener('click', limpiarFormulario);

    // Estado inicial
    form.classList.add('form-disabled');
    mostrarAlerta('info', '🔍 Busque una inspección para habilitar la edición');
    console.log('✅ Módulo de Modificación PVR inicializado correctamente');

})();
