/* ============================================ */
/* ACTA-CREAR.JS                                */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;
let vehiculoActual = null; // Vehículo encontrado en la búsqueda
let listaVehiculos = [];   // Array para almacenar múltiples vehículos

// ============================================
// ✅ INICIALIZAR SUPABASE Y CARGAR USUARIO
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
    
    // Cargar usuario
    cargarUsuario();
    
    // Actualizar fecha automática
    actualizarFechaActa();
    
    // Agregar listeners para actualización en tiempo real
    agregarListenersFormulario();
    
    // Permitir búsqueda con Enter
    agregarListenerEnter();
    
    // Permitir Enter para agregar vehículo
    agregarListenerEnterAgregar();
});

// ============================================
// ✅ CARGAR DATOS DEL USUARIO
// ============================================
function cargarUsuario() {
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
            userEmailElement.textContent = usuario.email || usuario.correo || 'usuario@institucion.com';
            console.log('✅ Usuario cargado desde sessionStorage:', usuario.email || usuario.correo);
            return;
        } catch (error) {
            console.error('Error al parsear usuario de sessionStorage:', error);
        }
    }
    
    // Si no hay usuario en sessionStorage, intentar obtener de Supabase auth
    if (supabaseClient) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
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
// ✅ BUSCAR VEHÍCULO EN BASE DE DATOS
// ============================================
async function buscarVehiculo() {
  const termino = document.getElementById('searchInput').value.trim();
  const alertBox = document.getElementById('searchAlert');
  
  if (!termino) {
    mostrarAlerta('⚠️ Ingresa un término de búsqueda', 'alert-info', alertBox);
    return;
  }

  try {
    // Intenta buscar por placa primero
    let { data, error } = await supabase
      .from('vehiculos')
      .select('*')
      .eq('placa', termino)
      .limit(1);

    // Si no encuentra, intenta con facsímil
    if (!data || data.length === 0) {
      ({ data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('facsimil', termino)
        .limit(1));
    }
    
    // Si aún no encuentra, intenta con serial de carrocería
    if (!data || data.length === 0) {
      ({ data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .eq('s_carroceria', termino)
        .limit(1));
    }

    if (error) throw error;
    
    if (data && data.length > 0) {
      mostrarAlerta('✅ Vehículo encontrado', 'alert-success', alertBox);
      mostrarVistaPreviaVehiculo(data[0]);
      // Guarda el vehículo encontrado para usarlo al guardar el acta
      window.vehiculoSeleccionado = data[0];
    } else {
      mostrarAlerta('❌ Vehículo no encontrado', 'alert-error', alertBox);
    }
    
  } catch (err) {
    console.error('Error en búsqueda:', err);
    mostrarAlerta(`❌ Error: ${err.message}`, 'alert-error', alertBox);
  }
}
    // Validar que haya un término de búsqueda
    if (!searchInput) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        vehiculoActual = null;
        btnAgregar.disabled = true;
        return;
    }
    
    // Verificar que supabaseClient esté inicializado
    if (!supabaseClient) {
        mostrarAlerta('❌ Error de conexión con la base de datos', 'error');
        vehiculoActual = null;
        btnAgregar.disabled = true;
        return;
    }
    
    try {
        let data = null;
        
        // BÚSQUEDA EXACTA por placa (primero)
        const { data: dataPlaca, error: errorPlaca } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .eq('placa', searchInput.toUpperCase())
            .single();
        
        if (dataPlaca && !errorPlaca) {
            data = dataPlaca;
        } else {
            // BÚSQUEDA EXACTA por facsimil
            const { data: dataFacsimil, error: errorFacsimil } = await supabaseClient
                .from('vehiculos')
                .select('*')
                .eq('facsimil', searchInput.toUpperCase())
                .single();
            
            if (dataFacsimil && !errorFacsimil) {
                data = dataFacsimil;
            } else {
                // BÚSQUEDA EXACTA por serial de carrocería
                const { data: dataCarroceria, error: errorCarroceria } = await supabaseClient
                    .from('vehiculos')
                    .select('*')
                    .eq('s_carroceria', searchInput.toUpperCase())
                    .single();
                
                if (dataCarroceria && !errorCarroceria) {
                    data = dataCarroceria;
                } else {
                    // BÚSQUEDA EXACTA por serial de motor
                    const { data: dataMotor, error: errorMotor } = await supabaseClient
                        .from('vehiculos')
                        .select('*')
                        .eq('s_motor', searchInput.toUpperCase())
                        .single();
                    
                    if (dataMotor && !errorMotor) {
                        data = dataMotor;
                    } else {
                        // BÚSQUEDA PARCIAL por marca/modelo
                        const { data: dataMarca, error: errorMarca } = await supabaseClient
                            .from('vehiculos')
                            .select('*')
                            .ilike('marca', `%${searchInput}%`)
                            .single();
                        
                        if (dataMarca && !errorMarca) {
                            data = dataMarca;
                        }
                    }
                }
            }
        }
        
        if (!data) {
            mostrarAlerta('❌ Vehículo no encontrado en la base de datos', 'error');
            vehiculoActual = null;
            btnAgregar.disabled = true;
            return;
        }
        
        // Guardar vehículo encontrado en variable temporal
        vehiculoActual = {
            id: data.id,
            marca: data.marca || 'N/P',
            modelo: data.modelo || '',
            serial_carroceria: data.s_carroceria || 'N/P',
            serial_motor: data.s_motor || 'N/P',
            placa: data.placa || 'N/P',
            facsimil: data.facsimil || 'N/P'
        };
        
        // Mostrar vista previa del vehículo encontrado
        mostrarVistaPreviaVehiculo(vehiculoActual);
        
        // Habilitar botón para agregar
        btnAgregar.disabled = false;
        
        mostrarAlerta('✅ Vehículo encontrado. Puede agregarlo a la lista.', 'success');
        
    } catch (error) {
        console.error('Error al buscar vehículo:', error);
        mostrarAlerta('❌ Error de conexión. Intente nuevamente.', 'error');
        vehiculoActual = null;
        btnAgregar.disabled = true;
    }
}

