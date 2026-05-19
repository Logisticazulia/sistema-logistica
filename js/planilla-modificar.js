// ============================================
// MODIFICAR VEHÍCULO - LÓGICA COMPLETA (TABLA VEHICULOS)
// ============================================
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let vehiculoSeleccionado = null;
let isEditing = false;

// Referencias a los selects exclusivos
const unidadSelect = document.getElementById('unidad_administrativa');
const epmSelect = document.getElementById('epm');
const eppSelect = document.getElementById('epp');

// ============================================
// LÓGICA DE EXCLUSIVIDAD MUTUA
// ============================================
function checkExclusiveState() {
    // Si el formulario está globalmente deshabilitado, no interferir
    if (document.getElementById('vehicleForm').classList.contains('form-disabled')) return;

    const uVal = unidadSelect?.value?.trim();
    const eVal = epmSelect?.value?.trim();
    const pVal = eppSelect?.value?.trim();

    if (uVal) {
        // Si hay Unidad → Bloquear EPM y EPP
        if (epmSelect) { epmSelect.disabled = true; epmSelect.value = ''; }
        if (eppSelect) { eppSelect.disabled = true; eppSelect.value = ''; }
    } else if (eVal || pVal) {
        // Si hay EPM o EPP → Bloquear Unidad
        if (unidadSelect) { unidadSelect.disabled = true; unidadSelect.value = ''; }
    } else {
        // Si ninguno tiene valor → Habilitar todos para seleccionar
        if (unidadSelect) unidadSelect.disabled = false;
        if (epmSelect) epmSelect.disabled = false;
        if (eppSelect) eppSelect.disabled = false;
    }
}

// Event Listeners para cambio en tiempo real
[unidadSelect, epmSelect, eppSelect].forEach(select => {
    if (select) {
        select.addEventListener('change', checkExclusiveState);
    }
});

