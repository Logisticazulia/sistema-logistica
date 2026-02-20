/**
* MODIFICAR VEHÍCULOS - PLANILLA
* VERSIÓN CORREGIDA CON BÚSQUEDA INSENSIBLE A MAYÚSCULAS/MINÚSCULAS
*/

// ================= CONFIGURACIÓN =================
const SUPABASE_URL = window.SUPABASE_URL;
const SUPABASE_KEY = window.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Error: Configuración de Supabase no encontrada');
    alert('Error de configuración. Contacte al administrador.');
}

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= REFERENCIAS AL DOM =================
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

// ================= ESTADO =================
let isEditing = false;
let vehicleData = null;

// ================= FUNCIONES DE UTILIDAD =================

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
    // Ocultar todas las alertas
    if (alertSuccess) alertSuccess.style.display = 'none';
    if (alertError) alertError.style.display = 'none';
    if (alertInfo) alertInfo.style.display = 'none';
    
    // Mostrar la correspondiente
    if (type === 'success' && alertSuccess) {
        if (successMessage) successMessage.textContent = message;
        alertSuccess.style.display = 'flex';
        setTimeout(() => {
            alertSuccess.style.display = 'none';
        }, 5000);
    } else if (type === 'error' && alertError) {
        if (errorMessage) errorMessage.textContent = message;
        alertError.style.display = 'flex';
    } else if (type === 'info' && alertInfo) {
        if (infoMessage) infoMessage.textContent = message;
        alertInfo.style.display = 'flex';
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleFormFields(enable) {
    const fields = form.querySelectorAll('.form-input, .form-select, .form-textarea');
    fields.forEach(field => {
        if (field.id !== 'vehicleId') {
            field.disabled = !enable;
        }
    });
    
    if (btnCancel) btnCancel.disabled = !enable;
    if (btnEdit) btnEdit.style.display = enable ? 'none' : 'flex';
    if (btnSubmit) btnSubmit.style.display = enable ? 'flex' : 'none';
    
    form.classList.toggle('form-disabled', !enable);
    isEditing = enable;
}

function cargarDatosVehiculo(vehiculo) {
    if (!vehiculo) {
        console.error('❌ No hay datos de vehículo para cargar');
        return;
    }
    
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
                if (!isNaN(fecha.getTime())) {
                    input.value = fecha.toISOString().split('T')[0];
                }
            } else {
                input.value = vehiculo[campo];
            }
        }
    });
    
    const vehicleIdInput = document.getElementById('vehicleId');
    if (vehicleIdInput) {
        vehicleIdInput.value = vehiculo.id;
    }
    
    const placaDisplay = vehiculo.placa || vehiculo.id || 'desconocido';
    showAlert('success', `✅ Vehículo ${placaDisplay} encontrado. Presione "Editar Información" para modificar.`);
}

// ================= FUNCIÓN DE LIMPIEZA DE TEXTO =================
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

// ================= BÚSQUEDA UNIVERSAL (VERSIÓN FINAL CORREGIDA) =================
async function buscarVehiculo() {
    if (!searchUniversal) {
        console.error('❌ Elemento searchUniversal no encontrado');
        showAlert('error', 'Error interno: buscador no disponible');
        return;
    }
    
    // ✅ NORMALIZAR: trim + uppercase (IGUAL que en registrar)
    const searchTerm = searchUniversal.value.trim().toUpperCase();
    
    if (!searchTerm) {
        showAlert('error', '❌ Ingrese Placa, ID, Facsímil o Serial para buscar');
        return;
    }
    
    console.log('🔍 [BUSQUEDA] Iniciando búsqueda...');
    console.log('🔍 [BUSQUEDA] Término:', searchTerm);
    console.log('🔍 [BUSQUEDA] Longitud:', searchTerm.length);
    
    if (btnSearch) {
        btnSearch.classList.add('searching');
        btnSearch.disabled = true;
    }
    
    try {
        // ✅ CONSULTA DIRECTA CON ILIKE (INSENSIBLE A MAYÚSCULAS/MINÚSCULAS)
        let query = supabaseClient
            .from('vehiculos')
            .select('*')
            .limit(20);
        
        // Detectar si es número (ID) o texto
        const esNumero = /^\d+$/.test(searchTerm);
        
        if (esNumero && searchTerm.length <= 5) {
            // ID numérico corto - búsqueda exacta por ID
            console.log('📍 Búsqueda por ID numérico:', searchTerm);
            query = query.eq('id', parseInt(searchTerm));
        } else {
            // ✅ BÚSQUEDA CON ILIKE (PARCIAL E INSENSIBLE)
            console.log('📍 Búsqueda en campos de texto con ILIKE:', searchTerm);
            
            // Construir condición OR para múltiples campos
            const condiciones = [
                `placa.ilike.%${searchTerm}%`,
                `facsimil.ilike.%${searchTerm}%`,
                `s_carroceria.ilike.%${searchTerm}%`,
                `s_motor.ilike.%${searchTerm}%`,
                `n_identificacion.ilike.%${searchTerm}%`
            ];
            
            // Si es número largo, también buscar por ID
            if (esNumero) {
                condiciones.push(`id.eq.${searchTerm}`);
            }
            
            query = query.or(condiciones.join(','));
        }
        
        console.log('📊 Ejecutando consulta a Supabase...');
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ [ERROR SUPABASE] Error en la consulta:', error);
            showAlert('error', 'Error al buscar: ' + error.message);
            return;
        }
        
        console.log('📊 [RESULTADOS] Cantidad encontrada:', data ? data.length : 0);
        
        if (!data || data.length === 0) {
            // ✅ DEBUG: Mostrar últimos registros para comparar
            console.log('⚠️ No se encontraron resultados. Obteniendo últimos registros para debug...');
            const { data: ultimos, error: errorUltimos } = await supabaseClient
                .from('vehiculos')
                .select('id, placa, facsimil, created_at')
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (!errorUltimos && ultimos) {
                console.log('📊 ÚLTIMOS 5 REGISTROS EN BD:', ultimos);
            }
            
            showAlert('error', '❌ Vehículo no encontrado. Verifique los datos e intente nuevamente.');
            return;
        }
        
        // Tomar el primer resultado
        const vehiculo = data[0];
        vehicleData = vehiculo;
        
        console.log('✅ Vehículo encontrado:', vehiculo.placa || vehiculo.id);
        console.log('✅ Datos completos:', vehiculo);
        
        cargarDatosVehiculo(vehiculo);
        
        if (btnEdit) btnEdit.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
        
    } catch (error) {
        console.error('❌ [EXCEPCION] Error en buscarVehiculo:', error);
        showAlert('error', 'Error de conexión: ' + error.message);
    } finally {
        if (btnSearch) {
            btnSearch.classList.remove('searching');
            btnSearch.disabled = false;
        }
    }
}