// ============================================
// ✅ MOSTRAR VISTA PREVIA DEL VEHÍCULO
// ============================================
function mostrarVistaPreviaVehiculo(vehiculo) {
  // ✅ Verifica que el elemento existe antes de asignar
  const elMarca = document.getElementById('previewMarcaModelo');
  if (elMarca) {
    elMarca.textContent = `${vehiculo.marca} ${vehiculo.modelo}`.trim();
  }
  
  const elCarroceria = document.getElementById('previewSerialCarroceria');
  if (elCarroceria) {
    elCarroceria.textContent = vehiculo.s_carroceria || 'N/P';
  }
  
  const elMotor = document.getElementById('previewSerialMotor');
  if (elMotor) {
    elMotor.textContent = vehiculo.s_motor || 'N/P';
  }
  
  const elPlaca = document.getElementById('previewPlaca');
  if (elPlaca) {
    elPlaca.textContent = vehiculo.placa || 'N/P';
  }
  
  const elFacsimil = document.getElementById('previewFacsimil');
  if (elFacsimil) {
    elFacsimil.textContent = vehiculo.facsimil || 'N/P';
  }
}
// ============================================
// ✅ AGREGAR VEHÍCULO A LA LISTA
// ============================================
function agregarVehiculoALista() {
    if (!vehiculoActual) {
        mostrarAlerta('⚠️ Primero debe buscar un vehículo', 'error');
        return;
    }
    
    // Verificar si el vehículo ya está en la lista (por placa o serial)
    const yaExiste = listaVehiculos.some(v => 
        v.placa === vehiculoActual.placa || 
        v.serial_carroceria === vehiculoActual.serial_carroceria
    );
    
    if (yaExiste) {
        mostrarAlerta('⚠️ Este vehículo ya está en la lista del acta', 'error');
        return;
    }
    
    // Agregar vehículo a la lista
    listaVehiculos.push(vehiculoActual);
    
    // Actualizar la tabla de vehículos
    renderizarListaVehiculos();
    
    // Actualizar el acta
    renderizarVehiculosEnActa();
    
    // Limpiar búsqueda
    document.getElementById('searchInput').value = '';
    vehiculoActual = null;
    document.getElementById('btnAgregarVehiculo').disabled = true;
    
    mostrarAlerta(`✅ Vehículo agregado. Total: ${listaVehiculos.length} vehículo(s)`, 'success');
}

