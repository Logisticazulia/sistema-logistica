/* ============================================ */
/* ACTA-CREAR.JS                                */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;

// ============================================
// ✅ INICIALIZAR SUPABASE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que las credenciales estén cargadas
    if (window.SUPABASE_URL && window.SUPABASE_KEY && window.supabase) {
        supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL, 
            window.SUPABASE_KEY
        );
        console.log('✅ Supabase inicializado correctamente');
    } else {
        console.error('❌ Error: Credenciales de Supabase no encontradas. Verifica config.js');
    }
    
    // Inicializar fecha automática
    actualizarFechaActa();
    
    // Agregar listeners para actualización en tiempo real
    agregarListenersFormulario();
    
    // Permitir búsqueda con Enter
    agregarListenerEnter();
    
    // Cargar email de usuario
    cargarEmailUsuario();
});

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
    
    // ACTUALIZAR FIRMA DEL FUNCIONARIO - DINÁMICO
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
    
    // ACTUALIZAR UNIDAD DE ASIGNACIÓN EN EL CARGO
    if (unidadAsignacion) {
        document.getElementById('previewUnidadAsignacion').textContent = unidadAsignacion;
        document.getElementById('previewCargoFuncionario').textContent = `Jefe de ${unidadAsignacion}`;
    } else {
        document.getElementById('previewUnidadAsignacion').textContent = 'Oficina de Gestión Humana de la Redip Occidental';
        document.getElementById('previewCargoFuncionario').textContent = 'Jefe de la Oficina de Gestión Humana de la Redip Occidental';
    }
    
    // Actualizar cargo del funcionario si existe
    if (funcionarioCargo) {
        document.getElementById('previewCargoFuncionario').textContent = funcionarioCargo;
    }
}

// ============================================
// ✅ BUSCAR VEHÍCULO EN BASE DE DATOS
// ============================================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput').value.trim();
    const searchAlert = document.getElementById('searchAlert');
    
    // Validar que haya un término de búsqueda
    if (!searchInput) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    try {
        // Verificar que supabaseClient esté inicializado
        if (!supabaseClient) {
            mostrarAlerta('❌ Error de conexión. Recarga la página.', 'error');
            return;
        }
        
        // Búsqueda exacta por placa (primero)
        let { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .eq('placa', searchInput.toUpperCase())
            .single();
        
        // Si no encuentra por placa, intentar por facsimil
        if (!data || error) {
            const { data: data2, error: error2 } = await supabaseClient
                .from('vehiculos')
                .select('*')
                .eq('facsimil', searchInput.toUpperCase())
                .single();
            
            if (data2 && !error2) {
                data = data2;
            } else {
                // Intentar por serial de carrocería
                const { data: data3, error: error3 } = await supabaseClient
                    .from('vehiculos')
                    .select('*')
                    .eq('s_carroceria', searchInput.toUpperCase())
                    .single();
                
                if (data3 && !error3) {
                    data = data3;
                } else {
                    // Intentar por serial de motor
                    const { data: data4, error: error4 } = await supabaseClient
                        .from('vehiculos')
                        .select('*')
                        .eq('s_motor', searchInput.toUpperCase())
                        .single();
                    
                    if (data4 && !error4) {
                        data = data4;
                    } else {
                        // Intentar por marca/modelo
                        const { data: data5, error: error5 } = await supabaseClient
                            .from('vehiculos')
                            .select('*')
                            .ilike('marca', `%${searchInput}%`)
                            .single();
                        
                        if (data5 && !error5) {
                            data = data5;
                        }
                    }
                }
            }
        }
        
        if (!data) {
            mostrarAlerta('❌ Vehículo no encontrado en la base de datos', 'error');
            limpiarDatosVehiculo();
            return;
        }
        
        // Llenar los campos del acta con los datos del vehículo
        llenarDatosVehiculo(data);
        mostrarAlerta('✅ Vehículo encontrado. Los datos han sido cargados en el acta.', 'success');
        
    } catch (error) {
        console.error('Error al buscar vehículo:', error);
        mostrarAlerta('❌ Error de conexión. Intente nuevamente.', 'error');
    }
}

