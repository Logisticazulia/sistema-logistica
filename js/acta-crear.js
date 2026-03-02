/* ============================================ */
/* ACTA-CREAR.JS                                */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================ */
let vehiculoActual = null;

// ============================================
// ✅ INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que Supabase esté disponible desde config.js
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Error: Supabase no está inicializado. Verifica config.js');
        mostrarAlerta('❌ Error de configuración. Contacte al administrador.', 'error');
        return;
    }

    console.log('✅ Supabase inicializado correctamente');

    // Inicializar fecha automática
    actualizarFechaActa();

    // Agregar listeners para actualización en tiempo real del formulario
    agregarListenersFormulario();

    // Permitir búsqueda con Enter
    agregarListenerEnter();

    // Cargar email de usuario
    cargarEmailUsuario();
});

// ============================================
// ✅ BUSCAR VEHÍCULO EN BASE DE DATOS
// ============================================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const terminoBusqueda = searchInput.value.trim();

    // Validar que haya un término de búsqueda
    if (!terminoBusqueda) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }

    // Verificar que supabase esté disponible (desde config.js)
    if (!window.supabase) {
        mostrarAlerta('❌ Error de conexión con la base de datos', 'error');
        return;
    }

    try {
        let vehiculoEncontrado = null;

        // BÚSQUEDA EXACTA por placa (primero)
        const { data: dataPlaca, error: errorPlaca } = await window.supabase
            .from('vehiculos')
            .select('*')
            .eq('placa', terminoBusqueda.toUpperCase())
            .single();

        if (dataPlaca && !errorPlaca) {
            vehiculoEncontrado = dataPlaca;
        } else {
            // BÚSQUEDA EXACTA por facsimil
            const { data: dataFacsimil, error: errorFacsimil } = await window.supabase
                .from('vehiculos')
                .select('*')
                .eq('facsimil', terminoBusqueda.toUpperCase())
                .single();

            if (dataFacsimil && !errorFacsimil) {
                vehiculoEncontrado = dataFacsimil;
            } else {
                // BÚSQUEDA EXACTA por serial de carrocería
                const { data: dataCarroceria, error: errorCarroceria } = await window.supabase
                    .from('vehiculos')
                    .select('*')
                    .eq('s_carroceria', terminoBusqueda.toUpperCase())
                    .single();

                if (dataCarroceria && !errorCarroceria) {
                    vehiculoEncontrado = dataCarroceria;
                } else {
                    // BÚSQUEDA EXACTA por serial de motor
                    const { data: dataMotor, error: errorMotor } = await window.supabase
                        .from('vehiculos')
                        .select('*')
                        .eq('s_motor', terminoBusqueda.toUpperCase())
                        .single();

                    if (dataMotor && !errorMotor) {
                        vehiculoEncontrado = dataMotor;
                    } else {
                        // BÚSQUEDA PARCIAL por marca
                        const { data: dataMarca, error: errorMarca } = await window.supabase
                            .from('vehiculos')
                            .select('*')
                            .ilike('marca', `%${terminoBusqueda}%`)
                            .single();

                        if (dataMarca && !errorMarca) {
                            vehiculoEncontrado = dataMarca;
                        }
                    }
                }
            }
        }

        if (!vehiculoEncontrado) {
            mostrarAlerta('❌ Vehículo no encontrado en la base de datos', 'error');
            limpiarDatosVehiculo();
            vehiculoActual = null;
            return;
        }

        // Guardar vehículo encontrado
        vehiculoActual = vehiculoEncontrado;

        // Llenar los campos del acta con los datos del vehículo
        llenarDatosVehiculo(vehiculoEncontrado);

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
    // Según la estructura del CSV: marca, modelo, s_carroceria, s_motor, placa, facsimil

    const marca = vehiculo.marca || 'N/P';
    const modelo = vehiculo.modelo || '';

    document.getElementById('previewMarcaModelo').textContent = `${marca} ${modelo}`.trim() || 'N/P';
    document.getElementById('previewSerialCarroceria').textContent = vehiculo.s_carroceria || 'N/P';
    document.getElementById('previewSerialMotor').textContent = vehiculo.s_motor || 'N/P';
    document.getElementById('previewPlaca').textContent = vehiculo.placa || 'N/P';
    document.getElementById('previewFacsimil').textContent = vehiculo.facsimil || 'N/P';
}