// ============================================
// FUNCIONES DE BÚSQUEDA
// ============================================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchUniversal');
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    document.getElementById('alertInfo').style.display = 'none';
    document.getElementById('alertError').style.display = 'none';
    document.getElementById('alertSuccess').style.display = 'none';

    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }

    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    const btnSearch = document.getElementById('btnSearch');
    btnSearch.disabled = true;
    btnSearch.classList.add('searching');

    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq.${searchTerm},facsimil.eq.${searchTerm},s_carroceria.eq.${searchTerm},s_motor.eq.${searchTerm},n_identificacion.eq.${searchTerm}`)
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            mostrarAlerta('❌ No se encontró ningún vehículo con: ' + searchTerm, 'error');
            vehiculoSeleccionado = null;
            resetearFormulario();
            return;
        }

        vehiculoSeleccionado = data[0];
        llenarFormulario(vehiculoSeleccionado);
        mostrarAlerta('✅ Vehículo encontrado: ' + vehiculoSeleccionado.marca + ' ' + vehiculoSeleccionado.modelo, 'success');
        document.getElementById('btnEdit').style.display = 'inline-flex';
        document.getElementById('btnCancel').disabled = false;
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        btnSearch.disabled = false;
        btnSearch.classList.remove('searching');
    }
}

// ============================================
// FUNCIONES DE LLENADO DE FORMULARIO
// ============================================
function llenarFormulario(vehiculo) {
    console.log('📝 Llenando formulario con vehículo:', vehiculo);
    const mapeoCampos = {
        'marca': 'marca', 'modelo': 'modelo', 'tipo': 'tipo', 'clase': 'clase', 'ano': 'ano',
        'color': 'color', 's_carroceria': 's_carroceria', 's_motor': 's_motor', 'placa': 'placa',
        'facsimil': 'facsimil', 'n_identificacion': 'n_identificacion', 'situacion': 'situacion',
        'estatus': 'estatus', 'unidad_administrativa': 'unidad_administrativa', 'redip': 'redip',
        'ccpe': 'ccpe', 'epm': 'epm', 'epp': 'epp', 'ubicacion_fisica': 'ubicacion_fisica',
        'asignacion': 'asignacion', 'observacion': 'observacion', 'observacion_extra': 'observacion_extra',
        'certificado_origen': 'certificado_origen', 'fecha_inspeccion': 'fecha_inspeccion',
        'n_tramite': 'n_tramite', 'ubicacion_titulo': 'ubicacion_titulo'
    };

    Object.entries(mapeoCampos).forEach(([dbField, formField]) => {
        const element = document.getElementById(formField);
        if (element && vehiculo[dbField] !== undefined && vehiculo[dbField] !== null) {
            if (element.tagName === 'SELECT') {
                const dbValue = String(vehiculo[dbField]).toUpperCase().trim();
                const matchingOption = Array.from(element.options).find(opt => 
                    opt.value.toUpperCase().trim() === dbValue || opt.value.replace(/\s/g, '') === dbValue.replace(/\s/g, '')
                );
                element.value = matchingOption ? matchingOption.value : dbValue;
            } else {
                element.value = vehiculo[dbField];
            }
        }
    });

    document.getElementById('vehicleId').value = vehiculo.id;
    checkExclusiveState(); // 🔑 Aplica los bloqueos según los datos cargados
    console.log('✅ Formulario llenado correctamente');
}

function resetearFormulario() {
    document.getElementById('vehicleForm').reset();
    document.getElementById('vehicleId').value = '';
    toggleFormFields(false);
}

function limpiarBusqueda() {
    document.getElementById('searchUniversal').value = '';
    document.getElementById('alertInfo').style.display = 'flex';
    document.getElementById('alertError').style.display = 'none';
    document.getElementById('alertSuccess').style.display = 'none';
    resetearFormulario();
    vehiculoSeleccionado = null;
    document.getElementById('btnEdit').style.display = 'none';
    document.getElementById('btnCancel').disabled = true;
}

// ============================================
// FUNCIONES DE EDICIÓN
// ============================================
function toggleFormFields(enable) {
    const fields = document.querySelectorAll('#vehicleForm input, #vehicleForm select, #vehicleForm textarea');
    fields.forEach(field => {
        if (field.id !== 'vehicleId') field.disabled = !enable;
    });
    document.getElementById('vehicleForm').classList.toggle('form-disabled', !enable);
    isEditing = enable;
    
    // 🔑 Si se habilita, verificar estado de exclusividad
    if (enable) checkExclusiveState();
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
    mostrarAlerta('ℹ️ Editando vehículo. Unidad Administrativa y EPM/EPP son excluyentes.', 'info');
}

function cancelarEdicion() {
    if (vehiculoSeleccionado) llenarFormulario(vehiculoSeleccionado);
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
    if (!form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }

    const btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.disabled = true;
    btnSubmit.classList.add('loading');

    try {
        const vehiculoActualizado = {
            marca: document.getElementById('marca').value.trim().toUpperCase(),
            modelo: document.getElementById('modelo').value.trim().toUpperCase(),
            tipo: document.getElementById('tipo').value.trim().toUpperCase(),
            clase: document.getElementById('clase').value.trim().toUpperCase(),
            ano: document.getElementById('ano').value.trim() || null,
            color: document.getElementById('color').value.trim().toUpperCase(),
            s_carroceria: document.getElementById('s_carroceria').value.trim(),
            s_motor: document.getElementById('s_motor').value.trim() || null,
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            facsimil: document.getElementById('facsimil').value.trim() || null,
            n_identificacion: document.getElementById('n_identificacion').value.trim() || null,
            situacion: document.getElementById('situacion').value.trim().toUpperCase(),
            estatus: document.getElementById('estatus').value.trim().toUpperCase(),
            unidad_administrativa: unidadSelect?.value?.trim() || null,
            redip: document.getElementById('redip').value.trim() || null,
            ccpe: document.getElementById('ccpe').value.trim() || null,
            epm: epmSelect?.value?.trim() || null,
            epp: eppSelect?.value?.trim() || null,
            ubicacion_fisica: document.getElementById('ubicacion_fisica').value.trim() || null,
            asignacion: document.getElementById('asignacion').value.trim() || null,
            observacion: document.getElementById('observacion').value.trim() || null,
            observacion_extra: document.getElementById('observacion_extra').value.trim() || null,
            certificado_origen: document.getElementById('certificado_origen').value.trim() || null,
            fecha_inspeccion: document.getElementById('fecha_inspeccion').value || null,
            n_tramite: document.getElementById('n_tramite').value.trim() || null,
            ubicacion_titulo: document.getElementById('ubicacion_titulo').value.trim() || null,
        };

        console.log('📝 Actualizando vehículo ID:', vehiculoSeleccionado.id);
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .update(vehiculoActualizado)
            .eq('id', vehiculoSeleccionado.id)
            .select();

        if (error) throw error;

        mostrarAlerta('✅ Vehículo actualizado exitosamente', 'success');
        vehiculoSeleccionado = Object.assign({}, vehiculoSeleccionado, data[0]);
        setTimeout(limpiarTodoParaNuevaBusqueda, 2000);
    } catch (error) {
        console.error('❌ Error al actualizar:', error);
        mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.classList.remove('loading');
    }
}

function limpiarTodoParaNuevaBusqueda() {
    document.getElementById('searchUniversal').value = '';
    document.getElementById('vehicleForm').reset();
    document.getElementById('vehicleId').value = '';
    toggleFormFields(false);
    document.getElementById('btnEdit').style.display = 'inline-flex';
    document.getElementById('btnSubmit').style.display = 'none';
    document.getElementById('btnCancel').disabled = true;
    vehiculoSeleccionado = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarAlerta('ℹ️ Ingrese placa, facsímil, serial o N° identificación para buscar un vehículo', 'info');
}

// ============================================
// UTILIDADES E INICIALIZACIÓN
// ============================================
function mostrarAlerta(mensaje, tipo) {
    const alertInfo = document.getElementById('alertInfo');
    const alertError = document.getElementById('alertError');
    const alertSuccess = document.getElementById('alertSuccess');
    alertInfo.style.display = 'none'; alertError.style.display = 'none'; alertSuccess.style.display = 'none';

    if (tipo === 'success') {
        document.getElementById('successMessage').textContent = mensaje; alertSuccess.style.display = 'flex';
    } else if (tipo === 'error') {
        document.getElementById('errorMessage').textContent = mensaje; alertError.style.display = 'flex';
    } else {
        document.getElementById('infoMessage').textContent = mensaje; alertInfo.style.display = 'flex';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tipo !== 'info') setTimeout(() => { alertSuccess.style.display = 'none'; alertError.style.display = 'none'; }, 5000);
}

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
    if (searchInput) searchInput.addEventListener('keypress', e => e.key === 'Enter' && buscarVehiculo());
    
    // Botón limpiar búsqueda
    const btnClear = document.getElementById('btnClearSearch');
    if (btnClear) btnClear.addEventListener('click', limpiarBusqueda);

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
        if (session?.user?.email) document.getElementById('userEmail').textContent = session.user.email;
    } catch (error) { console.error('Error al cargar usuario:', error); }
}
