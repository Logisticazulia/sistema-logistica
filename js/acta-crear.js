/* ============================================ */
/* ACTA-CREAR.JS                                */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================ */
let supabaseClient = null;
let vehiculoActual = null; // Vehículo encontrado en la búsqueda
let listaVehiculos = [];   // Array para almacenar múltiples vehículos
let vehicleCounter = 0;    // Contador único para IDs

// ============================================
// ✅ INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Verificar que Supabase esté disponible desde config.js
    if (typeof window.supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY) {
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log('✅ Supabase inicializado correctamente');
    } else {
        console.error('❌ Error: Credenciales de Supabase no encontradas. Verifica config.js');
    }
    
    // Actualizar fecha automática
    actualizarFechaActa();
    
    // Agregar listeners para actualización en tiempo real del formulario
    agregarListenersFormulario();
    
    // Permitir búsqueda con Enter
    agregarListenerEnter();
    
    // Cargar email de usuario
    cargarEmailUsuario();
});

// ============================================
// ✅ CARGAR EMAIL DEL USUARIO
// ============================================
function cargarEmailUsuario() {
    const userEmailElement = document.getElementById('userEmail');
    
    if (!userEmailElement) {
        console.error('❌ Elemento userEmail no encontrado');
        return;
    }
    
    // Intentar obtener usuario de sessionStorage
    const usuarioGuardado = sessionStorage.getItem('usuario');
    
    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);
            if (userEmailElement) {
                userEmailElement.textContent = usuario.email || usuario.correo || 'usuario@institucion.com';
            }
            console.log('✅ Usuario cargado desde sessionStorage:', usuario.email || usuario.correo);
            return;
        } catch (error) {
            console.error('Error al parsear usuario de sessionStorage:', error);
        }
    }
    
    // Si hay sesión de Supabase, intentar obtener el email
    if (supabaseClient) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
                if (userEmailElement) {
                    userEmailElement.textContent = session.user.email || 'usuario@institucion.com';
                }
                console.log('✅ Usuario cargado desde Supabase auth:', session.user.email);
                
                // Guardar en sessionStorage para futuras cargas
                sessionStorage.setItem('usuario', JSON.stringify({
                    email: session.user.email,
                    id: session.user.id
                }));
            } else {
                // Usuario no autenticado, mostrar email genérico
                if (userEmailElement) {
                    userEmailElement.textContent = 'usuario@institucion.com';
                }
                console.log('⚠️ No hay sesión activa, mostrando email genérico');
            }
        }).catch(error => {
            console.error('Error al obtener sesión:', error);
            if (userEmailElement) {
                userEmailElement.textContent = 'usuario@institucion.com';
            }
        });
    } else {
        // Supabase no disponible, mostrar email genérico
        if (userEmailElement) {
            userEmailElement.textContent = 'usuario@institucion.com';
        }
        console.log('⚠️ Supabase no disponible, mostrando email genérico');
    }
}

// ============================================
// ✅ ACTUALIZAR EL ACTA EN TIEMPO REAL
// ============================================
function actualizarActa() {
    const funcionarioNombre = document.getElementById('funcionarioNombre')?.value || '';
    const funcionarioCedula = document.getElementById('funcionarioCedula')?.value || '';
    const unidadAsignacion = document.getElementById('unidadAsignacion')?.value || '';
    const funcionarioCargo = document.getElementById('funcionarioCargo')?.value || '';
    
    // Actualizar nombre y cédula en el cuerpo del acta
    const previewFuncionarioNombre = document.getElementById('previewFuncionarioNombre');
    const previewFuncionarioCedula = document.getElementById('previewFuncionarioCedula');
    const previewUnidadAsignacion = document.getElementById('previewUnidadAsignacion');
    const previewFirmaFuncionario = document.getElementById('previewFirmaFuncionario');
    const previewCargoFuncionario = document.getElementById('previewCargoFuncionario');
    
    if (previewFuncionarioNombre) {
        previewFuncionarioNombre.textContent = funcionarioNombre || '---';
    }
    
    if (previewFuncionarioCedula) {
        previewFuncionarioCedula.textContent = funcionarioCedula || '---';
    }
    
    // ACTUALIZAR FIRMA DEL FUNCIONARIO - DINÁMICO
    if (previewFirmaFuncionario) {
        if (funcionarioNombre && funcionarioCedula) {
            previewFirmaFuncionario.innerHTML = `${funcionarioNombre}, Cédula de Identidad numero ${funcionarioCedula}`;
        } else if (funcionarioNombre) {
            previewFirmaFuncionario.innerHTML = `${funcionarioNombre}, Cédula de Identidad numero V-00.000.000`;
        } else {
            previewFirmaFuncionario.textContent = '---';
        }
    }
    
    // ACTUALIZAR UNIDAD DE ASIGNACIÓN EN EL CARGO
    if (previewUnidadAsignacion) {
        previewUnidadAsignacion.textContent = unidadAsignacion || '---';
    }
    
    if (previewCargoFuncionario) {
        if (funcionarioCargo) {
            previewCargoFuncionario.textContent = funcionarioCargo;
        } else if (unidadAsignacion) {
            previewCargoFuncionario.textContent = `Jefe de ${unidadAsignacion}`;
        } else {
            previewCargoFuncionario.textContent = '---';
        }
    }
    
    // ✅ ACTUALIZAR TEXTO SINGULAR/PLURAL
    actualizarTextoSingularPlural();
}

