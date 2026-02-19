/**
 * MODIFICAR VEHÍCULOS - PLANILLA
 * Maneja la búsqueda universal y actualización de vehículos existentes
 */
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// Referencias al DOM
const form = document.getElementById('vehicleForm');
const btnSearch = document.getElementById('btnSearch');
const btnEdit = document.getElementById('btnEdit');
const btnCancel = document.getElementById('btnCancel');
const btnSubmit = document.getElementById('btnSubmit');
const searchUniversal = document.getElementById('searchUniversal');
const alertSuccess = document.getElementById('alertSuccess');
const alertError = document.getElementById('alertError');
const alertInfo = document.getElementById('alertInfo');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const infoMessage = document.getElementById('infoMessage');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Estado de edición
let isEditing = false;
let vehicleData = null;

// ================= FUNCIONES DE UTILIDAD =================

// Mostrar usuario autenticado
async function mostrarUsuarioAutenticado() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (session?.user?.email) {
            userEmail.textContent = session.user.email;
        }
    } catch (err) {
        console.error('Error obteniendo sesión:', err);
    }
}

// Cerrar sesión
async function cerrarSesion() {
    try {
        await supabaseClient.auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.location.href = '../index.html';
    }
}

// Mostrar alertas
function showAlert(type, message) {
    alertSuccess.style.display = 'none';
    alertError.style.display = 'none';
    alertInfo.style.display = 'none';
    
    if (type === 'success') {
        successMessage.textContent = message;
        alertSuccess.style.display = 'flex';
        setTimeout(() => {
            alertSuccess.style.display = 'none';
        }, 5000);
    } else if (type === 'error') {
        errorMessage.textContent = message;
        alertError.style.display = 'flex';
    } else if (type === 'info') {
        infoMessage.textContent = message;
        alertInfo.style.display = 'flex';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Habilitar/deshabilitar campos del formulario
function toggleFormFields(enable) {
    const fields = form.querySelectorAll('.form-input, .form-select, .form-textarea');
    fields.forEach(field => {
        if (field.id !== 'vehicleId') {
            field.disabled = !enable;
        }
    });
    
    btnCancel.disabled = !enable;
    btnEdit.style.display = enable ? 'none' : 'flex';
    btnSubmit.style.display = enable ? 'flex' : 'none';
    
    form.classList.toggle('form-disabled', !enable);
    isEditing = enable;
}

// Llenar formulario con datos del vehículo
function cargarDatosVehiculo(vehiculo) {
    const campos = [
        'placa', 'facsimil', 'n_identificacion', 'marca', 'modelo', 'tipo', 'clase',
        'ano', 'color', 's_carroceria', 's_motor', 'situacion', 'estatus',
        'unidad_administrativa', 'ubicacion_fisica', 'asignacion', 'redip', 'ccpe',
        'epm', 'epp', 'certificado_origen', 'fecha_inspeccion', 'n_tramite',
        'ubicacion_titulo', 'observacion', 'observacion_extra'
    ];
    
    campos.forEach(campo => {
        const input = document.getElementById(campo);
        if (input && vehiculo[campo] !== undefined && vehiculo[campo] !== null) {
            if (input.type === 'date' && vehiculo[campo]) {
                const fecha = new Date(vehiculo[campo]);
                input.value = fecha.toISOString().split('T')[0];
            } else {
                input.value = vehiculo[campo];
            }
        }
    });
    
    document.getElementById('vehicleId').value = vehiculo.id;
    
    showAlert('success', `✅ Vehículo ${vehiculo.placa} encontrado. Presione "Editar Información" para modificar.`);
}

// ================= BÚSQUEDA UNIVERSAL =================

// Buscar vehículo en múltiples campos
async function buscarVehiculo() {
    const searchTerm = searchUniversal.value.trim();
    
    if (!searchTerm) {
        showAlert('error', '❌ Ingrese Placa, ID, Facsímil o Serial para buscar');
        return;
    }
    
    btnSearch.classList.add('searching');
    btnSearch.disabled = true;
    
    try {
        let query = supabaseClient.from('vehiculos').select('*').limit(1);
        
        // Detectar si es número (ID) o texto (Placa, Facsímil, Seriales)
        const esNumero = /^\d+$/.test(searchTerm);
        const searchUpper = searchTerm.toUpperCase();
        
        if (esNumero && searchTerm.length <= 5) {
            // Probablemente es ID
            query = query.eq('id', parseInt(searchTerm));
        } else {
            // Búsqueda OR en múltiples campos
            query = query.or(`placa.ilike.%${searchUpper}%,facsimil.ilike.%${searchUpper}%,s_carroceria.ilike.%${searchUpper}%,s_motor.ilike.%${searchUpper}%`);
            
            // Si es número largo, también buscar por ID
            if (esNumero) {
                query = query.or(`id.eq.${searchTerm}`);
            }
        }
        
        const { data, error } = await query.single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                showAlert('error', '❌ Vehículo no encontrado. Verifique los datos e intente nuevamente.');
            } else {
                console.error('Error al buscar:', error);
                showAlert('error', 'Error al buscar: ' + error.message);
            }
            return;
        }
        
        if (!data) {
            showAlert('error', '❌ Vehículo no encontrado');
            return;
        }
        
        vehicleData = data;
        cargarDatosVehiculo(data);
        
        btnEdit.disabled = false;
        btnCancel.disabled = false;
        
    } catch (error) {
        console.error('Error en buscarVehiculo:', error);
        showAlert('error', 'Error de conexión: ' + error.message);
    } finally {
        btnSearch.classList.remove('searching');
        btnSearch.disabled = false;
    }
}

