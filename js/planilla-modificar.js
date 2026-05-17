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

// ✅ TODOS LOS CAMPOS SON EDITABLES (lista vacía)
const camposNoEditables = [];

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
        // ✅ BÚSQUEDA EXACTA POR 5 CAMPOS: placa, facsimil, s_carroceria, s_motor, n_identificacion
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
        const btnSearch = document.getElementById('btnSearch');
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
                    if (optValue === dbValue) return true;
                    if (optValue.replace(/\s/g, '') === dbValue.replace(/\s/g, '')) return true;
                    return false;
                });
                if (matchingOption) {
                    element.value = matchingOption.value;
                    console.log('✅ Select asignado:', formField, '=', matchingOption.value);
                } else {
                    const newOption = document.createElement('option');
                    newOption.value = dbValue;
                    newOption.textContent = dbValue;
                    newOption.selected = true;
                    element.appendChild(newOption);
                    console.log('⚠️ Opción agregada dinámicamente:', formField, '=', dbValue);
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

function limpiarBusqueda() {
    const searchInput = document.getElementById('searchUniversal');
    if (searchInput) searchInput.value = '';
    
    const alertInfo = document.getElementById('alertInfo');
    if (alertInfo) alertInfo.style.display = 'flex';
    document.getElementById('alertError').style.display = 'none';
    document.getElementById('alertSuccess').style.display = 'none';
    
    resetearFormulario();
    vehiculoSeleccionado = null;
    
    const btnEdit = document.getElementById('btnEdit');
    const btnCancel = document.getElementById('btnCancel');
    if (btnEdit) btnEdit.style.display = 'none';
    if (btnCancel) btnCancel.disabled = true;
}

// ============================================
// FUNCIONES DE EDICIÓN
// ============================================
// ✅ TODOS LOS CAMPOS SON EDITABLES
function toggleFormFields(enable) {
    const fields = document.querySelectorAll('#vehicleForm input, #vehicleForm select, #vehicleForm textarea');
    fields.forEach(function(field) {
        if (field.id !== 'vehicleId') {
            field.disabled = !enable;
        }
    });
    const form = document.getElementById('vehicleForm');
    if (form) form.classList.toggle('form-disabled', !enable);
    isEditing = enable;
}

function editarVehiculo() {
    if (!vehiculoSeleccionado) {
        mostrarAlerta('⚠️ Primero debe buscar un vehículo', 'error');
        return;
    }
    toggleFormFields(true);
    document.getElementById('btnEdit').style.display = 'none';
    document.getElementById('btnSubmit').style.display = 'inline-flex';
    document.getElementById('btnCancel').disabled = false;
    mostrarAlerta('ℹ️ Editando vehículo. TODOS los campos son modificables.', 'info');
}

function cancelarEdicion() {
    if (vehiculoSeleccionado) {
        llenarFormulario(vehiculoSeleccionado);
    }
    toggleFormFields(false);
    document.getElementById('btnEdit').style.display = 'inline-flex';
    document.getElementById('btnSubmit').style.display = 'none';
    document.getElementById('btnCancel').disabled = false;
    mostrarAlerta('ℹ️ Edición cancelada. Los cambios no fueron guardados.', 'info');
}

// ============================================
// FUNCIONES DE GUARDADO
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
        // ✅ ACTUALIZAR TODOS LOS CAMPOS EDITABLES
        const vehiculoActualizado = {
            marca: document.getElementById('marca')?.value.trim().toUpperCase(),
            modelo: document.getElementById('modelo')?.value.trim().toUpperCase(),
            tipo: document.getElementById('tipo')?.value.trim().toUpperCase(),
            clase: document.getElementById('clase')?.value.trim().toUpperCase(),
            ano: document.getElementById('ano')?.value.trim() || null,
            color: document.getElementById('color')?.value.trim().toUpperCase(),
            s_carroceria: document.getElementById('s_carroceria')?.value.trim(),
            s_motor: document.getElementById('s_motor')?.value.trim() || null,
            placa: document.getElementById('placa')?.value.trim().toUpperCase(),
            facsimil: document.getElementById('facsimil')?.value.trim() || null,
            n_identificacion: document.getElementById('n_identificacion')?.value.trim() || null,
            situacion: document.getElementById('situacion')?.value.trim().toUpperCase(),
            estatus: document.getElementById('estatus')?.value.trim().toUpperCase(),
            unidad_administrativa: document.getElementById('unidad_administrativa')?.value.trim(),
            redip: document.getElementById('redip')?.value.trim() || null,
            ccpe: document.getElementById('ccpe')?.value.trim() || null,
            epm: document.getElementById('epm')?.value.trim() || null,
            epp: document.getElementById('epp')?.value.trim() || null,
            ubicacion_fisica: document.getElementById('ubicacion_fisica')?.value.trim() || null,
            asignacion: document.getElementById('asignacion')?.value.trim() || null,
            observacion: document.getElementById('observacion')?.value.trim() || null,
            observacion_extra: document.getElementById('observacion_extra')?.value.trim() || null,
            certificado_origen: document.getElementById('certificado_origen')?.value.trim() || null,
            fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value || null,
            n_tramite: document.getElementById('n_tramite')?.value.trim() || null,
            ubicacion_titulo: document.getElementById('ubicacion_titulo')?.value.trim() || null,
        };

        console.log('📝 Actualizando vehículo ID:', vehiculoSeleccionado.id);
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
        
        // 🔄 SCROLL AUTOMÁTICO HACIA ARRIBA PARA VER EL MENSAJE
        window.scrollTo({ top: 0, behavior: 'smooth' });

        vehiculoSeleccionado = Object.assign({}, vehiculoSeleccionado, data[0]);
        setTimeout(function() {
            limpiarTodoParaNuevaBusqueda();
        }, 2000);
    } catch (error) {
        console.error('❌ Error en guardarVehiculo:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        const btnSubmit = document.getElementById('btnSubmit');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('loading');
        }
    }
}