// ============================================
// ✅ LLENAR DATOS DEL VEHÍCULO EN EL ACTA
// ============================================
function llenarDatosVehiculo(vehiculo) {
    // Mapear los campos de la tabla vehiculos a la vista previa del acta
    document.getElementById('previewMarcaModelo').textContent = 
        `${vehiculo.marca || 'N/P'} ${vehiculo.modelo || ''}`.trim() || 'N/P';
    
    document.getElementById('previewSerialCarroceria').textContent = 
        vehiculo.s_carroceria || 'N/P';
    
    document.getElementById('previewSerialMotor').textContent = 
        vehiculo.s_motor || 'N/P';
    
    document.getElementById('previewPlaca').textContent = 
        vehiculo.placa || 'N/P';
    
    document.getElementById('previewFacsimil').textContent = 
        vehiculo.facsimil || 'N/P';
}

// ============================================
// ✅ LIMPIAR DATOS DEL VEHÍCULO
// ============================================
function limpiarDatosVehiculo() {
    document.getElementById('previewMarcaModelo').textContent = '-';
    document.getElementById('previewSerialCarroceria').textContent = '-';
    document.getElementById('previewSerialMotor').textContent = '-';
    document.getElementById('previewPlaca').textContent = 'N/P';
    document.getElementById('previewFacsimil').textContent = 'N/P';
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
    if (marcaModelo === '-' || marcaModelo === 'N/P') {
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
    if (marcaModelo === '-' || marcaModelo === 'N/P') {
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
        // Verificar que supabaseClient esté inicializado
        if (!supabaseClient) {
            mostrarAlerta('❌ Error de conexión con la base de datos', 'error');
            return;
        }
        
        // Guardar en Supabase - Tabla: actas_asignacion
        const { data, error } = await supabaseClient
            .from('actas_asignacion')
            .insert(actaData);
        
        if (error) throw error;
        
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
function actualizarFechaActa() {
    const fecha = new Date();
    
    // Meses en español
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    // Obtener el día del mes (1-31)
    const dia = fecha.getDate();
    
    // Obtener el mes (0-11, por eso se usa como índice del array)
    const mes = meses[fecha.getMonth()];
    
    // Obtener el año completo (ej: 2026)
    const anio = fecha.getFullYear();
    
    // Actualizar los elementos del acta
    const previewDia = document.getElementById('previewDia');
    const previewMes = document.getElementById('previewMes');
    const previewAnio = document.getElementById('previewAnio');
    
    if (previewDia) previewDia.textContent = dia;
    if (previewMes) previewMes.textContent = mes;
    if (previewAnio) previewAnio.textContent = anio;
}

// ============================================
// ✅ AGREGAR LISTENERS AL FORMULARIO
// ============================================
function agregarListenersFormulario() {
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
}

// ============================================
// ✅ PERMITIR BÚSQUEDA CON ENTER
// ============================================
function agregarListenerEnter() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarVehiculo();
            }
        });
    }
}

// ============================================
// ✅ CARGAR EMAIL DE USUARIO
// ============================================
function cargarEmailUsuario() {
    if (typeof window.currentUser !== 'undefined' && window.currentUser) {
        const userEmail = document.getElementById('userEmail');
        if (userEmail) {
            userEmail.textContent = window.currentUser.email || 'usuario@institucion.com';
        }
    }
}

// ============================================
// ✅ EXPORTAR FUNCIONES PARA USO GLOBAL
// ============================================
window.buscarVehiculo = buscarVehiculo;
window.imprimirActa = imprimirActa;
window.guardarActa = guardarActa;
window.actualizarActa = actualizarActa;
window.llenarDatosVehiculo = llenarDatosVehiculo;
window.limpiarDatosVehiculo = limpiarDatosVehiculo;
window.mostrarAlerta = mostrarAlerta;
