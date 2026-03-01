/* ============================================ */
/* ACTA-CREAR.JS                                */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* ============================================ */

// ============================================
// ✅ ACTUALIZAR EL ACTA EN TIEMPO REAL
// ============================================
function actualizarActa() {
    const funcionarioNombre = document.getElementById('funcionarioNombre').value;
    const funcionarioCedula = document.getElementById('funcionarioCedula').value;
    const unidadAsignacion = document.getElementById('unidadAsignacion').value;
    const funcionarioCargo = document.getElementById('funcionarioCargo').value;
    
    // Actualizar nombre y cédula en el cuerpo del acta
    if (funcionarioNombre) {
        document.getElementById('previewFuncionarioNombre').textContent = funcionarioNombre;
    } else {
        document.getElementById('previewFuncionarioNombre').textContent = 'PRIMER COMISARIO (CPNB) ALBERTO PARRA';
    }
    
    if (funcionarioCedula) {
        document.getElementById('previewFuncionarioCedula').textContent = funcionarioCedula;
    } else {
        document.getElementById('previewFuncionarioCedula').textContent = 'V-13.550.532';
    }
    
    // ✅ ACTUALIZAR FIRMA DEL FUNCIONARIO - DINÁMICO
    if (funcionarioNombre && funcionarioCedula) {
        document.getElementById('previewFirmaFuncionario').innerHTML = 
            `${funcionarioNombre}, Cédula de Identidad numero ${funcionarioCedula}`;
    } else if (funcionarioNombre) {
        document.getElementById('previewFirmaFuncionario').innerHTML = 
            `${funcionarioNombre}, Cédula de Identidad numero V-00.000.000`;
    } else {
        // Valor por defecto si no hay datos
        document.getElementById('previewFirmaFuncionario').innerHTML = 
            'PRIMER COMISARIO (CPNB) ALBERTO PARRA, Cédula de Identidad numero V-13.550.532';
    }
    
    // Actualizar unidad de asignación
    if (unidadAsignacion) {
        document.getElementById('previewUnidadAsignacion').textContent = unidadAsignacion;
    }
    
    // Actualizar cargo del funcionario si existe
    if (funcionarioCargo) {
        document.getElementById('previewCargoFuncionario').textContent = funcionarioCargo;
    }
}

// ============================================
// ✅ BUSCAR VEHÍCULO EN BASE DE DATOS
// ============================================
function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput').value;
    const searchAlert = document.getElementById('searchAlert');
    
    // Validar que haya un término de búsqueda
    if (!searchInput.trim()) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    // Simulación de búsqueda (reemplazar con llamada real a la API)
    setTimeout(() => {
        // Datos de ejemplo (reemplazar con datos reales de la base de datos)
        const vehiculoEncontrado = {
            marcaModelo: 'SINOTRUK BOLDEN',
            serialCarroceria: 'LZZWAZG43TT500886',
            serialMotor: 'WP2H180A087255008054',
            placa: 'N/P',
            facsimil: 'N/P'
        };
        
        // Llenar los campos del acta
        document.getElementById('previewMarcaModelo').textContent = vehiculoEncontrado.marcaModelo;
        document.getElementById('previewSerialCarroceria').textContent = vehiculoEncontrado.serialCarroceria;
        document.getElementById('previewSerialMotor').textContent = vehiculoEncontrado.serialMotor;
        document.getElementById('previewPlaca').textContent = vehiculoEncontrado.placa;
        document.getElementById('previewFacsimil').textContent = vehiculoEncontrado.facsimil;
        
        mostrarAlerta('✅ Vehículo encontrado. Los datos han sido cargados en el acta.', 'success');
    }, 500);
}

// ============================================
// ✅ MOSTRAR ALERTAS
// ============================================
function mostrarAlerta(mensaje, tipo) {
    const searchAlert = document.getElementById('searchAlert');
    searchAlert.textContent = mensaje;
    searchAlert.className = `alert alert-${tipo}`;
    searchAlert.style.display = 'block';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        searchAlert.style.display = 'none';
    }, 5000);
}

// ============================================
// ✅ IMPRIMIR ACTA
// ============================================
function imprimirActa() {
    // Validar que haya datos del vehículo
    const marcaModelo = document.getElementById('previewMarcaModelo').textContent;
    if (marcaModelo === 'SINOTRUK BOLDEN' || marcaModelo === '-') {
        mostrarAlerta('⚠️ Primero debe buscar y cargar los datos del vehículo', 'error');
        return;
    }
    
    // Validar que haya datos del funcionario
    const funcionarioNombre = document.getElementById('funcionarioNombre').value;
    if (!funcionarioNombre) {
        mostrarAlerta('⚠️ Primero debe completar los datos del funcionario', 'error');
        return;
    }
    
    // Imprimir
    window.print();
}

