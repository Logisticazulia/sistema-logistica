/**
* REGISTRO DE VEHÍCULOS - PLANILLA
* Maneja el formulario de creación de nuevos vehículos
*/
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// Referencias al DOM
const form = document.getElementById('vehicleForm');
const btnSubmit = document.getElementById('btnSubmit');
const alertSuccess = document.getElementById('alertSuccess');
const alertError = document.getElementById('alertError');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Mostrar usuario autenticado
// Mostrar usuario autenticado
async function mostrarUsuarioAutenticado() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Error de sesión:', error);
            userEmail.textContent = 'Invitado';
            return;
        }
        
        if (session?.user?.email) {
            // Muestra solo el nombre antes del @
           userEmail.textContent = session.user.email;
        } else if (session?.user?.user_metadata?.full_name) {
            // Fallback: usa el nombre completo si existe
            userEmail.textContent = session.user.user_metadata.full_name;
        } else {
            userEmail.textContent = 'Usuario';
        }
    } catch (err) {
        console.error('Error obteniendo sesión:', err);
        userEmail.textContent = 'Invitado';
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
    
    if (type === 'success') {
        successMessage.textContent = message;
        alertSuccess.style.display = 'flex';
        setTimeout(() => {
            alertSuccess.style.display = 'none';
        }, 5000);
    } else {
        errorMessage.textContent = message;
        alertError.style.display = 'flex';
    }
    
    // Scroll hacia la alerta
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validar formulario
function validarFormulario() {
    const camposObligatorios = ['placa', 'marca', 'modelo', 'tipo', 'clase'];
    let isValid = true;
    let mensajeError = '';
    
    camposObligatorios.forEach(campo => {
        const input = document.getElementById(campo);
        if (!input.value.trim()) {
            isValid = false;
            input.style.borderColor = '#dc2626';
            mensajeError = `El campo "${input.previousElementSibling.textContent.replace('*', '')}" es obligatorio`;
        } else {
            input.style.borderColor = '#ddd';
        }
    });
    
    if (!isValid) {
        showAlert('error', mensajeError);
    }
    
    return isValid;
}

// Guardar vehículo
async function guardarVehiculo(event) {
    event.preventDefault();
    
    if (!validarFormulario()) {
        return;
    }
    
    // Estado de carga
    btnSubmit.classList.add('loading');
    btnSubmit.disabled = true;
    
    try {
        // Recopilar datos del formulario
        const vehiculo = {
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
        
        console.log('Guardando vehículo:', vehiculo);
        
        // Insertar en Supabase
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .insert([vehiculo])
            .select();
        
        if (error) {
            console.error('Error al guardar:', error);
            throw error;
        }
        
        console.log('Vehículo guardado:', data);
        showAlert('success', '✅ Vehículo registrado exitosamente con Placa: ' + vehiculo.placa);
        
        // Limpiar formulario
        form.reset();
        
        // Opcional: Redirigir a consultar después de 2 segundos
        // setTimeout(() => {
        //     window.location.href = 'planilla-consultar.html';
        // }, 2000);
        
    } catch (error) {
        console.error('Error en guardarVehiculo:', error);
        showAlert('error', '❌ Error al guardar: ' + (error.message || 'Verifique su conexión'));
    } finally {
        // Restaurar botón
        btnSubmit.classList.remove('loading');
        btnSubmit.disabled = false;
    }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando registro de vehículos...');
    mostrarUsuarioAutenticado();
    
    // Event listeners
    form.addEventListener('submit', guardarVehiculo);
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
});
