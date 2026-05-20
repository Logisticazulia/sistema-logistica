// ==========================================
// FUNCIÓN DE BÚSQUEDA ACTUALIZADA
// ==========================================
async function buscarInspeccion() {
    const q = searchInput?.value.trim();
    if(!q) {
        mostrarAlerta('info', 'Ingrese un término de búsqueda');
        return;
    }
    if(btnSearch) {
        btnSearch.disabled = true;
        if(btnSearchText) btnSearchText.style.display = 'none';
        if(btnSearchLoader) btnSearchLoader.style.display = 'inline';
    }
    mostrarAlerta('info', '🔍 Buscando...');
    try {
        const cleanQ = q.replace(/\s+/g, '').toUpperCase();
        
        // 🔍 Cláusula OR con todos los campos solicitados
        const orClause = `n_inspeccion.ilike.%${cleanQ}%,placa.ilike.%${cleanQ}%,s_carroceria.ilike.%${cleanQ}%,n_identificacion.ilike.%${cleanQ}%,s_motor.ilike.%${cleanQ}%,facsimil.ilike.%${cleanQ}%`;

        const { data, error } = await supabase
            .from('inspecciones_pvr')
            .select('*')
            .ilike('tipo', '%MOTO%') // 🏍️ Filtra SOLO motos (ajusta 'MOTO' si en tu BD es 'MOTOCICLETA')
            .or(orClause)
            .limit(1)
            .maybeSingle();

        if(error) throw error;
        if(!data) {
            mostrarAlerta('error', '❌ Inspección de MOTO no encontrada');
            toggleFormState(false);
            return;
        }
        // Cargar datos básicos
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
            if(el) el.value = data[campo] || '';
        });
        // Cargar componentes desde JSONB
        const comps = data.componentes_moto || {};
        document.querySelectorAll('.inspection-item input[type="radio"]').forEach(radio => {
            const nombreComponente = radio.name;
            const valorComponente = comps[nombreComponente];
            if (valorComponente) {
                radio.checked = (radio.value === valorComponente);
            } else {
                radio.checked = false;
            }
        });
        toggleFormState(true);
        updatePreview();
        mostrarAlerta('success', '✅ Inspección cargada. Edite y actualice.');
    } catch(err) {
        console.error('❌ Error en búsqueda:', err);
        mostrarAlerta('error', `Error: ${err.message}`);
    } finally {
        if(btnSearch) {
            btnSearch.disabled = false;
            if(btnSearchText) btnSearchText.style.display = 'inline';
            if(btnSearchLoader) btnSearchLoader.style.display = 'none';
        }
    }
}
