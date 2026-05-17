// ============================================
// MODIFICAR VEHÍCULO - LÓGICA COMPLETA (TABLA VEHICULOS)
// ============================================
// Configuración de Supabase
const supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_KEY
);

// Vehículo seleccionado
let vehiculoSeleccionado = null;
let isEditing = false;

// ============================================
// FUNCIONES DE BÚSQUEDA
// ============================================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchUniversal');
    const alertInfo = document.getElementById('alertInfo');
    const alertError = document.getElementById('alertError');
    const alertSuccess = document.getElementById('alertSuccess');
    const searchTerm = searchInput?.value.trim().toUpperCase();
    
    // Ocultar alertas previas
    if (alertInfo) alertInfo.style.display = 'none';
    if (alertError) alertError.style.display = 'none';
    if (alertSuccess) alertSuccess.style.display = 'none';

    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }

    console.log('🔍 Buscando vehículo:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    const btnSearch = document.getElementById('btnSearch');
    if (btnSearch) {
        btnSearch.disabled = true;
        btnSearch.classList.add('searching');
    }

    try {
        // ✅ BÚSQUEDA EXACTA POR 5 CAMPOS
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq.${searchTerm},facsimil.eq.${searchTerm},s_carroceria.eq.${searchTerm},s_motor.eq.${searchTerm},n_identificacion.eq.${searchTerm}`)
            .limit(1);

        if (error) {
            console.error('❌ Error en la búsqueda:', error);
            mostrarAlerta('❌ Error al buscar: ' + error.message, 'error');
            return;
        }

        if (!data || data.length === 0) {
            mostrarAlerta('❌ No se encontró ningún vehículo con: ' + searchTerm, 'error');
            vehiculoSeleccionado = null;
            resetearFormulario();
            return;
        }

        vehiculoSeleccionado = data[0];
        console.log('✅ Vehículo encontrado:', vehiculoSeleccionado);
        llenarFormulario(vehiculoSeleccionado);
        mostrarAlerta('✅ Vehículo encontrado: ' + (vehiculoSeleccionado.marca || '') + ' ' + (vehiculoSeleccionado.modelo || '') + ' - Placa: ' + (vehiculoSeleccionado.placa || 'N/A'), 'success');
        
        // Mostrar botones de editar/cancelar después de buscar
        const btnEdit = document.getElementById('btnEdit');
        const btnCancel = document.getElementById('btnCancel');
        if (btnEdit) btnEdit.style.display = 'inline-flex';
        if (btnCancel) btnCancel.disabled = false;

    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        if (btnSearch) {
            btnSearch.disabled = false;
            btnSearch.classList.remove('searching');
        }
    }
}

// ============================================
// FUNCIONES DE LLENADO DE FORMULARIO
// ============================================
function llenarFormulario(vehiculo) {
    console.log('📝 Llenando formulario con vehículo:', vehiculo);
    const mapeoCampos = {
        'marca': 'marca', 'modelo': 'modelo', 'tipo': 'tipo', 'clase': 'clase',
        'ano': 'ano', 'color': 'color', 's_carroceria': 's_carroceria',
        's_motor': 's_motor', 'placa': 'placa', 'facsimil': 'facsimil',
        'n_identificacion': 'n_identificacion', 'situacion': 'situacion',
        'estatus': 'estatus', 'unidad_administrativa': 'unidad_administrativa',
        'redip': 'redip', 'ccpe': 'ccpe', 'epm': 'epm', 'epp': 'epp',
        'ubicacion_fisica': 'ubicacion_fisica', 'asignacion': 'asignacion',
        'observacion': 'observacion', 'observacion_extra': 'observacion_extra',
        'certificado_origen': 'certificado_origen', 'fecha_inspeccion': 'fecha_inspeccion',
        'n_tramite': 'n_tramite', 'ubicacion_titulo': 'ubicacion_titulo'
    };

    Object.entries(mapeoCampos).forEach(function(pair) {
        const dbField = pair[0];
        const formField = pair[1];
        const element = document.getElementById(formField);
        if (element && vehiculo[dbField] !== undefined && vehiculo[dbField] !== null) {
            if (element.tagName === 'SELECT') {
                const options = Array.from(element.options);
                const dbValue = String(vehiculo[dbField]).toUpperCase().trim();
                let matchingOption = options.find(function(opt) {
                    const optValue = opt.value.toUpperCase().trim();
                    return optValue === dbValue || optValue.replace(/\s/g, '') === dbValue.replace(/\s/g, '');
                });
                if (matchingOption) {
                    element.value = matchingOption.value;
                } else {
                    const newOption = document.createElement('option');
                    newOption.value = dbValue;
                    newOption.textContent = dbValue;
                    newOption.selected = true;
                    element.appendChild(newOption);
                }
            } else {
                element.value = vehiculo[dbField];
            }
        }
    });
    const idField = document.getElementById('vehicleId');
    if (idField) idField.value = vehiculo.id;
    console.log('✅ Formulario llenado correctamente');
}

function resetearFormulario() {
    const form = document.getElementById('vehicleForm');
    if (form) form.reset();
    const idField = document.getElementById('vehicleId');
    if (idField) idField.value = '';
    toggleFormFields(false);
}

// ============================================
// FUNCIONES DE LIMPIEZA Y EDICIÓN
// ============================================
function limpiarBusqueda() {
    console.log('🧹 Limpiando formulario y búsqueda...');
    const searchInput = document.getElementById('searchUniversal');
    if (searchInput) searchInput.value = '';
    
    const alertInfo = document.getElementById('alertInfo');
    const alertError = document.getElementById('alertError');
    const alertSuccess = document.getElementById('alertSuccess');
    if (alertInfo) {
        alertInfo.style.display = 'flex';
        document.getElementById('infoMessage').textContent = 'Ingrese Placa, ID, Facsímil, Serial o N° Identificación para buscar';
    }
    if (alertError) alertError.style.display = 'none';
    if (alertSuccess) alertSuccess.style.display = 'none';

    resetearFormulario();
    vehiculoSeleccionado = null;
    
    const btnEdit = document.getElementById('btnEdit');
    const btnCancel = document.getElementById('btnCancel');
    if (btnEdit) btnEdit.style.display = 'none';
    if (btnCancel) btnCancel.disabled = true;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleFormFields(enable) {
    const fields = document.querySelectorAll('#vehicleForm input, #vehicleForm select, #vehicleForm textarea');
    fields.forEach(function(field) {
        if (field.id !== 'vehicleId') {
            field.disabled = !enable;
        }
    });
    const form = document.getElementById('vehicleForm');
    if (form) {
        form.classList.toggle('form-disabled', !enable);
    }
    isEditing = enable;
}

function editarVehiculo() {
    if (!vehiculoSeleccionado) {
        mostrarAlerta('⚠️ Primero debe buscar un vehículo', 'error');
        return;
    }
    toggleFormFields(true);
    const btnEdit = document.getElementById('btnEdit');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnCancel = document.getElementById('btnCancel');
    
    if (btnEdit) btnEdit.style.display = 'none';
    if (btnSubmit) btnSubmit.style.display = 'inline-flex';
    if (btnCancel) btnCancel.disabled = false;
    
    mostrarAlerta('ℹ️ Editando vehículo. TODOS los campos son modificables.', 'info');
}

function cancelarEdicion() {
    if (vehiculoSeleccionado) {
        llenarFormulario(vehiculoSeleccionado);
    }
    toggleFormFields(false);
    const btnEdit = document.getElementById('btnEdit');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnCancel = document.getElementById('btnCancel');
    
    if (btnEdit) btnEdit.style.display = 'inline-flex';
    if (btnSubmit) btnSubmit.style.display = 'none';
    if (btnCancel) btnCancel.disabled = true;
    
    mostrarAlerta('ℹ️ Edición cancelada. Los cambios no fueron guardados.', 'info');
}

// ============================================
// FUNCIONES DE GUARDADO (SEGURA)
// ============================================
async function guardarVehiculo(event) {
    event.preventDefault();
    if (!vehiculoSeleccionado) {
        mostrarAlerta('⚠️ No hay vehículo seleccionado', 'error');
        return;
    }

    const form = document.getElementById('vehicleForm');
    if (form && !form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }

    const btnSubmit = document.getElementById('btnSubmit');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.classList.add('loading');
    }

    try {
        // ✅ FUNCIÓN SEGURA PARA OBTENER VALORES
        const getVal = (id, trim = true, upper = false) => {
            const el = document.getElementById(id);
            if (!el) return null;
            let val = el.value;
            if (trim) val = val.trim();
            if (upper) val = val.toUpperCase();
            return val === '' ? null : val;
        };

        const vehiculoActualizado = {
            marca: getVal('marca', true, true),
            modelo: getVal('modelo', true, true),
            tipo: getVal('tipo', true, true),
            clase: getVal('clase', true, true),
            ano: getVal('ano', true, false),
            color: getVal('color', true, true),
            s_carroceria: getVal('s_carroceria', true, false),
            s_motor: getVal('s_motor', true, false),
            placa: getVal('placa', true, true),
            facsimil: getVal('facsimil', true, false),
            n_identificacion: getVal('n_identificacion', true, false),
            situacion: getVal('situacion', true, true),
            estatus: getVal('estatus', true, true),
            unidad_administrativa: getVal('unidad_administrativa', true, false),
            redip: getVal('redip', true, false),
            ccpe: getVal('ccpe', true, false),
            epm: getVal('epm', true, false),
            epp: getVal('epp', true, false),
            ubicacion_fisica: getVal('ubicacion_fisica', true, false),
            asignacion: getVal('asignacion', true, false),
            observacion: getVal('observacion', true, false),
            observacion_extra: getVal('observacion_extra', true, false),
            certificado_origen: getVal('certificado_origen', true, false),
            fecha_inspeccion: getVal('fecha_inspeccion', false, false),
            n_tramite: getVal('n_tramite', true, false),
            ubicacion_titulo: getVal('ubicacion_titulo', true, false),
        };

        console.log('📝 Actualizando vehículo ID:', vehiculoSeleccionado.id, vehiculoActualizado);
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .update(vehiculoActualizado)
            .eq('id', vehiculoSeleccionado.id)
            .select();

        if (error) {
            console.error('❌ Error al actualizar:', error);
            mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
            return;
        }

        console.log('✅ Vehículo actualizado:', data);
        mostrarAlerta('✅ Vehículo actualizado exitosamente', 'success');
        vehiculoSeleccionado = Object.assign({}, vehiculoSeleccionado, data[0]);
        
        setTimeout(function() {
            limpiarTodoParaNuevaBusqueda();
        }, 2000);

    } catch (error) {
        console.error('❌ Error en guardarVehiculo:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('loading');
        }
    }
}

function limpiarTodoParaNuevaBusqueda() {
    console.log('🧹 Limpiando formulario para nueva búsqueda...');
    limpiarBusqueda();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function mostrarAlerta(mensaje, tipo) {
    const alertInfo = document.getElementById('alertInfo');
    const alertError = document.getElementById('alertError');
    const alertSuccess = document.getElementById('alertSuccess');
    
    if (alertInfo) alertInfo.style.display = 'none';
    if (alertError) alertError.style.display = 'none';
    if (alertSuccess) alertSuccess.style.display = 'none';

    if (tipo === 'success') {
        const msg = document.getElementById('successMessage');
        if (msg) msg.textContent = mensaje;
        if (alertSuccess) alertSuccess.style.display = 'flex';
    } else if (tipo === 'error') {
        const msg = document.getElementById('errorMessage');
        if (msg) msg.textContent = mensaje;
        if (alertError) alertError.style.display = 'flex';
    } else {
        const msg = document.getElementById('infoMessage');
        if (msg) msg.textContent = mensaje;
        if (alertInfo) alertInfo.style.display = 'flex';
    }

    if (tipo !== 'info') {
        setTimeout(function() {
            if (alertSuccess) alertSuccess.style.display = 'none';
            if (alertError) alertError.style.display = 'none';
        }, 5000);
    }
}

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando modificación de vehículos...');
    
    const btnEdit = document.getElementById('btnEdit');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnCancel = document.getElementById('btnCancel');
    const btnSearch = document.getElementById('btnSearch');
    const searchInput = document.getElementById('searchUniversal');
    const btnClearSearch = document.getElementById('btnClearSearch'); // ✅ Botón de limpiar
    const logoutBtn = document.getElementById('logoutBtn');

    if (btnEdit) btnEdit.addEventListener('click', editarVehiculo);
    if (btnSubmit) btnSubmit.addEventListener('click', guardarVehiculo);
    if (btnCancel) btnCancel.addEventListener('click', cancelarEdicion);
    if (btnSearch) btnSearch.addEventListener('click', buscarVehiculo);
    if (searchInput) searchInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') buscarVehiculo(); });
    
    // ✅ Asignar evento al botón de limpiar
    if (btnClearSearch) btnClearSearch.addEventListener('click', limpiarBusqueda);
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('¿Está seguro de cerrar sesión?')) {
                await supabaseClient.auth.signOut();
                window.location.href = '../index.html';
            }
        });
    }
    
    cargarUsuario();
    console.log('✅ Modificación de vehículos inicializada');
});

async function cargarUsuario() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user && session.user.email) {
            const el = document.getElementById('userEmail');
            if (el) el.textContent = session.user.email;
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}