// ============================================
// ✅ GUARDAR ACTA EN BASE DE DATOS
// ============================================
async function guardarActa() {
    // Validar campos obligatorios
    const funcionarioNombre = document.getElementById('funcionarioNombre').value;
    const funcionarioCedula = document.getElementById('funcionarioCedula').value;
    const unidadAsignacion = document.getElementById('unidadAsignacion').value;
    
    if (!funcionarioNombre || !funcionarioCedula || !unidadAsignacion) {
        mostrarAlerta('⚠️ Por favor complete todos los campos obligatorios del formulario', 'error');
        return;
    }
    
    // Validar que haya datos del vehículo
    const marcaModelo = document.getElementById('previewMarcaModelo').textContent;
    if (marcaModelo === 'SINOTRUK BOLDEN' || marcaModelo === '-') {
        mostrarAlerta('⚠️ Primero debe buscar y cargar los datos del vehículo', 'error');
        return;
    }
    
    // Recopilar datos del acta
    const actaData = {
        funcionario: {
            nombre: funcionarioNombre,
            cedula: funcionarioCedula,
            cargo: document.getElementById('funcionarioCargo').value,
            unidad: unidadAsignacion
        },
        vehiculo: {
            marcaModelo: document.getElementById('previewMarcaModelo').textContent,
            serialCarroceria: document.getElementById('previewSerialCarroceria').textContent,
            serialMotor: document.getElementById('previewSerialMotor').textContent,
            placa: document.getElementById('previewPlaca').textContent,
            facsimil: document.getElementById('previewFacsimil').textContent
        },
        fecha: {
            dia: document.getElementById('previewDia').textContent,
            mes: document.getElementById('previewMes').textContent,
            anio: document.getElementById('previewAnio').textContent
        },
        director: 'COMISARIO MAYOR (CPNB) Dr. GUILLERMO PARRA PULIDO'
    };
    
    try {
        // Simulación de guardado (reemplazar con llamada real a Supabase)
        console.log('Guardando acta:', actaData);
        
        // Aquí iría la llamada real a Supabase
        // const { data, error } = await supabase
        //     .from('actas_asignacion')
        //     .insert(actaData);
        
        mostrarAlerta('✅ Acta guardada exitosamente en la base de datos', 'success');
        
        // Opcional: Redirigir o limpiar formulario
        // window.location.href = 'acta.html';
        
    } catch (error) {
        console.error('Error al guardar acta:', error);
        mostrarAlerta('❌ Error al guardar el acta. Intente nuevamente.', 'error');
    }
}

// ============================================
// ✅ ACTUALIZAR FECHA AUTOMÁTICAMENTE
// ============================================
function actualizarFecha() {
    const fecha = new Date();
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    document.getElementById('previewDia').textContent = fecha.getDate();
    document.getElementById('previewMes').textContent = meses[fecha.getMonth()];
    document.getElementById('previewAnio').textContent = fecha.getFullYear();
}

// ============================================
// ✅ INICIALIZAR EVENTOS AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Actualizar fecha automáticamente
    actualizarFecha();
    
    // Agregar listeners para actualización en tiempo real
    const camposFormulario = [
        'funcionarioNombre',
        'funcionarioCedula',
        'unidadAsignacion',
        'funcionarioCargo'
    ];
    
    camposFormulario.forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.addEventListener('input', actualizarActa);
            elemento.addEventListener('change', actualizarActa);
        }
    });
    
    // Permitir búsqueda con Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarVehiculo();
            }
        });
    }
    
    // Cargar email de usuario (si está disponible en config.js)
    if (typeof window.currentUser !== 'undefined' && window.currentUser) {
        const userEmail = document.getElementById('userEmail');
        if (userEmail) {
            userEmail.textContent = window.currentUser.email || 'usuario@institucion.com';
        }
    }
});

// ============================================
// ✅ EXPORTAR FUNCIONES PARA USO GLOBAL
// ============================================
window.buscarVehiculo = buscarVehiculo;
window.imprimirActa = imprimirActa;
window.guardarActa = guardarActa;
window.actualizarActa = actualizarActa;