// ============================================
// ✅ LIMPIAR DATOS DEL VEHÍCULO
// ============================================
function limpiarDatosVehiculo() {
    document.getElementById('previewMarcaModelo').textContent = '---';
    document.getElementById('previewSerialCarroceria').textContent = '---';
    document.getElementById('previewSerialMotor').textContent = '---';
    document.getElementById('previewPlaca').textContent = '---';
    document.getElementById('previewFacsimil').textContent = '---';
}

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
        document.getElementById('previewFuncionarioNombre').textContent = '---';
    }

    if (funcionarioCedula) {
        document.getElementById('previewFuncionarioCedula').textContent = funcionarioCedula;
    } else {
        document.getElementById('previewFuncionarioCedula').textContent = '---';
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
        document.getElementById('previewFirmaFuncionario').textContent = '---';
    }

    // ACTUALIZAR UNIDAD DE ASIGNACIÓN EN EL CARGO
    if (unidadAsignacion) {
        document.getElementById('previewUnidadAsignacion').textContent = unidadAsignacion;
        document.getElementById('previewCargoFuncionario').textContent = `Jefe de ${unidadAsignacion}`;
    } else {
        document.getElementById('previewUnidadAsignacion').textContent = '---';
        document.getElementById('previewCargoFuncionario').textContent = '---';
    }

    // Actualizar cargo del funcionario si existe
    if (funcionarioCargo) {
        document.getElementById('previewCargoFuncionario').textContent = funcionarioCargo;
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
// ✅ MOSTRAR ALERTAS
// ============================================
function mostrarAlerta(mensaje, tipo) {
    const searchAlert = document.getElementById('searchAlert');
    if (!searchAlert) return;

    searchAlert.textContent = mensaje;
    searchAlert.className = `alert alert-${tipo}`;
    searchAlert.style.display = 'block';

    // Ocultar después de 5 segundos
    setTimeout(() => {
        searchAlert.style.display = 'none';
    }, 5000);
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
    const userEmailElement = document.getElementById('userEmail');
    if (!userEmailElement) return;

    // Intentar obtener usuario de sessionStorage
    const usuarioGuardado = sessionStorage.getItem('usuario');

    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);
            userEmailElement.textContent = usuario.email || usuario.correo || 'usuario@institucion.com';
            console.log('✅ Usuario cargado desde sessionStorage:', usuario.email || usuario.correo);
            return;
        } catch (error) {
            console.error('Error al parsear usuario de sessionStorage:', error);
        }
    }

    // Si hay sesión de Supabase, intentar obtener el email
    if (window.supabase) {
        window.supabase.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
                userEmailElement.textContent = session.user.email || 'usuario@institucion.com';
                console.log('✅ Usuario cargado desde Supabase auth:', session.user.email);

                // Guardar en sessionStorage para futuras cargas
                sessionStorage.setItem('usuario', JSON.stringify({
                    email: session.user.email,
                    id: session.user.id
                }));
            } else {
                // Usuario no autenticado, mostrar email genérico
                userEmailElement.textContent = 'usuario@institucion.com';
                console.log('⚠️ No hay sesión activa, mostrando email genérico');
            }
        }).catch(error => {
            console.error('Error al obtener sesión:', error);
            userEmailElement.textContent = 'usuario@institucion.com';
        });
    } else {
        // Supabase no disponible, mostrar email genérico
        userEmailElement.textContent = 'usuario@institucion.com';
        console.log('⚠️ Supabase no disponible, mostrando email genérico');
    }
}

// ============================================
// ✅ IMPRIMIR ACTA
// ============================================
function imprimirActa() {
    // Validar que haya datos del vehículo
    const marcaModelo = document.getElementById('previewMarcaModelo').textContent;
    if (marcaModelo === '---' || marcaModelo === 'N/P') {
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
    if (marcaModelo === '---' || marcaModelo === 'N/P') {
        mostrarAlerta('⚠️ Primero debe buscar y cargar los datos del vehículo', 'error');
        return;
    }

    // Verificar que supabase esté disponible
    if (!window.supabase) {
        mostrarAlerta('❌ Error de conexión con la base de datos', 'error');
        return;
    }

    // Obtener email del usuario
    const userEmailElement = document.getElementById('userEmail');
    const createdByEmail = userEmailElement ? userEmailElement.textContent : 'usuario@institucion.com';

    // Recopilar datos del acta
    const actaData = {
        funcionario: {
            nombre: funcionarioNombre,
            cedula: funcionarioCedula,
            cargo: document.getElementById('funcionarioCargo').value,
            unidad: unidadAsignacion
        },
        vehiculo: {
            id: vehiculoActual ? vehiculoActual.id : null,
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
        director: 'COMISARIO MAYOR (CPNB) Dr. GUILLERMO PARRA PULIDO',
        created_by_email: createdByEmail
    };

    try {
        // Guardar en Supabase - Tabla: actas_asignacion
        const { data, error } = await window.supabase
            .from('actas_asignacion')
            .insert(actaData);

        if (error) throw error;

        mostrarAlerta('✅ Acta guardada exitosamente en la base de datos', 'success');

        // Opcional: Limpiar formulario después de guardar
        // setTimeout(() => {
        //     limpiarFormulario();
        // }, 2000);

    } catch (error) {
        console.error('Error al guardar acta:', error);
        mostrarAlerta('❌ Error al guardar el acta. Intente nuevamente.', 'error');
    }
}

// ============================================
// ✅ LIMPIAR FORMULARIO COMPLETO
// ============================================
function limpiarFormulario() {
    // Limpiar campos del formulario
    document.getElementById('searchInput').value = '';
    document.getElementById('funcionarioNombre').value = '';
    document.getElementById('funcionarioCedula').value = '';
    document.getElementById('unidadAsignacion').value = '';
    document.getElementById('funcionarioCargo').value = '';

    // Limpiar datos del vehículo en el acta
    limpiarDatosVehiculo();

    // Restablecer valores por defecto en el acta
    document.getElementById('previewFuncionarioNombre').textContent = '---';
    document.getElementById('previewFuncionarioCedula').textContent = '---';
    document.getElementById('previewFirmaFuncionario').textContent = '---';
    document.getElementById('previewUnidadAsignacion').textContent = '---';
    document.getElementById('previewCargoFuncionario').textContent = '---';

    // Actualizar fecha
    actualizarFechaActa();

    // Limpiar vehículo actual
    vehiculoActual = null;

    console.log('✅ Formulario limpiado correctamente');
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
window.limpiarFormulario = limpiarFormulario;
window.cargarEmailUsuario = cargarEmailUsuario;
