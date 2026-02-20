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

// Campos que deben ser únicos
const CAMPOS_UNICOS = ['placa', 'facsimil', 's_carroceria', 's_motor', 'n_identificacion'];

// Estado de validación
const validacionEstado = {
    placa: { valido: true, mensaje: '' },
    facsimil: { valido: true, mensaje: '' },
    s_carroceria: { valido: true, mensaje: '' },
    s_motor: { valido: true, mensaje: '' },
    n_identificacion: { valido: true, mensaje: '' }
};

// Debounce para evitar consultas excesivas
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Mostrar usuario autenticado
async function mostrarUsuarioAutenticado() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (session?.user?.email) {
            // ✅ Muestra el email completo con @gmail.com
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Validar formulario (campos obligatorios)
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

// Validar campos únicos en tiempo real
async function validarCampoUnico(campo, valor) {
    const input = document.getElementById(campo);
    const formGroup = input.closest('.form-group');
    
    // Limpiar estados previos
    formGroup.classList.remove('error', 'success');
    input.style.borderColor = '#e2e8f0';
    
    // Si el campo está vacío, no validar
    if (!valor || valor.trim() === '') {
        validacionEstado[campo] = { valido: true, mensaje: '' };
        return true;
    }
    
    // Mostrar indicador de carga
    input.classList.add('loading');
    
    try {
        // Consultar si ya existe en la base de datos
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('id')
            .eq(campo, valor.trim().toUpperCase())
            .limit(1);
        
        input.classList.remove('loading');
        
        if (error) {
            throw error;
        }
        
        if (data && data.length > 0) {
            // Campo duplicado
            validacionEstado[campo] = { 
                valido: false, 
                mensaje: `⚠️ Este ${campo.replace('_', ' ')} ya está registrado` 
            };
            input.style.borderColor = '#dc2626';
            formGroup.classList.add('error');
            mostrarMensajeErrorCampo(campo, validacionEstado[campo].mensaje);
            return false;
        } else {
            // Campo único
            validacionEstado[campo] = { valido: true, mensaje: '' };
            input.style.borderColor = '#059669';
            formGroup.classList.add('success');
            eliminarMensajeErrorCampo(campo);
            return true;
        }
    } catch (error) {
        console.error(`Error validando ${campo}:`, error);
        input.classList.remove('loading');
        validacionEstado[campo] = { 
            valido: true, 
            mensaje: 'Error de conexión, se validará al guardar' 
        };
        input.style.borderColor = '#e2e8f0';
        return true; // Permitir continuar en caso de error de conexión
    }
}

// Mostrar mensaje de error debajo del campo
function mostrarMensajeErrorCampo(campo, mensaje) {
    const input = document.getElementById(campo);
    const formGroup = input.closest('.form-group');
    
    // Eliminar mensaje existente si hay
    eliminarMensajeErrorCampo(campo);
    
    // Crear elemento de mensaje
    const mensajeElement = document.createElement('small');
    mensajeElement.id = `error-${campo}`;
    mensajeElement.className = 'field-error-message';
    mensajeElement.style.color = '#dc2626';
    mensajeElement.style.fontSize = '0.75rem';
    mensajeElement.style.marginTop = '4px';
    mensajeElement.textContent = mensaje;
    
    formGroup.appendChild(mensajeElement);
}

// Eliminar mensaje de error del campo
function eliminarMensajeErrorCampo(campo) {
    const existingError = document.getElementById(`error-${campo}`);
    if (existingError) {
        existingError.remove();
    }
}

// Validar todos los campos únicos antes de guardar
async function validarTodosCamposUnicos() {
    let todosValidos = true;
    
    for (const campo of CAMPOS_UNICOS) {
        const input = document.getElementById(campo);
        const valor = input.value.trim().toUpperCase();
        
        if (valor) {
            const esValido = await validarCampoUnico(campo, valor);
            if (!esValido) {
                todosValidos = false;
            }
        }
    }
    
    return todosValidos;
}

// Guardar vehículo
async function guardarVehiculo(event) {
    event.preventDefault();
    
    if (!validarFormulario()) {
        return;
    }
    
    // Validar campos únicos antes de guardar
    const camposUnicosValidos = await validarTodosCamposUnicos();
    if (!camposUnicosValidos) {
        showAlert('error', '❌ Hay campos duplicados. Por favor corríjalos antes de guardar.');
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
            asignacion: document.getElementById('asignacion').value || null,
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
            
            // Verificar si es error de duplicado a nivel de base de datos
            if (error.code === '23505' || error.message.includes('duplicate')) {
                showAlert('error', '❌ Error: Ya existe un vehículo con estos datos únicos.');
            } else {
                throw error;
            }
            return;
        }
        
        console.log('Vehículo guardado:', data);
        showAlert('success', '✅ Vehículo registrado exitosamente con Placa: ' + vehiculo.placa);
        
        // Limpiar formulario
        form.reset();
        
        // Limpiar estados de validación
        CAMPOS_UNICOS.forEach(campo => {
            const input = document.getElementById(campo);
            const formGroup = input.closest('.form-group');
            input.style.borderColor = '#e2e8f0';
            formGroup.classList.remove('error', 'success');
            eliminarMensajeErrorCampo(campo);
            validacionEstado[campo] = { valido: true, mensaje: '' };
        });
        
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

// Inicializar validación en tiempo real
function inicializarValidacionTiempoReal() {
    CAMPOS_UNICOS.forEach(campo => {
        const input = document.getElementById(campo);
        if (input) {
            // Validar cuando el usuario deja el campo (blur)
            input.addEventListener('blur', () => {
                const valor = input.value.trim().toUpperCase();
                if (valor) {
                    validarCampoUnico(campo, valor);
                }
            });
            
            // Validar mientras escribe (con debounce)
            input.addEventListener('input', debounce(() => {
                const valor = input.value.trim().toUpperCase();
                if (valor && valor.length >= 3) { // Mínimo 3 caracteres para validar
                    validarCampoUnico(campo, valor);
                }
            }, 500));
        }
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Inicializando registro de vehículos...');
    mostrarUsuarioAutenticado();
    inicializarValidacionTiempoReal();
    
    // Event listeners
    form.addEventListener('submit', guardarVehiculo);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
});
