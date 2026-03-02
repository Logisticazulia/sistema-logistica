/**
 * acta-crear.js
 * Módulo para crear Actas de Asignación de Vehículos
 * Sistema de Logística - CCPE ZULIA
 */

// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================
let currentVehicle = null;
let supabase = null;
let currentUser = null;

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar Supabase
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        await verificarSesion();
    }
    
    // Configurar eventos del formulario
    configurarEventos();
    
    // Establecer fecha actual en la vista previa
    establecerFechaActual();
    
    // Cargar datos de vehículos desde CSV si está disponible
    cargarDatosVehiculos();
});

// ============================================
// AUTENTICACIÓN
// ============================================
async function verificarSesion() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session) {
            window.location.href = '../login.html';
            return;
        }
        
        currentUser = session.user;
        document.getElementById('userEmail').textContent = currentUser.email || 'Usuario';
        
    } catch (error) {
        console.error('Error verificando sesión:', error);
        mostrarAlerta('searchAlert', 'Error de autenticación. Por favor, inicie sesión nuevamente.', 'error');
        window.location.href = '../login.html';
    }
}

async function cerrarSesion() {
    try {
        await supabase.auth.signOut();
        window.location.href = '../login.html';
    } catch (error) {
        console.error('Error cerrando sesión:', error);
    }
}

// ============================================
// CONFIGURACIÓN DE EVENTOS
// ============================================
function configurarEventos() {
    // Botón de logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    // Input de búsqueda con Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarVehiculo();
            }
        });
        
        // Búsqueda en tiempo real (debounce)
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (e.target.value.length >= 3) {
                    buscarVehiculo();
                }
            }, 300);
        });
    }
    
    // Actualizar vista previa cuando cambian los datos del funcionario
    const funcionarioFields = ['funcionarioNombre', 'funcionarioCedula', 'unidadAsignacion', 'funcionarioCargo'];
    funcionarioFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', actualizarVistaPreviaFuncionario);
        }
    });
}

// ============================================
// CARGA DE DATOS DE VEHÍCULOS
// ============================================
let vehiclesData = [];

async function cargarDatosVehiculos() {
    try {
        // Intentar cargar desde Supabase primero
        if (supabase) {
            const { data, error } = await supabase
                .from('vehiculos')
                .select('*')
                .limit(1000);
            
            if (!error && data) {
                vehiclesData = data;
                console.log(`✓ Cargados ${vehiclesData.length} vehículos desde Supabase`);
                return;
            }
        }
        
        // Fallback: cargar desde CSV embebido o archivo local
        // Nota: En producción, esto debería ser una API endpoint
        console.log('ℹ Usando datos de vehículos del knowledge base');
        
    } catch (error) {
        console.error('Error cargando vehículos:', error);
    }
}

// ============================================
// BÚSQUEDA DE VEHÍCULOS
// ============================================
async function buscarVehiculo() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const alertBox = document.getElementById('searchAlert');
    
    if (!searchTerm || searchTerm.length < 2) {
        mostrarAlerta(alertBox, 'Ingrese al menos 2 caracteres para buscar', 'error');
        return;
    }
    
    try {
        mostrarLoading(true);
        
        let vehicle = null;
        
        // Búsqueda en datos locales cargados
        if (vehiclesData.length > 0) {
            vehicle = vehiclesData.find(v => {
                const placa = (v.placa || '').toLowerCase();
                const facsimil = (v.facsimil || '').toLowerCase();
                const sCarroceria = (v.s_carroceria || '').toLowerCase();
                const sMotor = (v.s_motor || '').toLowerCase();
                const marcaModelo = `${v.marca || ''} ${v.modelo || ''}`.toLowerCase();
                
                return placa.includes(searchTerm) ||
                       facsimil.includes(searchTerm) ||
                       sCarroceria.includes(searchTerm) ||
                       sMotor.includes(searchTerm) ||
                       marcaModelo.includes(searchTerm);
            });
        }
        
        // Si no se encontró en local, buscar en Supabase
        if (!vehicle && supabase) {
            const { data, error } = await supabase
                .from('vehiculos')
                .select('*')
                .or(`placa.ilike.%${searchTerm}%,facsimil.ilike.%${searchTerm}%,s_carroceria.ilike.%${searchTerm}%,s_motor.ilike.%${searchTerm}%,marca.ilike.%${searchTerm}%,modelo.ilike.%${searchTerm}%`)
                .limit(1);
            
            if (!error && data && data.length > 0) {
                vehicle = data[0];
                // Actualizar cache local
                if (!vehiclesData.find(v => v.id === vehicle.id)) {
                    vehiclesData.push(vehicle);
                }
            }
        }
        
        if (vehicle) {
            currentVehicle = vehicle;
            mostrarAlerta(alertBox, `✓ Vehículo encontrado: ${vehicle.marca} ${vehicle.modelo}`, 'success');
            poblarVistaPreviaVehiculo(vehicle);
            resaltarVehiculoEncontrado();
        } else {
            currentVehicle = null;
            mostrarAlerta(alertBox, '⚠ No se encontró ningún vehículo con los criterios de búsqueda', 'error');
            limpiarVistaPreviaVehiculo();
        }
        
    } catch (error) {
        console.error('Error en búsqueda:', error);
        mostrarAlerta(alertBox, 'Error al buscar vehículo. Intente nuevamente.', 'error');
    } finally {
        mostrarLoading(false);
    }
}