// NUEVA FUNCIÓN: LIMPIAR TODO PARA NUEVA BÚSQUEDA
function limpiarTodoParaNuevaBusqueda() {
    console.log('🧹 Limpiando formulario para nueva búsqueda...');
    const searchInput = document.getElementById('searchUniversal');
    if (searchInput) searchInput.value = '';
    
    const form = document.getElementById('vehicleForm');
    if (form) form.reset();
    
    const idField = document.getElementById('vehicleId');
    if (idField) idField.value = '';
    
    toggleFormFields(false);
    
    const btnEdit = document.getElementById('btnEdit');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnCancel = document.getElementById('btnCancel');
    
    if (btnEdit) btnEdit.style.display = 'inline-flex';
    if (btnSubmit) btnSubmit.style.display = 'none';
    if (btnCancel) btnCancel.disabled = true;
    
    vehiculoSeleccionado = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarAlerta('ℹ️ Ingrese placa, facsímil, serial o N° identificación para buscar un vehículo', 'info');
    console.log('✅ Formulario limpiado, listo para nueva búsqueda');
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function mostrarAlerta(mensaje, tipo) {
    const alertInfo = document.getElementById('alertInfo');
    const alertError = document.getElementById('alertError');
    const alertSuccess = document.getElementById('alertSuccess');
    
    // Ocultar todas primero
    if (alertInfo) alertInfo.style.display = 'none';
    if (alertError) alertError.style.display = 'none';
    if (alertSuccess) alertSuccess.style.display = 'none';

    // Mostrar la correspondiente
    if (tipo === 'success') {
        const msgEl = document.getElementById('successMessage');
        if (msgEl) msgEl.textContent = mensaje;
        if (alertSuccess) alertSuccess.style.display = 'flex';
    } else if (tipo === 'error') {
        const msgEl = document.getElementById('errorMessage');
        if (msgEl) msgEl.textContent = mensaje;
        if (alertError) alertError.style.display = 'flex';
    } else {
        const msgEl = document.getElementById('infoMessage');
        if (msgEl) msgEl.textContent = mensaje;
        if (alertInfo) alertInfo.style.display = 'flex';
    }

    // Auto-ocultar después de 5 segundos (excepto info inicial)
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
    const logoutBtn = document.getElementById('logoutBtn');

    if (btnEdit) btnEdit.addEventListener('click', editarVehiculo);
    if (btnSubmit) btnSubmit.addEventListener('click', guardarVehiculo);
    if (btnCancel) btnCancel.addEventListener('click', cancelarEdicion);
    if (btnSearch) btnSearch.addEventListener('click', buscarVehiculo);
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') buscarVehiculo();
        });
    }

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
