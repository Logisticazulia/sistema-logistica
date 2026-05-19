
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: Configuración de Supabase no encontrada');
    alert('Error de configuración. Contacte al administrador.');
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const form = document.getElementById('vehicleForm');
const btnSubmit = document.getElementById('btnSubmit');
const alertSuccess = document.getElementById('alertSuccess');
const alertError = document.getElementById('alertError');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

const CAMPOS_UNICOS = ['placa', 'facsimil', 's_carroceria', 's_motor', 'n_identificacion'];
const validacionEstado = {
    placa: { valido: true, mensaje: '' },
    facsimil: { valido: true, mensaje: '' },
    s_carroceria: { valido: true, mensaje: '' },
    s_motor: { valido: true, mensaje: '' },
    n_identificacion: { valido: true, mensaje: '' }
};

function limpiarTexto(texto) {
    if (!texto) return '';
    return texto
        .toString()
        .trim()
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s\-\/.]/g, '')
        .trim();
}

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

async function mostrarUsuarioAutenticado() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        if (session?.user?.email) {
            userEmail.textContent = session.user.email;
        } else {
            userEmail.textContent = 'Usuario no autenticado';
        }
    } catch (err) {
        console.error('Error obteniendo sesión:', err);
        userEmail.textContent = 'Error de sesión';
    }
}

async function cerrarSesion() {
    try {
        await supabaseClient.auth.signOut();
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        window.location.href = '../index.html';
    }
}