function resaltarVehiculoEncontrado() {
    const previewSection = document.querySelector('.preview-section');
    if (previewSection) {
        previewSection.style.borderColor = '#2a9d8f';
        previewSection.style.boxShadow = '0 0 0 3px rgba(42, 157, 143, 0.3)';
        setTimeout(() => {
            previewSection.style.borderColor = '';
            previewSection.style.boxShadow = '';
        }, 2000);
    }
}

// ============================================
// POBLAR VISTA PREVIA
// ============================================
function poblarVistaPreviaVehiculo(vehicle) {
    // Datos del vehículo
    const marcaModelo = `${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim();
    document.getElementById('previewMarcaModelo').textContent = marcaModelo || 'N/D';
    document.getElementById('previewSerialCarroceria').textContent = vehicle.s_carroceria || 'N/D';
    document.getElementById('previewSerialMotor').textContent = vehicle.s_motor || 'N/D';
    document.getElementById('previewPlaca').textContent = vehicle.placa || 'N/P';
    document.getElementById('previewFacsimil').textContent = vehicle.facsimil || 'N/P';
    
    // Actualizar también desde el formulario si hay datos
    actualizarVistaPreviaFuncionario();
}

function limpiarVistaPreviaVehiculo() {
    document.getElementById('previewMarcaModelo').textContent = 'SINOTRUK BOLDEN';
    document.getElementById('previewSerialCarroceria').textContent = 'LZZWAZG43TT500886';
    document.getElementById('previewSerialMotor').textContent = 'WP2H180A087255008054';
    document.getElementById('previewPlaca').textContent = 'N/P';
    document.getElementById('previewFacsimil').textContent = 'N/P';
}

function actualizarVistaPreviaFuncionario() {
    const nombre = document.getElementById('funcionarioNombre').value.trim();
    const cedula = document.getElementById('funcionarioCedula').value.trim();
    const unidad = document.getElementById('unidadAsignacion').value.trim();
    const cargo = document.getElementById('funcionarioCargo').value.trim();
    
    if (nombre) {
        document.getElementById('previewFuncionarioNombre').textContent = nombre;
        document.getElementById('previewFirmaFuncionario').textContent = nombre.toUpperCase();
    }
    if (cedula) {
        document.getElementById('previewFuncionarioCedula').textContent = cedula;
    }
    if (unidad) {
        document.getElementById('previewUnidadAsignacion').textContent = unidad;
        document.getElementById('previewCargoFuncionario').textContent = `${cargo ? cargo + ' - ' : ''}${unidad}`;
    }
}

function establecerFechaActual() {
    const now = new Date();
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    document.getElementById('previewDia').textContent = now.getDate();
    document.getElementById('previewMes').textContent = meses[now.getMonth()];
    document.getElementById('previewAnio').textContent = now.getFullYear();
}

// ============================================
// UTILIDADES DE UI
// ============================================
function mostrarAlerta(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = `alert alert-${type}`;
    element.style.display = 'block';
    
    // Auto-ocultar después de 5 segundos para mensajes de éxito
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

function mostrarLoading(show) {
    const searchBtn = document.querySelector('.btn-search');
    if (searchBtn) {
        if (show) {
            searchBtn.disabled = true;
            searchBtn.innerHTML = '<span>⏳</span><span>Buscando...</span>';
        } else {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<span>🔍</span><span>Buscar</span>';
        }
    }
}

function validarFormulario() {
    const requiredFields = ['funcionarioNombre', 'funcionarioCedula', 'unidadAsignacion'];
    let isValid = true;
    
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            field.style.borderColor = '#dc2626';
            field.style.boxShadow = '0 0 0 2px rgba(220, 38, 38, 0.1)';
            isValid = false;
        } else if (field) {
            field.style.borderColor = '';
            field.style.boxShadow = '';
        }
    });
    
    if (!currentVehicle) {
        mostrarAlerta(document.getElementById('searchAlert'), 
                     '⚠ Primero debe buscar y seleccionar un vehículo', 'error');
        isValid = false;
    }
    
    return isValid;
}

// ============================================
// IMPRESIÓN DEL ACTA
// ============================================
function imprimirActa() {
    if (!validarFormulario()) {
        mostrarAlerta(document.getElementById('searchAlert'), 
                     'Complete todos los campos requeridos y seleccione un vehículo', 'error');
        return;
    }
    
    // Actualizar última vez la vista previa antes de imprimir
    actualizarVistaPreviaFuncionario();
    
    // Pequeño delay para asegurar que el DOM se actualizó
    setTimeout(() => {
        window.print();
    }, 100);
}

// ============================================
// GUARDAR ACTA EN BASE DE DATOS
// ============================================
async function guardarActa() {
    if (!validarFormulario()) {
        return;
    }
    
    if (!supabase) {
        mostrarAlerta(document.getElementById('searchAlert'), 
                     'Configuración de base de datos no disponible', 'error');
        return;
    }
    
    try {
        mostrarLoading(true);
        
        // Preparar datos del acta
        const actaData = {
            // Datos del vehículo
            vehiculo_id: currentVehicle?.id,
            marca: currentVehicle?.marca,
            modelo: currentVehicle?.modelo,
            serial_carroceria: currentVehicle?.s_carroceria,
            serial_motor: currentVehicle?.s_motor,
            placa: currentVehicle?.placa,
            facsimil: currentVehicle?.facsimil,
            
            // Datos del funcionario
            funcionario_nombre: document.getElementById('funcionarioNombre').value.trim(),
            funcionario_cedula: document.getElementById('funcionarioCedula').value.trim(),
            funcionario_cargo: document.getElementById('funcionarioCargo').value.trim(),
            unidad_asignacion: document.getElementById('unidadAsignacion').value.trim(),
            
            // Metadatos
            fecha_creacion: new Date().toISOString(),
            creado_por: currentUser?.email,
            creado_por_id: currentUser?.id,
            estado: 'activa',
            
            // Fecha del acta (para el documento)
            fecha_acta_dia: document.getElementById('previewDia').textContent,
            fecha_acta_mes: document.getElementById('previewMes').textContent,
            fecha_acta_anio: document.getElementById('previewAnio').textContent,
            
            // Observaciones adicionales
            observaciones: currentVehicle?.observacion || null,
            ubicacion_fisica: currentVehicle?.ubicacion_fisica || null,
            estatus_vehiculo: currentVehicle?.estatus || null
        };
        
        // Insertar en la tabla 'actas_asignacion'
        const { data, error } = await supabase
            .from('actas_asignacion')
            .insert([actaData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Actualizar estado del vehículo si es necesario
        if (currentVehicle?.id) {
            await supabase
                .from('vehiculos')
                .update({ 
                    asignacion: document.getElementById('unidadAsignacion').value.trim(),
                    estatus: 'ASIGNADO',
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentVehicle.id);
        }
        
        mostrarAlerta(document.getElementById('searchAlert'), 
                     `✓ Acta guardada exitosamente. ID: ${data.id}`, 'success');
        
        // Opcional: Generar PDF o confirmar
        if (confirm('¿Desea imprimir el acta ahora?')) {
            imprimirActa();
        }
        
    } catch (error) {
        console.error('Error guardando acta:', error);
        mostrarAlerta(document.getElementById('searchAlert'), 
                     `Error al guardar: ${error.message || 'Verifique la conexión'}`, 'error');
    } finally {
        mostrarLoading(false);
    }
}

// ============================================
// FUNCIONES ADICIONALES DE UTILIDAD
// ============================================

/**
 * Formatea un número de cédula venezolana
 */
function formatarCedula(cedula) {
    if (!cedula) return '';
    // Remover caracteres no numéricos excepto V, E, J, G
    const limpio = cedula.toUpperCase().replace(/[^VEJG\d\-.]/g, '');
    return limpio;
}

/**
 * Obtiene el estado del vehículo en formato legible
 */
function obtenerEstadoLegible(estatus) {
    const estados = {
        'OPERATIVA': '✅ Operativa',
        'INOPERATIVA': '❌ Inoperativa',
        'REPARACION': '🔧 En reparación',
        'TALLER': '🔧 En taller',
        'DESINCORPORADA': '⚠ Desincorporada',
        'DONACION': '🎁 Donación',
        'COMODATO': '🤝 Comodato',
        'PROCESO DE DESINCORPORACIÓN': '⏳ Proceso de desincorporación'
    };
    return estados[estatus?.toUpperCase()] || estatus || 'N/D';
}

/**
 * Exporta el acta como texto plano para respaldo
 */
function exportarActaTexto() {
    if (!currentVehicle) return;
    
    const texto = `
ACTA DE ASIGNACIÓN DE UNIDAD VEHICULAR
========================================

FECHA: ${document.getElementById('previewDia').textContent} de ${document.getElementById('previewMes').textContent} de ${document.getElementById('previewAnio').textContent}

DATOS DEL VEHÍCULO:
- Marca/Modelo: ${document.getElementById('previewMarcaModelo').textContent}
- Serial Carrocería: ${document.getElementById('previewSerialCarroceria').textContent}
- Serial Motor: ${document.getElementById('previewSerialMotor').textContent}
- Placa: ${document.getElementById('previewPlaca').textContent}
- Facsímil: ${document.getElementById('previewFacsimil').textContent}

DATOS DEL FUNCIONARIO:
- Nombre: ${document.getElementById('previewFuncionarioNombre').textContent}
- Cédula: ${document.getElementById('previewFuncionarioCedula').textContent}
- Unidad: ${document.getElementById('previewUnidadAsignacion').textContent}
- Cargo: ${document.getElementById('funcionarioCargo').value || 'N/D'}

FIRMAS:
1. Funcionario Responsable: ${document.getElementById('previewFirmaFuncionario').textContent || '___________________'}
2. Director: COMISARIO MAYOR (CPNB) DR GUILLERMO PARRA PULIDO

---
Generado por Sistema Automatizado CCPE ZULIA
ID Usuario: ${currentUser?.id || 'N/D'}
Timestamp: ${new Date().toISOString()}
    `.trim();
    
    // Descargar como archivo .txt
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Acta_Asignacion_${currentVehicle.placa || 'N_P'}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Limpia el formulario para nueva entrada
 */
function limpiarFormulario() {
    document.getElementById('actaForm')?.reset();
    document.getElementById('searchInput').value = '';
    currentVehicle = null;
    limpiarVistaPreviaVehiculo();
    establecerFechaActual();
    
    const alertBox = document.getElementById('searchAlert');
    if (alertBox) alertBox.style.display = 'none';
    
    // Resetear estilos de campos
    document.querySelectorAll('.form-group input').forEach(input => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    });
}

// ============================================
// EXPORTAR FUNCIONES PARA USO GLOBAL
// ============================================
window.buscarVehiculo = buscarVehiculo;
window.imprimirActa = imprimirActa;
window.guardarActa = guardarActa;
window.exportarActaTexto = exportarActaTexto;
window.limpiarFormulario = limpiarFormulario;
window.cerrarSesion = cerrarSesion;

// ============================================
// MANEJO DE ERRORES GLOBALES
// ============================================
window.addEventListener('error', (event) => {
    console.error('Error global:', event.error);
    // No mostrar alertas intrusivas para errores no críticos
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada no manejada:', event.reason);
});

// ============================================
// INFO DE VERSIÓN Y DEBUG
// ============================================
console.log('📋 acta-crear.js cargado - Módulo de Actas de Asignación');
console.log('🔗 Supabase:', supabase ? 'Conectado' : 'No configurado');
console.log('👤 Usuario:', currentUser?.email || 'No autenticado');
console.log('🚗 Vehículos en cache:', vehiclesData.length);
