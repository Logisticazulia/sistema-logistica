// ==========================================
// FUNCIÓN DE BÚSQUEDA BLINDADA + DIAGNÓSTICO
// ==========================================
async function buscarInspeccion() {
    const q = searchInput?.value.trim();
    if (!q) {
        mostrarAlerta('info', '⚠️ Ingrese Placa, Serial, Cédula o Facsímil');
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
        console.log('🔍 Término buscado:', cleanQ);

        // 🔧 Cláusula OR para Supabase v2
        // ⚠️ Si la columna 'facsimil' NO existe en tu tabla de Supabase, quítala de esta lista.
        const orClause = `n_inspeccion.ilike.%${cleanQ}%,placa.ilike.%${cleanQ}%,s_carroceria.ilike.%${cleanQ}%,n_identificacion.ilike.%${cleanQ}%,s_motor.ilike.%${cleanQ}%,facsimil.ilike.%${cleanQ}%`;
        
        console.log('📝 Cláusula OR generada:', orClause);

        // Ejecutar consulta
        let query = supabase
            .from('inspecciones_pvr')
            .select('*')
            .or(orClause)
            .limit(1);

        // 🏍️ FILTRO DE TIPO: Usa .ilike para captar variaciones (MOTO, MOTOCICLETA, Moto, etc.)
        // Si en tu BD el campo se llama diferente, ajústalo aquí.
        query = query.ilike('tipo', '%MOTO%');

        const { data, error } = await query.maybeSingle();
        console.log('📦 Respuesta cruda de Supabase:', { data, error });

        if (error) {
            console.error('❌ Error de PostgREST:', error);
            throw error;
        }

        if (!data) {
            mostrarAlerta('error', '❌ No se encontró ninguna MOTO. Verifique el dato o revise la columna "tipo" en su BD.');
            toggleFormState(false);
            return;
        }

        // ✅ Carga exitosa
        console.log('✅ Inspección encontrada. ID:', data.id);
        if (recordIdInput) recordIdInput.value = data.id || '';

        const camposBasicos = [
            'n_inspeccion', 'fecha_inspeccion', 'hora', 'motivo_inspeccion',
            'lugar', 'asignacion', 'supervision', 'placa', 'marca', 'modelo',
            'ano', 'color', 's_carroceria', 's_motor', 'n_identificacion',
            'observaciones', 'coord_nombre', 'coord_rango', 'coord_cedula',
            'coord_telefono', 'insp_nombre', 'insp_rango', 'insp_cedula', 'insp_telefono'
        ];

        camposBasicos.forEach(campo => {
            const el = document.getElementById(campo);
            if (el) {
                el.value = data[campo] ?? '';
            }
        });

        // Cargar componentes JSONB
        const comps = data.componentes_moto || {};
        document.querySelectorAll('.inspection-item input[type="radio"]').forEach(radio => {
            const valor = comps[radio.name];
            radio.checked = valor ? radio.value === valor : false;
        });

        toggleFormState(true);
        if (typeof updatePreview === 'function') updatePreview();
        mostrarAlerta('success', '✅ MOTO cargada. Edite y presione "Actualizar".');

    } catch (err) {
        console.error('💥 Error capturado en búsqueda:', err);
        mostrarAlerta('error', `Fallo al buscar: ${err.message || 'Revise consola F12'}`);
    } finally {
        if (btnSearch) {
            btnSearch.disabled = false;
            if (btnSearchText) btnSearchText.style.display = 'inline';
            if (btnSearchLoader) btnSearchLoader.style.display = 'none';
        }
    }
}