// ============================================
// ✅ ACTUALIZAR TEXTO SINGULAR/PLURAL
// ============================================
function actualizarTextoSingularPlural() {
    const cantidadVehiculos = listaVehiculos.length;
    
    const textoUnidad = document.getElementById('textoUnidad');
    const textoUso = document.getElementById('textoUso');
    const textoUnidad2 = document.getElementById('textoUnidad2');
    
    if (cantidadVehiculos >= 2) {
        // PLURAL (2 o más vehículos)
        if (textoUnidad) textoUnidad.textContent = 'Estas unidades son asignadas';
        if (textoUso) textoUso.textContent = 'estas unidades son asignadas';
        if (textoUnidad2) textoUnidad2.textContent = 'las unidades descritas son';
    } else {
        // SINGULAR (1 vehículo o menos)
        if (textoUnidad) textoUnidad.textContent = 'Esta unidad es asignada';
        if (textoUso) textoUso.textContent = 'esta unidad es asignada';
        if (textoUnidad2) textoUnidad2.textContent = 'la unidad descrita es';
    }
}

// ============================================
// ✅ BUSCAR VEHÍCULO EN BASE DE DATOS
// ============================================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    const terminoBusqueda = searchInput?.value.trim() || '';
    
    // Validar que haya un término de búsqueda
    if (!terminoBusqueda) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
        return;
    }
    
    // Verificar que supabaseClient esté inicializado
    if (!supabaseClient) {
        mostrarAlerta('❌ Error de conexión con la base de datos', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
        return;
    }
    
    try {
        let vehiculoEncontrado = null;
        
        // ============================================
        // ✅ BÚSQUEDA EXACTA POR PLACA
        // ============================================
        const { data: dataPlaca, error: errorPlaca } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .eq('placa', terminoBusqueda.toUpperCase())
            .limit(1);
        
        if (dataPlaca && dataPlaca.length > 0 && !errorPlaca) {
            vehiculoEncontrado = dataPlaca[0];
        } else {
            // ============================================
            // ✅ BÚSQUEDA EXACTA POR FACSÍMIL
            // ============================================
            const { data: dataFacsimil, error: errorFacsimil } = await supabaseClient
                .from('vehiculos')
                .select('*')
                .eq('facsimil', terminoBusqueda.toUpperCase())
                .limit(1);
            
            if (dataFacsimil && dataFacsimil.length > 0 && !errorFacsimil) {
                vehiculoEncontrado = dataFacsimil[0];
            } else {
                // ============================================
                // ✅ BÚSQUEDA EXACTA POR SERIAL DE CARROCERÍA
                // ============================================
                const { data: dataCarroceria, error: errorCarroceria } = await supabaseClient
                    .from('vehiculos')
                    .select('*')
                    .eq('s_carroceria', terminoBusqueda.toUpperCase())
                    .limit(1);
                
                if (dataCarroceria && dataCarroceria.length > 0 && !errorCarroceria) {
                    vehiculoEncontrado = dataCarroceria[0];
                } else {
                    // ============================================
                    // ✅ BÚSQUEDA EXACTA POR SERIAL DE MOTOR
                    // ============================================
                    const { data: dataMotor, error: errorMotor } = await supabaseClient
                        .from('vehiculos')
                        .select('*')
                        .eq('s_motor', terminoBusqueda.toUpperCase())
                        .limit(1);
                    
                    if (dataMotor && dataMotor.length > 0 && !errorMotor) {
                        vehiculoEncontrado = dataMotor[0];
                    } else {
                        // ============================================
                        // ✅ BÚSQUEDA EXACTA POR NÚMERO DE IDENTIFICACIÓN
                        // ============================================
                        const { data: dataIdentificacion, error: errorIdentificacion } = await supabaseClient
                            .from('vehiculos')
                            .select('*')
                            .eq('n_identificacion', terminoBusqueda.toUpperCase())
                            .limit(1);
                        
                        if (dataIdentificacion && dataIdentificacion.length > 0 && !errorIdentificacion) {
                            vehiculoEncontrado = dataIdentificacion[0];
                        }
                    }
                }
            }
        }
        
        if (!vehiculoEncontrado) {
            mostrarAlerta('❌ Vehículo no encontrado en la base de datos', 'error', searchAlert);
            vehiculoActual = null;
            if (btnAgregar) btnAgregar.disabled = true;
            return;
        }
        
        // Verificar si el vehículo ya está en la lista
        const yaExiste = listaVehiculos.some(v => 
            v.placa === vehiculoEncontrado.placa || 
            v.s_carroceria === vehiculoEncontrado.s_carroceria
        );
        
        if (yaExiste) {
            mostrarAlerta('⚠️ Este vehículo ya está en la lista del acta', 'info', searchAlert);
            if (btnAgregar) btnAgregar.disabled = true;
            return;
        }
        
        // Guardar vehículo encontrado en variable temporal
        vehiculoActual = {
            id: vehiculoEncontrado.id,
            marca: vehiculoEncontrado.marca || 'N/P',
            modelo: vehiculoEncontrado.modelo || '',
            s_carroceria: vehiculoEncontrado.s_carroceria || 'N/P',
            s_motor: vehiculoEncontrado.s_motor || 'N/P',
            placa: vehiculoEncontrado.placa || 'N/P',
            facsimil: vehiculoEncontrado.facsimil || 'N/P'
        };
        
        // Habilitar botón para agregar
        if (btnAgregar) btnAgregar.disabled = false;
        mostrarAlerta('✅ Vehículo encontrado. Puede agregarlo a la lista.', 'success', searchAlert);
        
    } catch (error) {
        console.error('Error al buscar vehículo:', error);
        mostrarAlerta('❌ Error de conexión. Intente nuevamente.', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
    }
}

// ============================================
// ✅ AGREGAR VEHÍCULO AL ACTA
// ============================================
function agregarVehiculoAlActa() {
    if (!vehiculoActual) {
        mostrarAlerta('⚠️ Primero debe buscar un vehículo', 'error');
        return;
    }
    
    // Verificar si el vehículo ya está en la lista
    const yaExiste = listaVehiculos.some(v => 
        v.placa === vehiculoActual.placa || 
        v.s_carroceria === vehiculoActual.s_carroceria
    );
    
    if (yaExiste) {
        mostrarAlerta('⚠️ Este vehículo ya está en la lista del acta', 'error');
        return;
    }
    
    // Agregar vehículo a la lista
    vehicleCounter++;
    vehiculoActual.tempId = vehicleCounter;
    listaVehiculos.push(vehiculoActual);
    
    // Actualizar la tabla de vehículos
    renderizarListaVehiculos();
    
    // Actualizar el acta con todos los vehículos
    renderizarVehiculosEnActa();
    
    // ✅ Actualizar texto singular/plural
    actualizarTextoSingularPlural();
    
    // Limpiar búsqueda
    const searchInput = document.getElementById('searchInput');
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    
    if (searchInput) searchInput.value = '';
    vehiculoActual = null;
    if (btnAgregar) btnAgregar.disabled = true;
    
    mostrarAlerta(`✅ Vehículo agregado. Total: ${listaVehiculos.length} vehículo(s)`, 'success');
}

// ============================================
// ✅ RENDERIZAR LISTA DE VEHÍCULOS
// ============================================
function renderizarListaVehiculos() {
    const tbody = document.getElementById('vehiclesListBody');
    const section = document.getElementById('vehiclesListSection');
    const count = document.getElementById('vehiclesCount');
    
    if (!tbody || !section || !count) {
        console.error('❌ Elementos de la lista de vehículos no encontrados');
        return;
    }
    
    if (listaVehiculos.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    count.textContent = listaVehiculos.length;
    
    tbody.innerHTML = listaVehiculos.map((vehiculo, index) => `
        <tr>
            <td>${vehiculo.marca} ${vehiculo.modelo}</td>
            <td>${vehiculo.placa}</td>
            <td>${vehiculo.s_carroceria}</td>
            <td>${vehiculo.s_motor}</td>
            <td>${vehiculo.facsimil}</td>
            <td>
                <button class="btn-remove-vehicle" onclick="eliminarVehiculo(${vehiculo.tempId})">
                    🗑️ Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// ✅ ELIMINAR VEHÍCULO DE LA LISTA
// ============================================
function eliminarVehiculo(tempId) {
    const index = listaVehiculos.findIndex(v => v.tempId === tempId);
    
    if (index >= 0 && index < listaVehiculos.length) {
        const vehiculoEliminado = listaVehiculos[index];
        listaVehiculos.splice(index, 1);
        
        renderizarListaVehiculos();
        renderizarVehiculosEnActa();
        
        // ✅ Actualizar texto singular/plural
        actualizarTextoSingularPlural();
        
        if (listaVehiculos.length === 0) {
            mostrarAlerta('🗑️ Vehículo eliminado. La lista está vacía.', 'info');
        } else {
            mostrarAlerta(`🗑️ Vehículo eliminado. Total: ${listaVehiculos.length} vehículo(s)`, 'success');
        }
    }
}

// ============================================
// ✅ RENDERIZAR VEHÍCULOS EN EL ACTA
// ============================================
function renderizarVehiculosEnActa() {
    const tbody = document.getElementById('actaVehiclesBody');
    
    if (!tbody) {
        console.error('❌ Elemento actaVehiclesBody no encontrado');
        return;
    }
    
    if (listaVehiculos.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td>---</td>
                <td>---</td>
                <td>---</td>
                <td>---</td>
                <td>---</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = listaVehiculos.map(vehiculo => `
        <tr>
            <td>${vehiculo.marca} ${vehiculo.modelo}</td>
            <td>${vehiculo.s_carroceria}</td>
            <td>${vehiculo.s_motor}</td>
            <td>${vehiculo.placa}</td>
            <td>${vehiculo.facsimil}</td>
        </tr>
    `).join('');
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
                e.preventDefault();
                buscarVehiculo();
            }
        });
    }
}

// ============================================
// ✅ MOSTRAR ALERTAS
// ============================================
function mostrarAlerta(mensaje, tipo, elemento = null) {
    const alertElement = elemento || document.getElementById('searchAlert');
    if (!alertElement) {
        console.error('❌ Elemento de alerta no encontrado');
        return;
    }
    
    alertElement.textContent = mensaje;
    alertElement.className = `alert alert-${tipo}`;
    alertElement.style.display = 'block';
    
    // Ocultar después de 5 segundos (excepto errores)
    if (tipo !== 'error') {
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }
}

// ============================================
// ✅ IMPRIMIR ACTA
// ============================================
function imprimirActa() {
    // Validar que haya vehículos en la lista
    if (listaVehiculos.length === 0) {
        mostrarAlerta('⚠️ Primero debe agregar al menos un vehículo al acta', 'error');
        return;
    }
    
    // Validar que haya datos del funcionario
    const funcionarioNombre = document.getElementById('funcionarioNombre')?.value || '';
    if (!funcionarioNombre) {
        mostrarAlerta('⚠️ Primero debe completar los datos del funcionario', 'error');
        return;
    }
    
    // Actualizar vista previa antes de imprimir
    actualizarActa();
    renderizarVehiculosEnActa();
    
    // Imprimir
    window.print();
}

// ============================================
// ✅ GUARDAR ACTA EN BASE DE DATOS
// ============================================
async function guardarActa() {
    // Validar campos obligatorios
    const funcionarioNombre = document.getElementById('funcionarioNombre')?.value || '';
    const funcionarioCedula = document.getElementById('funcionarioCedula')?.value || '';
    const unidadAsignacion = document.getElementById('unidadAsignacion')?.value || '';
    
    if (!funcionarioNombre || !funcionarioCedula || !unidadAsignacion) {
        mostrarAlerta('⚠️ Por favor complete todos los campos obligatorios del formulario', 'error');
        return;
    }
    
    // Validar que haya vehículos en la lista
    if (listaVehiculos.length === 0) {
        mostrarAlerta('⚠️ Primero debe agregar al menos un vehículo al acta', 'error');
        return;
    }
    
    // Verificar que supabaseClient esté inicializado
    if (!supabaseClient) {
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
            cargo: document.getElementById('funcionarioCargo')?.value || '',
            unidad: unidadAsignacion
        },
        vehiculos: listaVehiculos.map(v => ({
            id: v.id,
            marca: v.marca,
            modelo: v.modelo,
            placa: v.placa,
            facsimil: v.facsimil,
            s_carroceria: v.s_carroceria,
            s_motor: v.s_motor
        })),
        fecha: {
            dia: document.getElementById('previewDia')?.textContent || '',
            mes: document.getElementById('previewMes')?.textContent || '',
            anio: document.getElementById('previewAnio')?.textContent || ''
        },
        director: 'COMISARIO MAYOR (CPNB) Dr. GUILLERMO PARRA PULIDO',
        created_by_email: createdByEmail
    };
    
    try {
        // Guardar en Supabase - Tabla: actas_asignacion
        const { data, error } = await supabaseClient
            .from('actas_asignacion')
            .insert(actaData);
        
        if (error) throw error;
        
        mostrarAlerta('✅ Acta guardada exitosamente en la base de datos', 'success');
        
        // Opcional: Limpiar formulario después de guardar
        setTimeout(() => {
            limpiarFormulario();
        }, 2000);
        
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
    const searchInput = document.getElementById('searchInput');
    const funcionarioNombre = document.getElementById('funcionarioNombre');
    const funcionarioCedula = document.getElementById('funcionarioCedula');
    const unidadAsignacion = document.getElementById('unidadAsignacion');
    const funcionarioCargo = document.getElementById('funcionarioCargo');
    
    if (searchInput) searchInput.value = '';
    if (funcionarioNombre) funcionarioNombre.value = '';
    if (funcionarioCedula) funcionarioCedula.value = '';
    if (unidadAsignacion) unidadAsignacion.value = '';
    if (funcionarioCargo) funcionarioCargo.value = '';
    
    // Limpiar lista de vehículos
    listaVehiculos = [];
    vehiculoActual = null;
    vehicleCounter = 0;
    
    // Limpiar vista previa
    renderizarListaVehiculos();
    renderizarVehiculosEnActa();
    actualizarActa();
    actualizarFechaActa();
    
    // Deshabilitar botón de agregar
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    if (btnAgregar) btnAgregar.disabled = true;
    
    // Ocultar sección de vehículos
    const vehiclesListSection = document.getElementById('vehiclesListSection');
    if (vehiclesListSection) vehiclesListSection.style.display = 'none';
    
    console.log('✅ Formulario limpiado correctamente');
}

// ============================================
// ✅ EXPORTAR FUNCIONES PARA USO GLOBAL
// ============================================
window.buscarVehiculo = buscarVehiculo;
window.imprimirActa = imprimirActa;
window.guardarActa = guardarActa;
window.actualizarActa = actualizarActa;
window.agregarVehiculoAlActa = agregarVehiculoAlActa;
window.eliminarVehiculo = eliminarVehiculo;
window.limpiarFormulario = limpiarFormulario;
window.renderizarListaVehiculos = renderizarListaVehiculos;
window.renderizarVehiculosEnActa = renderizarVehiculosEnActa;
window.actualizarTextoSingularPlural = actualizarTextoSingularPlural;
window.cargarEmailUsuario = cargarEmailUsuario;
window.actualizarFechaActa = actualizarFechaActa;
window.mostrarAlerta = mostrarAlerta;