// ================= VALIDACIÓN Y ACTUALIZACIÓN =================

function validarFormulario() {
    const camposObligatorios = ['placa', 'marca', 'modelo', 'tipo', 'clase'];
    let isValid = true;
    let mensajeError = '';
    
    camposObligatorios.forEach(campo => {
        const input = document.getElementById(campo);
        if (!input.value.trim()) {
            isValid = false;
            input.style.borderColor = '#dc2626';
            mensajeError = `El campo "${input.previousElementSibling.textContent.replace('*', '').trim()}" es obligatorio`;
        } else {
            input.style.borderColor = '#e2e8f0';
        }
    });
    
    if (!isValid) {
        showAlert('error', mensajeError);
    }
    
    return isValid;
}

async function actualizarVehiculo(event) {
    event.preventDefault();
    
    if (!validarFormulario()) {
        return;
    }
    
    const vehicleId = document.getElementById('vehicleId').value;
    if (!vehicleId) {
        showAlert('error', 'Error: No se encontró el ID del vehículo');
        return;
    }
    
    btnSubmit.classList.add('loading');
    btnSubmit.disabled = true;
    
    try {
        const vehiculoActualizado = {
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            facsimil: document.getElementById('facsimil').value.trim().toUpperCase(),
            n_identificacion: document.getElementById('n_identificacion').value.trim().toUpperCase(),
            marca: document.getElementById('marca').value.trim().toUpperCase(),
            modelo: document.getElementById('modelo').value.trim().toUpperCase(),
            tipo: document.getElementById('tipo').value.trim().toUpperCase(),
            clase: document.getElementById('clase').value.trim().toUpperCase(),
            ano: document.getElementById('ano').value ? parseInt(document.getElementById('ano').value) : null,
            color: document.getElementById('color').value.trim().toUpperCase(),
            s_carroceria: document.getElementById('s_carroceria').value.trim().toUpperCase(),
            s_motor: document.getElementById('s_motor').value.trim().toUpperCase(),
            situacion: document.getElementById('situacion').value.trim().toUpperCase(),
            estatus: document.getElementById('estatus').value.trim().toUpperCase(),
            unidad_administrativa: document.getElementById('unidad_administrativa').value.trim().toUpperCase(),
            ubicacion_fisica: document.getElementById('ubicacion_fisica').value.trim().toUpperCase(),
            asignacion: document.getElementById('asignacion').value.trim().toUpperCase(),
            redip: document.getElementById('redip').value.trim().toUpperCase(),
            ccpe: document.getElementById('ccpe').value.trim().toUpperCase(),
            epm: document.getElementById('epm').value.trim().toUpperCase(),
            epp: document.getElementById('epp').value.trim().toUpperCase(),
            certificado_origen: document.getElementById('certificado_origen').value.trim().toUpperCase(),
            fecha_inspeccion: document.getElementById('fecha_inspeccion').value || null,
            n_tramite: document.getElementById('n_tramite').value.trim().toUpperCase(),
            ubicacion_titulo: document.getElementById('ubicacion_titulo').value.trim().toUpperCase(),
            observacion: document.getElementById('observacion').value.trim(),
            observacion_extra: document.getElementById('observacion_extra').value.trim()
        };
        
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .update(vehiculoActualizado)
            .eq('id', parseInt(vehicleId))
            .select();
        
        if (error) throw error;
        
        showAlert('success', '✅ Vehículo ' + vehiculoActualizado.placa + ' actualizado exitosamente');
        toggleFormFields(false);
        
    } catch (error) {
        console.error('Error en actualizarVehiculo:', error);
        showAlert('error', '❌ Error al actualizar: ' + (error.message || 'Verifique su conexión'));
    } finally {
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
    }
}

function cancelarEdicion() {
    if (vehicleData) {
        cargarDatosVehiculo(vehicleData);
    }
    toggleFormFields(false);
    showAlert('info', 'Edición cancelada. Los cambios no fueron guardados.');
}

// ================= EVENT LISTENERS =================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando modificación de vehículos...');
    
    mostrarUsuarioAutenticado();
    
    // Búsqueda universal
    btnSearch.addEventListener('click', buscarVehiculo);
    searchUniversal.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarVehiculo();
    });
    
    // Edición
    btnEdit.addEventListener('click', () => toggleFormFields(true));
    btnCancel.addEventListener('click', cancelarEdicion);
    
    // Guardar cambios
    form.addEventListener('submit', actualizarVehiculo);
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    showAlert('info', 'Ingrese Placa, ID, Facsímil o Serial para buscar un vehículo');
});