// ================= VALIDACIÓN =================
function validarFormulario() {
    const camposObligatorios = ['placa', 'marca', 'modelo', 'tipo', 'clase'];
    let isValid = true;
    let mensajeError = '';
    
    camposObligatorios.forEach(campo => {
        const input = document.getElementById(campo);
        if (input && !input.value.trim()) {
            isValid = false;
            input.style.borderColor = '#dc2626';
            const label = input.previousElementSibling;
            const campoNombre = label ? label.textContent.replace('*', '').trim() : campo;
            mensajeError = `El campo "${campoNombre}" es obligatorio`;
        } else if (input) {
            input.style.borderColor = '#e2e8f0';
        }
    });
    
    if (!isValid) {
        showAlert('error', mensajeError);
    }
    
    return isValid;
}

// ================= ACTUALIZACIÓN =================
async function actualizarVehiculo(event) {
    event.preventDefault();
    
    if (!validarFormulario()) {
        return;
    }
    
    const vehicleIdInput = document.getElementById('vehicleId');
    const vehicleId = vehicleIdInput ? vehicleIdInput.value : null;
    
    if (!vehicleId) {
        showAlert('error', 'Error: No se encontró el ID del vehículo');
        return;
    }
    
    if (btnSubmit) {
        btnSubmit.classList.add('loading');
        btnSubmit.disabled = true;
    }
    
    try {
        // ✅ NORMALIZAR DATOS (igual que en registrar)
        const vehiculoActualizado = {
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
            certificado_origen: limpiarTexto(document.getElementById('certificado_origen')?.value),
            fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value || null,
            n_tramite: limpiarTexto(document.getElementById('n_tramite')?.value),
            ubicacion_titulo: limpiarTexto(document.getElementById('ubicacion_titulo')?.value),
            observacion: document.getElementById('observacion')?.value?.trim() || '',
            observacion_extra: document.getElementById('observacion_extra')?.value?.trim() || ''
        };
        
        console.log('📝 Actualizando vehículo ID:', vehicleId);
        console.log('📝 Datos:', vehiculoActualizado);
        
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .update(vehiculoActualizado)
            .eq('id', parseInt(vehicleId))
            .select();
        
        if (error) {
            console.error('❌ Error al actualizar:', error);
            throw error;
        }
        
        console.log('✅ Vehículo actualizado:', data);
        showAlert('success', '✅ Vehículo ' + (vehiculoActualizado.placa || vehicleId) + ' actualizado exitosamente');
        toggleFormFields(false);
        
    } catch (error) {
        console.error('❌ Error en actualizarVehiculo:', error);
        showAlert('error', '❌ Error al actualizar: ' + (error.message || 'Verifique su conexión'));
    } finally {
        if (btnSubmit) {
            btnSubmit.classList.remove('loading');
            btnSubmit.disabled = false;
        }
    }
}

function cancelarEdicion() {
    if (vehicleData) {
        cargarDatosVehiculo(vehicleData);
    }
    toggleFormFields(false);
    showAlert('info', 'Edición cancelada. Los cambios no fueron guardados.');
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando modificación de vehículos...');
    
    // Verificar elementos críticos
    if (!form || !btnSearch || !searchUniversal) {
        console.error('❌ Elementos críticos del DOM no encontrados');
        showAlert('error', 'Error de inicialización. Recargue la página.');
        return;
    }
    
    mostrarUsuarioAutenticado();
    
    // Búsqueda universal
    btnSearch.addEventListener('click', buscarVehiculo);
    searchUniversal.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarVehiculo();
    });
    
    // Edición
    if (btnEdit) {
        btnEdit.addEventListener('click', () => toggleFormFields(true));
        btnEdit.disabled = true;
    }
    
    if (btnCancel) {
        btnCancel.addEventListener('click', cancelarEdicion);
        btnCancel.disabled = true;
    }
    
    // Guardar cambios
    form.addEventListener('submit', actualizarVehiculo);
    
    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    showAlert('info', 'ℹ️ Ingrese Placa, ID, Facsímil o Serial para buscar un vehículo');
    
    console.log('✅ Inicialización completada');
});
