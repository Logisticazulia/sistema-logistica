/**
 * ========================================
 * CREAR ACTA DE ASIGNACIÓN DE VEHÍCULOS
 * ========================================
 */

// ========================================
// VARIABLES GLOBALES
// ========================================
let supabaseClient = null;
let vehiculoSeleccionado = null;

// ========================================
// INICIALIZACIÓN
// ========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando creación de acta...');
    
    // 1. Inicializar Supabase
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase no está cargado');
        return;
    }
    
    supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_KEY
    );
    
    // 2. Cargar usuario
    await cargarUsuario();
    
    // 3. Configurar botones
    configurarBotones();
    
    // 4. Configurar búsqueda con Enter
    configurarBusquedaEnter();
    
    console.log('✅ Creación de acta inicializada');
});

// ========================================
// FUNCIONES DE AUTENTICACIÓN
// ========================================
async function cargarUsuario() {
    try {
        const sessionData = await supabaseClient.auth.getSession();
        const session = sessionData.data ? sessionData.data.session : null;
        
        const userEmail = document.getElementById('userEmail');
        if (session && session.user && session.user.email) {
            const email = session.user.email;
            const nombreMostrar = email.length > 25 
                ? email.split('@')[0].substring(0, 22) + '...' 
                : email;
            userEmail.textContent = nombreMostrar;
        }
    } catch (err) {
        console.error('Error cargando usuario:', err);
    }
}

// ========================================
// CONFIGURACIÓN DE BOTONES
// ========================================
function configurarBotones() {
    // Botón Buscar
    const btnBuscar = document.getElementById('btnBuscar');
    if (btnBuscar) {
        btnBuscar.addEventListener('click', buscarVehiculo);
    }
    
    // Botón Limpiar
    const btnLimpiar = document.getElementById('btnLimpiar');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarBusqueda);
    }
    
    // Botón Guardar
    const btnGuardar = document.getElementById('btnGuardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarActa);
    }
    
    // Botón Imprimir
    const btnImprimir = document.getElementById('btnImprimir');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', imprimirActa);
    }
    
    // Botón Cancelar
    const btnCancelar = document.getElementById('btnCancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            window.location.href = 'acta.html';
        });
    }
}

function configurarBusquedaEnter() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarVehiculo();
            }
        });
    }
}