function showAlert(type, message) {
    if (alertSuccess) alertSuccess.style.display = 'none';
    if (alertError) alertError.style.display = 'none';
    
    if (type === 'success' && alertSuccess) {
        if (successMessage) successMessage.textContent = message;
        alertSuccess.style.display = 'flex';
        setTimeout(() => {
            alertSuccess.style.display = 'none';
        }, 5000);
    } else if (type === 'error' && alertError) {
        if (errorMessage) errorMessage.textContent = message;
        alertError.style.display = 'flex';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validarFormulario() {
    const camposObligatorios = ['s_carroceria', 'marca', 'modelo', 'tipo', 'clase', 'situacion', 'estatus'];
    let isValid = true;
    let mensajeError = '';
    
    camposObligatorios.forEach(campo => {
        const input = document.getElementById(campo);
        if (!input.value.trim()) {
            isValid = false;
            input.style.borderColor = '#dc2626';
            mensajeError = `El campo "${input.previousElementSibling.textContent.replace('*', '').replace('(opcional)', '')}" es obligatorio`;
        } else {
            input.style.borderColor = '#ddd';
        }
    });
    
    if (!isValid) {
        showAlert('error', mensajeError);
    }
    return isValid;
}
async function validarCampoUnico(campo, valor) {
    const input = document.getElementById(campo);
    if (!input) return true;
    
    const formGroup = input.closest('.form-group');
    
    if (formGroup) {
        formGroup.classList.remove('error', 'success');
    }
    input.style.borderColor = '#e2e8f0';
    
    if (!valor || valor.trim() === '') {
        validacionEstado[campo] = { valido: true, mensaje: '' };
        return true;
    }
    
    input.classList.add('loading');
    
    try {

        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('id')
            .ilike(campo, `%${valor.trim()}%`)
            .limit(1);
        
        input.classList.remove('loading');
        
        if (error) {
            throw error;
        }
        
        if (data && data.length > 0) {
     
            validacionEstado[campo] = {
                valido: false,
                mensaje: `⚠️ Este ${campo.replace('_', ' ')} ya está registrado`
            };
            input.style.borderColor = '#dc2626';
            if (formGroup) formGroup.classList.add('error');
            mostrarMensajeErrorCampo(campo, validacionEstado[campo].mensaje);
            return false;
        } else {
     
            validacionEstado[campo] = { valido: true, mensaje: '' };
            input.style.borderColor = '#059669';
            if (formGroup) formGroup.classList.add('success');
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
        return true;
    }
}

function mostrarMensajeErrorCampo(campo, mensaje) {
    const input = document.getElementById(campo);
    if (!input) return;
    
    const formGroup = input.closest('.form-group');
    if (!formGroup) return;
    
    eliminarMensajeErrorCampo(campo);
    
    const mensajeElement = document.createElement('small');
    mensajeElement.id = `error-${campo}`;
    mensajeElement.className = 'field-error-message';
    mensajeElement.style.color = '#dc2626';
    mensajeElement.style.fontSize = '0.75rem';
    mensajeElement.style.marginTop = '4px';
    mensajeElement.textContent = mensaje;
    formGroup.appendChild(mensajeElement);
}

function eliminarMensajeErrorCampo(campo) {
    const existingError = document.getElementById(`error-${campo}`);
    if (existingError) {
        existingError.remove();
    }
}

async function validarTodosCamposUnicos() {
    let todosValidos = true;
    
    for (const campo of CAMPOS_UNICOS) {
        const input = document.getElementById(campo);
        const valor = input.value.trim().toUpperCase();
        
        // 🔹 Solo validar si el usuario ingresó un valor
        if (valor) {
            const esValido = await validarCampoUnico(campo, valor);
            if (!esValido) {
                todosValidos = false;
            }
        }
    }
    return todosValidos;
}

async function guardarVehiculo(event) {
    event.preventDefault();
    
    if (!validarFormulario()) {
        return;
    }
    
    const camposUnicosValidos = await validarTodosCamposUnicos();
    if (!camposUnicosValidos) {
        showAlert('error', '❌ Hay campos duplicados. Por favor corríjalos antes de guardar.');
        return;
    }
    
    if (btnSubmit) {
        btnSubmit.classList.add('loading');
        btnSubmit.disabled = true;
    }
    
    try {
      
        const vehiculo = {
            placa: limpiarTexto(document.getElementById('placa')?.value),
            facsimil: limpiarTexto(document.getElementById('facsimil')?.value),
            n_identificacion: limpiarTexto(document.getElementById('n_identificacion')?.value),
            marca: limpiarTexto(document.getElementById('marca')?.value),
            modelo: limpiarTexto(document.getElementById('modelo')?.value),
            tipo: limpiarTexto(document.getElementById('tipo')?.value),
            clase: limpiarTexto(document.getElementById('clase')?.value),
            ano: document.getElementById('ano')?.value ? parseInt(document.getElementById('ano').value) : null,
            color: limpiarTexto(document.getElementById('color')?.value),
            s_carroceria: limpiarTexto(document.getElementById('s_carroceria')?.value),
            s_motor: limpiarTexto(document.getElementById('s_motor')?.value),
            situacion: limpiarTexto(document.getElementById('situacion')?.value),
            estatus: limpiarTexto(document.getElementById('estatus')?.value),
            unidad_administrativa: limpiarTexto(document.getElementById('unidad_administrativa')?.value),
            ubicacion_fisica: limpiarTexto(document.getElementById('ubicacion_fisica')?.value),
            asignacion: limpiarTexto(document.getElementById('asignacion')?.value),
            redip: limpiarTexto(document.getElementById('redip')?.value),
            ccpe: limpiarTexto(document.getElementById('ccpe')?.value),
            epm: limpiarTexto(document.getElementById('epm')?.value),
            epp: limpiarTexto(document.getElementById('epp')?.value),
             cuadrante: limpiarTexto(document.getElementById('cuadrante')?.value),
  comuna: limpiarTexto(document.getElementById('comuna')?.value),
            certificado_origen: limpiarTexto(document.getElementById('certificado_origen')?.value),
            fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value || null,
            n_tramite: limpiarTexto(document.getElementById('n_tramite')?.value),
            ubicacion_titulo: limpiarTexto(document.getElementById('ubicacion_titulo')?.value),
            observacion: document.getElementById('observacion')?.value?.trim() || '',
            observacion_extra: document.getElementById('observacion_extra')?.value?.trim() || ''
        };
        
        console.log('📝 Guardando vehículo:', vehiculo);
        
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .insert([vehiculo])
            .select();
        
        if (error) {
            console.error('❌ Error al guardar:', error);
            
            if (error.code === '23505' || error.message.includes('duplicate')) {
                showAlert('error', '❌ Error: Ya existe un vehículo con estos datos únicos.');
            } else {
                throw error;
            }
            return;
        }
        
        console.log('✅ Vehículo guardado:', data);
        showAlert('success', '✅ Vehículo registrado exitosamente con Placa: ' + vehiculo.placa);
        
        if (form) form.reset();
        
        CAMPOS_UNICOS.forEach(campo => {
            const input = document.getElementById(campo);
            if (input) {
                const formGroup = input.closest('.form-group');
                input.style.borderColor = '#e2e8f0';
                if (formGroup) formGroup.classList.remove('error', 'success');
                eliminarMensajeErrorCampo(campo);
                validacionEstado[campo] = { valido: true, mensaje: '' };
            }
        });
        
    } catch (error) {
        console.error('❌ Error en guardarVehiculo:', error);
        showAlert('error', '❌ Error al guardar: ' + (error.message || 'Verifique su conexión'));
    } finally {
        if (btnSubmit) {
            btnSubmit.classList.remove('loading');
            btnSubmit.disabled = false;
        }
    }
}

function inicializarValidacionTiempoReal() {
    CAMPOS_UNICOS.forEach(campo => {
        const input = document.getElementById(campo);
        if (input) {
        
            input.addEventListener('blur', () => {
                const valor = limpiarTexto(input.value);
                if (valor) {
                    validarCampoUnico(campo, valor);
                }
            });
            
            input.addEventListener('input', debounce(() => {
                const valor = limpiarTexto(input.value);
                if (valor && valor.length >= 3) {
                    validarCampoUnico(campo, valor);
                }
            }, 500));
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando registro de vehículos...');
    if (!form || !btnSubmit) {
        console.error('❌ Elementos críticos del DOM no encontrados');
        showAlert('error', 'Error de inicialización. Recargue la página.');
        return;
    }

    mostrarUsuarioAutenticado();
    inicializarValidacionTiempoReal();

    // 🚫 BLOQUEAR ENVÍO CON TECLA ENTER EN TODO EL FORMULARIO
    form.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Cancela el envío automático al presionar Enter
        }
    });

    // ✅ EL GUARDADO SOLO SE EJECUTA AL HACER CLIC EN EL BOTÓN
    form.addEventListener('submit', guardarVehiculo);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    console.log('✅ Inicialización completada');
});
// ================= LÓGICA DE EXCLUSIVIDAD MUTUA =================
const unidadAdminSelect = document.getElementById('unidad_administrativa');
const epmSelect = document.getElementById('epm');
const eppSelect = document.getElementById('epp');

function toggleExclusiveFields(source) {
    if (source === 'unidad') {
        // Si se selecciona Unidad Administrativa → bloquear EPM y EPP
        if (epmSelect) {
            epmSelect.disabled = true;
            epmSelect.value = '';
            epmSelect.style.opacity = '0.6';
            epmSelect.style.cursor = 'not-allowed';
        }
        if (eppSelect) {
            eppSelect.disabled = true;
            eppSelect.value = '';
            eppSelect.style.opacity = '0.6';
            eppSelect.style.cursor = 'not-allowed';
        }
    } else if (source === 'epm' || source === 'epp') {
        // Si se selecciona EPM o EPP → bloquear Unidad Administrativa
        if (unidadAdminSelect) {
            unidadAdminSelect.disabled = true;
            unidadAdminSelect.value = '';
            unidadAdminSelect.style.opacity = '0.6';
            unidadAdminSelect.style.cursor = 'not-allowed';
        }
    }
}

function resetExclusiveFields() {
    // Restaurar todos los campos si se deselecciona la opción activa
    if (unidadAdminSelect && !unidadAdminSelect.value) {
        if (epmSelect) {
            epmSelect.disabled = false;
            epmSelect.style.opacity = '1';
            epmSelect.style.cursor = 'pointer';
        }
        if (eppSelect) {
            eppSelect.disabled = false;
            eppSelect.style.opacity = '1';
            eppSelect.style.cursor = 'pointer';
        }
    }
    if (epmSelect && !epmSelect.value && eppSelect && !eppSelect.value) {
        if (unidadAdminSelect) {
            unidadAdminSelect.disabled = false;
            unidadAdminSelect.style.opacity = '1';
            unidadAdminSelect.style.cursor = 'pointer';
        }
    }
}

// Event listeners para exclusividad
if (unidadAdminSelect) {
    unidadAdminSelect.addEventListener('change', function() {
        if (this.value) {
            toggleExclusiveFields('unidad');
        } else {
            resetExclusiveFields();
        }
    });
}

if (epmSelect) {
    epmSelect.addEventListener('change', function() {
        if (this.value) {
            toggleExclusiveFields('epm');
        } else {
            resetExclusiveFields();
        }
    });
}

if (eppSelect) {
    eppSelect.addEventListener('change', function() {
        if (this.value) {
            toggleExclusiveFields('epp');
        } else {
            resetExclusiveFields();
        }
    });
}

// Resetear al cargar si hay valores previos (para edición)
document.addEventListener('DOMContentLoaded', () => {
    // ... tu código existente ...
    
    // Aplicar estado inicial si hay valores preseleccionados
    if (unidadAdminSelect?.value) toggleExclusiveFields('unidad');
    else if (epmSelect?.value || eppSelect?.value) toggleExclusiveFields('epm');
});
