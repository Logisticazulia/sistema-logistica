// ================= NORMALIZACIÓN SEGURA =================
function normalizarSerial(texto) {
    if (!texto) return '';
    // Convierte a mayúsculas, quita espacios internos y externos, y elimina guiones/puntos
    return texto.toString().toUpperCase().replace(/[\s\-.]+/g, '').trim();
}

// ================= VERIFICAR DUPLICADO EN TIEMPO REAL =================
async function verificarDuplicadoEnTiempoReal(campo, valor, nombreCampo) {
    const valorNormalizado = normalizarSerial(valor);
    if (!valorNormalizado) {
        mostrarAlertaDuplicado(campo, '', false);
        return;
    }

    try {
        // Usamos .ilike() para evitar problemas de mayúsculas/minúsculas en la BD
        // y aplicamos normalización manual para ser estrictos
        var result = await supabaseClient
            .from('fichas_tecnicas')
            .select('id, placa, facsimil, s_carroceria, s_motor')
            .eq(campo, valorNormalizado)
            .limit(1);

        if (result.error) throw result.error;

        if (result.data && result.data.length > 0) {
            mostrarAlertaDuplicado(campo, `¡${nombreCampo} YA REGISTRADO! No se puede duplicar.`, true);
        } else {
            mostrarAlertaDuplicado(campo, '', false);
        }
    } catch (error) {
        console.error(`❌ Error verificando duplicado en ${campo}:`, error);
        mostrarAlertaDuplicado(campo, '', false); // En caso de error, no bloquear
    }
}

// ================= VERIFICAR DUPLICADOS ANTES DE GUARDAR =================
async function verificarDuplicadosAntesDeGuardar(placa, facsimil, s_carroceria, s_motor) {
    const condiciones = [];
    const duplicados = [];

    // Construimos condiciones con comillas dobles para evitar errores de parsing en PostgREST
    if (placa) condiciones.push(`placa.eq."${placa}"`);
    if (facsimil) condiciones.push(`facsimil.eq."${facsimil}"`);
    if (s_carroceria) condiciones.push(`s_carroceria.eq."${s_carroceria}"`);
    if (s_motor) condiciones.push(`s_motor.eq."${s_motor}"`);

    if (condiciones.length === 0) return { existe: false, duplicados: [] };

    try {
        var result = await supabaseClient
            .from('fichas_tecnicas')
            .select('id, placa, facsimil, s_carroceria, s_motor')
            .or(condiciones.join(','));

        if (result.error) throw result.error;

        if (result.data && result.data.length > 0) {
            result.data.forEach(function(ficha) {
                if (placa && normalizarSerial(ficha.placa) === placa) duplicados.push('Placa: ' + ficha.placa);
                if (facsimil && normalizarSerial(ficha.facsimil) === facsimil) duplicados.push('Facsimil: ' + ficha.facsimil);
                if (s_carroceria && normalizarSerial(ficha.s_carroceria) === s_carroceria) duplicados.push('Serial Carrocería: ' + ficha.s_carroceria);
                if (s_motor && normalizarSerial(ficha.s_motor) === s_motor) duplicados.push('Serial Motor: ' + ficha.s_motor);
            });
            return { existe: true, duplicados: duplicados };
        }
        return { existe: false, duplicados: [] };
    } catch (error) {
        console.error('❌ Error verificando duplicados:', error);
        return { existe: false, duplicados: [], error: error };
    }
}

// ================= GUARDAR FICHA (FRAGMENTO ACTUALIZADO) =================
async function guardarFicha() {
    // ... [tu validación inicial se mantiene igual] ...

    // ✅ NORMALIZAR VALORES ANTES DE CONSULTAR
    var placa = normalizarSerial(document.getElementById('placa')?.value);
    var facsimil = normalizarSerial(document.getElementById('facsimil')?.value);
    var s_carroceria = normalizarSerial(document.getElementById('serialCarroceria')?.value);
    var s_motor = normalizarSerial(document.getElementById('serialMotor')?.value);

    if (!placa && !facsimil && !s_carroceria && !s_motor) {
        mostrarAlerta('⚠️ Debe ingresar al menos un identificador (Placa, Facsimil, Serial Carrocería o Motor)', 'error');
        return;
    }

    // ... [tu verificación de duplicados marcados se mantiene] ...

    mostrarAlerta('⏳ Verificando duplicados en base de datos...', 'info');
    var verificacion = await verificarDuplicadosAntesDeGuardar(placa, facsimil, s_carroceria, s_motor);
    
    // ... [resto de tu lógica de guardado se mantiene, pero usa las variables normalizadas] ...
    var fichaData = {
        vehiculo_id: null,
        placa: placa,
        facsimil: facsimil,
        // ... otros campos ...
        s_carroceria: s_carroceria,
        s_motor: s_motor,
        // ...
    };
    // ... [subida de fotos e insert] ...
}

// ================= BUSCAR VEHÍCULO (CORREGIDO) =================
async function buscarVehiculo() {
    var searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    var searchTerm = normalizarSerial(searchInput.value);
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }

    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    try {
        // Búsqueda exacta en vehiculos
        var result = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq."${searchTerm}",facsimil.eq."${searchTerm}",s_carroceria.eq."${searchTerm}",s_motor.eq."${searchTerm}"`)
            .limit(1);

        if (result.error) throw result.error;
        if (!result.data || result.data.length === 0) {
            mostrarAlerta('❌ No se encontró ningún vehículo con: ' + searchTerm, 'error');
            return;
        }

        var vehiculo = result.data[0];
        
        // ✅ VERIFICACIÓN SEGURA DE FICHA EXISTENTE
        const idsAVerificar = [
            normalizarSerial(vehiculo.placa),
            normalizarSerial(vehiculo.facsimil),
            normalizarSerial(vehiculo.s_carroceria),
            normalizarSerial(vehiculo.s_motor)
        ].filter(Boolean);

        if (idsAVerificar.length > 0) {
            const condicionesFicha = idsAVerificar.map(id => `placa.eq."${id}"`); 
            // Nota: Para mayor precisión, se recomienda buscar por cada campo específico,
            // pero para simplificar y mantener compatibilidad con tu estructura:
            const verificacionFicha = await supabaseClient
                .from('fichas_tecnicas')
                .select('id, placa, facsimil, s_carroceria, s_motor')
                .or(condicionesFicha.join(','));

            if (verificacionFicha.data && verificacionFicha.data.length > 0) {
                const fichaExistente = verificacionFicha.data[0];
                mostrarAlerta(`⚠️ ESTE VEHÍCULO YA TIENE FICHA REGISTRADA (Placa: ${fichaExistente.placa || 'N/A'})`, 'error');
                return;
            }
        }

        llenarFormulario(vehiculo);
        bloquearCamposPrincipales();
        mostrarAlerta(`✅ Vehículo encontrado: ${vehiculo.marca} ${vehiculo.modelo} - Placa: ${vehiculo.placa}`, 'success');
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    }
}
