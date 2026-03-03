/* ============================================ */
/* ACTA-CREAR.JS                                */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;
let vehiculoActual = null;
let listaVehiculos = [];
let vehicleCounter = 0;

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
    
    actualizarFechaActa();
    agregarListenersFormulario();
    agregarListenerEnter();
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
    
    const usuarioGuardado = sessionStorage.getItem('usuario');
    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);
            userEmailElement.textContent = usuario.email || usuario.correo || 'usuario@institucion.com';
            console.log('✅ Usuario cargado desde sessionStorage:', usuario.email);
            return;
        } catch (error) {
            console.error('Error al parsear usuario de sessionStorage:', error);
        }
    }
    
    if (supabaseClient) {
        supabaseClient.auth.getSession().then(({ data: { session } }) => {
            if (session && session.user) {
                userEmailElement.textContent = session.user.email || 'usuario@institucion.com';
                sessionStorage.setItem('usuario', JSON.stringify({
                    email: session.user.email,
                    id: session.user.id
                }));
            } else {
                userEmailElement.textContent = 'usuario@institucion.com';
            }
        }).catch(error => {
            console.error('Error al obtener sesión:', error);
            userEmailElement.textContent = 'usuario@institucion.com';
        });
    } else {
        userEmailElement.textContent = 'usuario@institucion.com';
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
    
    const previewFuncionarioNombre = document.getElementById('previewFuncionarioNombre');
    const previewFuncionarioCedula = document.getElementById('previewFuncionarioCedula');
    const previewUnidadAsignacion = document.getElementById('previewUnidadAsignacion');
    const previewFirmaFuncionario = document.getElementById('previewFirmaFuncionario');
    const previewCargoFuncionario = document.getElementById('previewCargoFuncionario');
    
    if (previewFuncionarioNombre) previewFuncionarioNombre.textContent = funcionarioNombre || '---';
    if (previewFuncionarioCedula) previewFuncionarioCedula.textContent = funcionarioCedula || '---';
    if (previewUnidadAsignacion) previewUnidadAsignacion.textContent = unidadAsignacion || '---';
    
    if (previewFirmaFuncionario) {
        if (funcionarioNombre && funcionarioCedula) {
            previewFirmaFuncionario.innerHTML = `${funcionarioNombre}, Cédula de Identidad numero ${funcionarioCedula}`;
        } else if (funcionarioNombre) {
            previewFirmaFuncionario.innerHTML = `${funcionarioNombre}, Cédula de Identidad numero V-00.000.000`;
        } else {
            previewFirmaFuncionario.textContent = '---';
        }
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
        if (textoUnidad) textoUnidad.textContent = 'Estas unidades son asignadas';
        if (textoUso) textoUso.textContent = 'estas unidades son asignadas';
        if (textoUnidad2) textoUnidad2.textContent = 'las unidades descritas son';
    } else {
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
    
    if (!terminoBusqueda) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
        return;
    }
    
    if (!supabaseClient) {
        mostrarAlerta('❌ Error de conexión con la base de datos', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
        return;
    }
    
    try {
        let vehiculoEncontrado = null;
        
        // Búsqueda por PLACA
        let { data: dataPlaca, error: errorPlaca } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .eq('placa', terminoBusqueda.toUpperCase())
            .limit(1);
        
        if (dataPlaca && dataPlaca.length > 0 && !errorPlaca) {
            vehiculoEncontrado = dataPlaca[0];
        } else {
            // Búsqueda por FACSÍMIL
            let { data: dataFacsimil, error: errorFacsimil } = await supabaseClient
                .from('vehiculos')
                .select('*')
                .eq('facsimil', terminoBusqueda.toUpperCase())
                .limit(1);
            
            if (dataFacsimil && dataFacsimil.length > 0 && !errorFacsimil) {
                vehiculoEncontrado = dataFacsimil[0];
            } else {
                // Búsqueda por SERIAL CARROCERÍA
                let { data: dataCarroceria, error: errorCarroceria } = await supabaseClient
                    .from('vehiculos')
                    .select('*')
                    .eq('s_carroceria', terminoBusqueda.toUpperCase())
                    .limit(1);
                
                if (dataCarroceria && dataCarroceria.length > 0 && !errorCarroceria) {
                    vehiculoEncontrado = dataCarroceria[0];
                } else {
                    // Búsqueda por SERIAL MOTOR
                    let { data: dataMotor, error: errorMotor } = await supabaseClient
                        .from('vehiculos')
                        .select('*')
                        .eq('s_motor', terminoBusqueda.toUpperCase())
                        .limit(1);
                    
                    if (dataMotor && dataMotor.length > 0 && !errorMotor) {
                        vehiculoEncontrado = dataMotor[0];
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
        
        // Verificar duplicados
        const yaExiste = listaVehiculos.some(v =>
            v.placa === vehiculoEncontrado.placa ||
            v.s_carroceria === vehiculoEncontrado.s_carroceria
        );
        
        if (yaExiste) {
            mostrarAlerta('⚠️ Este vehículo ya está en la lista del acta', 'info', searchAlert);
            if (btnAgregar) btnAgregar.disabled = true;
            return;
        }
        
        vehiculoActual = {
            id: vehiculoEncontrado.id,
            marca: vehiculoEncontrado.marca || 'N/P',
            modelo: vehiculoEncontrado.modelo || '',
            s_carroceria: vehiculoEncontrado.s_carroceria || 'N/P',
            s_motor: vehiculoEncontrado.s_motor || 'N/P',
            placa: vehiculoEncontrado.placa || 'N/P',
            facsimil: vehiculoEncontrado.facsimil || 'N/P'
        };
        
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
    
    const yaExiste = listaVehiculos.some(v =>
        v.placa === vehiculoActual.placa ||
        v.s_carroceria === vehiculoActual.s_carroceria
    );
    
    if (yaExiste) {
        mostrarAlerta('⚠️ Este vehículo ya está en la lista del acta', 'error');
        return;
    }
    
    vehicleCounter++;
    vehiculoActual.tempId = vehicleCounter;
    listaVehiculos.push(vehiculoActual);
    
    renderizarListaVehiculos();
    renderizarVehiculosEnActa();
    actualizarTextoSingularPlural();
    
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
    if (index >= 0) {
        listaVehiculos.splice(index, 1);
        renderizarListaVehiculos();
        renderizarVehiculosEnActa();
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
    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    
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
    if (listaVehiculos.length === 0) {
        mostrarAlerta('⚠️ Primero debe agregar al menos un vehículo al acta', 'error');
        return;
    }
    
    const funcionarioNombre = document.getElementById('funcionarioNombre')?.value || '';
    if (!funcionarioNombre) {
        mostrarAlerta('⚠️ Primero debe completar los datos del funcionario', 'error');
        return;
    }
    
    actualizarActa();
    renderizarVehiculosEnActa();
    window.print();
}

// ============================================
// ✅ GUARDAR ACTA EN BASE DE DATOS
// ============================================
async function guardarActa() {
    const funcionarioNombre = document.getElementById('funcionarioNombre')?.value || '';
    const funcionarioCedula = document.getElementById('funcionarioCedula')?.value || '';
    const unidadAsignacion = document.getElementById('unidadAsignacion')?.value || '';
    
    if (!funcionarioNombre || !funcionarioCedula || !unidadAsignacion) {
        mostrarAlerta('⚠️ Por favor complete todos los campos obligatorios del formulario', 'error');
        return;
    }
    
    if (listaVehiculos.length === 0) {
        mostrarAlerta('⚠️ Primero debe agregar al menos un vehículo al acta', 'error');
        return;
    }
    
    if (!supabaseClient) {
        mostrarAlerta('❌ Error de conexión con la base de datos', 'error');
        return;
    }
    
    const userEmailElement = document.getElementById('userEmail');
    const createdByEmail = userEmailElement ? userEmailElement.textContent : 'usuario@institucion.com';
    
    const actaData = {
        funcionario_nombre: funcionarioNombre,
        funcionario_cedula: funcionarioCedula,
        funcionario_cargo: document.getElementById('funcionarioCargo')?.value || '',
        unidad_asignacion: unidadAsignacion,
        vehiculos: JSON.stringify(listaVehiculos.map(v => ({
            id: v.id,
            marca: v.marca,
            modelo: v.modelo,
            placa: v.placa,
            facsimil: v.facsimil,
            s_carroceria: v.s_carroceria,
            s_motor: v.s_motor
        }))),
        fecha_dia: document.getElementById('previewDia')?.textContent || '',
        fecha_mes: document.getElementById('previewMes')?.textContent || '',
        fecha_anio: document.getElementById('previewAnio')?.textContent || '',
        director: 'COMISARIO MAYOR (CPNB) Dr. GUILLERMO PARRA PULIDO',
        created_by_email: createdByEmail,
        created_at: new Date().toISOString()
    };
    
    console.log('📦 Datos a enviar:', JSON.stringify(actaData, null, 2));
    
    try {
        const { data, error } = await supabaseClient
            .from('actas_asignacion')
            .insert(actaData);
        
        if (error) throw error;
        
        mostrarAlerta('✅ Acta guardada exitosamente', 'success');
        setTimeout(() => limpiarFormulario(), 2000);
        
    } catch (error) {
        console.error('❌ Error al guardar acta:', error);
        mostrarAlerta(`❌ Error: ${error.message}`, 'error');
    }
}

// ============================================
// ✅ LIMPIAR FORMULARIO COMPLETO
// ============================================
function limpiarFormulario() {
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
    
    listaVehiculos = [];
    vehiculoActual = null;
    vehicleCounter = 0;
    
    renderizarListaVehiculos();
    renderizarVehiculosEnActa();
    actualizarActa();
    actualizarFechaActa();
    
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    if (btnAgregar) btnAgregar.disabled = true;
    
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