// ============================================
// ✅ RENDERIZAR LISTA DE VEHÍCULOS
// ============================================
function renderizarListaVehiculos() {
    const tbody = document.getElementById('vehiclesListBody');
    const section = document.getElementById('vehiclesListSection');
    const count = document.getElementById('vehiclesCount');
    
    if (listaVehiculos.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    count.textContent = listaVehiculos.length;
    
    tbody.innerHTML = listaVehiculos.map((vehiculo, index) => `
        <tr>
            <td>${vehiculo.marca} ${vehiculo.modelo}</td>
            <td>${vehiculo.serial_carroceria}</td>
            <td>${vehiculo.serial_motor}</td>
            <td>${vehiculo.placa}</td>
            <td>${vehiculo.facsimil}</td>
            <td>
                <button class="btn-delete" onclick="eliminarVehiculo(${index})">
                    🗑️ Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// ✅ ELIMINAR VEHÍCULO DE LA LISTA
// ============================================
function eliminarVehiculo(index) {
    if (index >= 0 && index < listaVehiculos.length) {
        listaVehiculos.splice(index, 1);
        renderizarListaVehiculos();
        renderizarVehiculosEnActa();
        
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
            <td>${vehiculo.serial_carroceria}</td>
            <td>${vehiculo.serial_motor}</td>
            <td>${vehiculo.placa}</td>
            <td>${vehiculo.facsimil}</td>
        </tr>
    `).join('');
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
    // Validar que haya vehículos en la lista
    if (listaVehiculos.length === 0) {
        mostrarAlerta('⚠️ Primero debe agregar al menos un vehículo al acta', 'error');
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
            cargo: document.getElementById('funcionarioCargo').value,
            unidad: unidadAsignacion
        },
        vehiculos: listaVehiculos, // Array con todos los vehículos
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
       const { data, error } = await supabase
  .from('vehiculos')
  .select('*')  // ← Sin espacio
  .eq('placa', terminoBusqueda)
  .limit(1);  // ← Importante: limita a 1 resultado
        
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
// ✅ PERMITIR AGREGAR CON ENTER
// ============================================
function agregarListenerEnterAgregar() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && vehiculoActual) {
                e.preventDefault();
                agregarVehiculoALista();
            }
        });
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
    
    // Limpiar lista de vehículos
    listaVehiculos = [];
    vehiculoActual = null;
    
    // Limpiar vista previa
    renderizarListaVehiculos();
    renderizarVehiculosEnActa();
    
    // Deshabilitar botón de agregar
    document.getElementById('btnAgregarVehiculo').disabled = true;
    
    // Restablecer valores por defecto en el acta
    document.getElementById('previewFuncionarioNombre').textContent = '---';
    document.getElementById('previewFuncionarioCedula').textContent = '---';
    document.getElementById('previewFirmaFuncionario').textContent = '---';
    document.getElementById('previewUnidadAsignacion').textContent = '---';
    document.getElementById('previewCargoFuncionario').textContent = '---';
    
    // Actualizar fecha
    actualizarFechaActa();
    
    console.log('✅ Formulario limpiado correctamente');
}

// ============================================
// ✅ EXPORTAR FUNCIONES PARA USO GLOBAL
// ============================================
window.buscarVehiculo = buscarVehiculo;
window.imprimirActa = imprimirActa;
window.guardarActa = guardarActa;
window.actualizarActa = actualizarActa;
window.agregarVehiculoALista = agregarVehiculoALista;
window.eliminarVehiculo = eliminarVehiculo;
window.limpiarFormulario = limpiarFormulario;
window.mostrarAlerta = mostrarAlerta;
window.cargarUsuario = cargarUsuario;