// ========================================
// FUNCIONES DE BÚSQUEDA
// ========================================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
        return;
    }
    
    const searchTerm = searchInput.value.trim().toUpperCase();
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando vehículo:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    try {
        // 🔹 BÚSQUEDA POR 5 CAMPOS: placa, facsimil, s_carroceria, s_motor, n_identificacion
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq.${searchTerm},facsimil.eq.${searchTerm},s_carroceria.eq.${searchTerm},s_motor.eq.${searchTerm},n_identificacion.eq.${searchTerm}`)
            .limit(1);
        
        if (error) {
            console.error('❌ Error en Supabase:', error);
            mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
            return;
        }
        
        if (!data || data.length === 0) {
            mostrarAlerta('❌ No se encontró ningún vehículo con: ' + searchTerm, 'error');
            vehiculoSeleccionado = null;
            limpiarFormularioVehiculo();
            document.getElementById('actaPreview').style.display = 'none';
            return;
        }
        
        vehiculoSeleccionado = data[0];
        console.log('✅ Vehículo encontrado:', vehiculoSeleccionado);
        
        // Llenar formulario con datos del vehículo
        llenarFormularioVehiculo(vehiculoSeleccionado);
        
        // Actualizar vista previa
        actualizarVistaPrevia();
        
        // Mostrar vista previa
        document.getElementById('actaPreview').style.display = 'block';
        
        mostrarAlerta('✅ Vehículo encontrado: ' + (vehiculoSeleccionado.marca || '') + ' ' + (vehiculoSeleccionado.modelo || '') + ' - Placa: ' + (vehiculoSeleccionado.placa || 'N/A'), 'success');
        
        // Scroll hacia la vista previa
        setTimeout(function() {
            document.getElementById('actaPreview').scrollIntoView({ 
                behavior: 'smooth',
                block: 'start'
            });
        }, 300);
        
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    }
}

function llenarFormularioVehiculo(vehiculo) {
    // Campos del vehículo
    document.getElementById('marca').value = vehiculo.marca || '';
    document.getElementById('modelo').value = vehiculo.modelo || '';
    document.getElementById('tipo').value = vehiculo.tipo || '';
    document.getElementById('clase').value = vehiculo.clase || '';
    document.getElementById('serialCarroceria').value = vehiculo.s_carroceria || '';
    document.getElementById('serialMotor').value = vehiculo.s_motor || '';
    document.getElementById('placa').value = vehiculo.placa || '';
    document.getElementById('facsimil').value = vehiculo.facsimil || '';
}

function limpiarFormularioVehiculo() {
    document.getElementById('marca').value = '';
    document.getElementById('modelo').value = '';
    document.getElementById('tipo').value = '';
    document.getElementById('clase').value = '';
    document.getElementById('serialCarroceria').value = '';
    document.getElementById('serialMotor').value = '';
    document.getElementById('placa').value = '';
    document.getElementById('facsimil').value = '';
}

function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    vehiculoSeleccionado = null;
    limpiarFormularioVehiculo();
    
    // Limpiar campos de funcionario
    document.getElementById('funcionarioNombre').value = '';
    document.getElementById('funcionarioCedula').value = '';
    document.getElementById('unidadAsignacion').value = '';
    document.getElementById('funcionarioCargo').value = '';
    
    // Ocultar vista previa
    document.getElementById('actaPreview').style.display = 'none';
}

// ========================================
// FUNCIONES DE VISTA PREVIA
// ========================================
function actualizarVistaPrevia() {
    if (!vehiculoSeleccionado) return;
    
    // Datos del vehículo
    document.getElementById('previewMarcaModelo').textContent = 
        (vehiculoSeleccionado.marca || '') + ' ' + (vehiculoSeleccionado.modelo || '');
    document.getElementById('previewSerialCarroceria').textContent = 
        vehiculoSeleccionado.s_carroceria || 'N/P';
    document.getElementById('previewSerialMotor').textContent = 
        vehiculoSeleccionado.s_motor || 'N/P';
    document.getElementById('previewPlaca').textContent = 
        vehiculoSeleccionado.placa || 'N/P';
    document.getElementById('previewFacsimil').textContent = 
        vehiculoSeleccionado.facsimil || 'N/P';
    
    // Datos del funcionario
    const funcionarioNombre = document.getElementById('funcionarioNombre').value || '-';
    const funcionarioCedula = document.getElementById('funcionarioCedula').value || '-';
    const unidadAsignacion = document.getElementById('unidadAsignacion').value || '-';
    
    document.getElementById('previewFuncionarioNombre').textContent = funcionarioNombre;
    document.getElementById('previewFuncionarioCedula').textContent = funcionarioCedula;
    document.getElementById('previewUnidadAsignacion').textContent = unidadAsignacion;
    document.getElementById('previewFirmaFuncionario').innerHTML = 
        funcionarioNombre + '<br>Cédula de Identidad numero ' + funcionarioCedula;
    
    // Fecha actual
    const fecha = new Date();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    document.getElementById('previewDia').textContent = fecha.getDate();
    document.getElementById('previewMes').textContent = meses[fecha.getMonth()];
    document.getElementById('previewAnio').textContent = fecha.getFullYear();
}

// ========================================
// FUNCIONES DE GUARDADO
// ========================================
async function guardarActa() {
    if (!vehiculoSeleccionado) {
        mostrarAlerta('⚠️ Primero debe buscar un vehículo', 'error');
        return;
    }
    
    // Validar campos de funcionario
    const funcionarioNombre = document.getElementById('funcionarioNombre').value.trim();
    const funcionarioCedula = document.getElementById('funcionarioCedula').value.trim();
    const unidadAsignacion = document.getElementById('unidadAsignacion').value.trim();
    
    if (!funcionarioNombre || !funcionarioCedula || !unidadAsignacion) {
        mostrarAlerta('⚠️ Complete todos los campos del funcionario', 'error');
        return;
    }
    
    const btnGuardar = document.getElementById('btnGuardar');
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.textContent = '⏳ Guardando...';
    }
    
    try {
        const acta = {
            vehiculo_id: vehiculoSeleccionado.id,
            placa: vehiculoSeleccionado.placa,
            facsimil: vehiculoSeleccionado.facsimil,
            s_carroceria: vehiculoSeleccionado.s_carroceria,
            s_motor: vehiculoSeleccionado.s_motor,
            marca: vehiculoSeleccionado.marca,
            modelo: vehiculoSeleccionado.modelo,
            tipo: vehiculoSeleccionado.tipo,
            clase: vehiculoSeleccionado.clase,
            funcionario_nombre: funcionarioNombre,
            funcionario_cedula: funcionarioCedula,
            unidad_asignacion: unidadAsignacion,
            funcionario_cargo: document.getElementById('funcionarioCargo').value.trim(),
            fecha_asignacion: new Date().toISOString(),
            estatus: 'ACTIVA',
            creado_por: document.getElementById('userEmail').textContent
        };
        
        console.log('📝 Guardando acta:', acta);
        
        const { data, error } = await supabaseClient
            .from('actas_asignacion')
            .insert([acta])
            .select();
        
        if (error) {
            console.error('❌ Error al guardar:', error);
            mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Acta guardada:', data);
        mostrarAlerta('✅ Acta de asignación guardada exitosamente', 'success');
        
        // Limpiar formulario después de guardar
        setTimeout(function() {
            if (confirm('¿Desea crear otra acta?')) {
                limpiarBusqueda();
            } else {
                window.location.href = 'acta.html';
            }
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error en guardarActa:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    } finally {
        const btnGuardar = document.getElementById('btnGuardar');
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<span>💾</span> Guardar Acta';
        }
    }
}

// ========================================
// FUNCIONES DE IMPRESIÓN
// ========================================
function imprimirActa() {
    if (!vehiculoSeleccionado) {
        mostrarAlerta('⚠️ Primero debe buscar un vehículo', 'error');
        return;
    }
    
    window.print();
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================
function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    
    setTimeout(function() {
        alertDiv.style.display = 'none';
    }, 5000);
}

console.log('✅ Script acta-crear.js cargado correctamente');
