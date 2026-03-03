/* ============================================ */
/* ACTA-CREAR.JS - VERSIÓN CORREGIDA            */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* Búsqueda EXACTA - Sin coincidencias parciales */
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
    if (!userEmailElement) return;
    
    const usuarioGuardado = sessionStorage.getItem('usuario');
    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);
            userEmailElement.textContent = usuario.email || usuario.correo || 'usuario@institucion.com';
            console.log('✅ Usuario cargado desde sessionStorage:', usuario.email);
            return;
        } catch (error) {
            console.error('Error al parsear usuario:', error);
        }
    }
    
    if (supabaseClient) {
        supabaseClient.auth.getSession().then(function(response) {
            const session = response.data.session;
            if (session && session.user) {
                userEmailElement.textContent = session.user.email || 'usuario@institucion.com';
                sessionStorage.setItem('usuario', JSON.stringify({
                    email: session.user.email,
                    id: session.user.id
                }));
            } else {
                userEmailElement.textContent = 'usuario@institucion.com';
            }
        }).catch(function(error) {
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
        previewCargoFuncionario.textContent = funcionarioCargo || (unidadAsignacion ? `Jefe de ${unidadAsignacion}` : '---');
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
// ✅ FUNCIÓN AUXILIAR: Normalizar texto para comparación EXACTA
// ============================================
function normalizarTexto(texto) {
    if (!texto) return '';
    return texto.toString().trim().toUpperCase();
}

// ============================================
// ✅ FUNCIÓN AUXILIAR: Comparación EXACTA de vehículos
// ============================================
function sonVehiculosIguales(v1, v2) {
    // ✅ Solo considera duplicado si hay coincidencia EXACTA en campos no vacíos
    const placa1 = normalizarTexto(v1.placa);
    const placa2 = normalizarTexto(v2.placa);
    const serial1 = normalizarTexto(v1.s_carroceria);
    const serial2 = normalizarTexto(v2.s_carroceria);
    const id1 = v1.id;
    const id2 = v2.id;
    
    // ✅ Comparación EXACTA: solo true si ambos valores existen y son idénticos
    if (placa1 && placa2 && placa1 === placa2) return true;
    if (serial1 && serial2 && serial1 === serial2) return true;
    if (id1 && id2 && id1 === id2) return true;
    
    return false;
}

// ============================================
// ✅ BUSCAR VEHÍCULO - BÚSQUEDA EXACTA CASE-INSENSITIVE
// ============================================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    
    // ✅ Normalizar: quitar espacios, convertir a mayúsculas
    const terminoBusqueda = (searchInput?.value || '').trim().toUpperCase();
    
    if (!terminoBusqueda) {
        mostrarAlerta('⚠️ por favor ingrese un término de búsqueda', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
        return;
    }
    
    if (!supabaseClient) {
        mostrarAlerta('❌ error de conexión con la base de datos', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
        return;
    }
    
    try {
        let vehiculoEncontrado = null;
        
        // 🔍 Campos para búsqueda EXACTA (NO predictiva, NO parcial)
        const camposBusqueda = ['placa', 'facsimil', 's_carroceria', 's_motor', 'n_identificacion'];
        
        for (const campo of camposBusqueda) {
            // ✅ Usar .ilike() para match EXACTO case-insensitive
            // .ilike('ABC123') NO matchea 'ABC1234' ni 'XABC123'
            const response = await supabaseClient
                .from('vehiculos')
                .select('*')
                .ilike(campo, terminoBusqueda)  // ✅ EXACTO + case-insensitive
                .limit(1);
            
            if (response.data && response.data.length > 0 && !response.error) {
                vehiculoEncontrado = response.data[0];
                console.log(`✅ Encontrado por ${campo}:`, vehiculoEncontrado);
                break;
            }
        }
        
        if (!vehiculoEncontrado) {
            mostrarAlerta('❌ vehículo no encontrado', 'error', searchAlert);
            vehiculoActual = null;
            if (btnAgregar) btnAgregar.disabled = true;
            return;
        }
        
        // 🚫 VALIDACIÓN 1: ¿Ya está en lista temporal? (COMPARACIÓN EXACTA)
        const yaEnLista = listaVehiculos.some(v => {
            const p1 = (v.placa || '').toString().trim().toUpperCase();
            const p2 = (vehiculoEncontrado.placa || '').toString().trim().toUpperCase();
            const s1 = (v.s_carroceria || '').toString().trim().toUpperCase();
            const s2 = (vehiculoEncontrado.s_carroceria || '').toString().trim().toUpperCase();
            return (p1 && p2 && p1 === p2) || (s1 && s2 && s1 === s2) || (v.id === vehiculoEncontrado.id);
        });
        
        if (yaEnLista) {
            mostrarAlerta('⚠️ este vehículo ya está en la lista del acta', 'info', searchAlert);
            if (btnAgregar) btnAgregar.disabled = true;
            return;
        }
        
        // 🚫 VALIDACIÓN 2: ¿Ya asignado en otra acta?
        const responseActas = await supabaseClient
            .from('actas_asignacion')
            .select('id, funcionario_nombre, created_at, vehiculos')
            .limit(100);
        
        let vehiculoYaAsignado = false;
        if (responseActas.data?.length > 0) {
            for (const acta of responseActas.data) {
                let vehiculosData = null;
                try {
                    vehiculosData = typeof acta.vehiculos === 'string' 
                        ? JSON.parse(acta.vehiculos) 
                        : acta.vehiculos;
                } catch (e) { continue; }
                
                if (Array.isArray(vehiculosData)) {
                    const encontrado = vehiculosData.some(v => {
                        const p1 = (v.placa || '').toString().trim().toUpperCase();
                        const p2 = (vehiculoEncontrado.placa || '').toString().trim().toUpperCase();
                        const s1 = (v.s_carroceria || '').toString().trim().toUpperCase();
                        const s2 = (vehiculoEncontrado.s_carroceria || '').toString().trim().toUpperCase();
                        return (p1 && p2 && p1 === p2) || (s1 && s2 && s1 === s2) || (v.id === vehiculoEncontrado.id);
                    });
                    if (encontrado) { vehiculoYaAsignado = true; break; }
                }
            }
        }
        
        if (vehiculoYaAsignado) {
            mostrarAlerta('❌ el vehículo ya se encuentra registrado en otra acta', 'error', searchAlert);
            vehiculoActual = null;
            if (btnAgregar) btnAgregar.disabled = true;
            return;
        }
        
        // ✅ Vehículo disponible
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
        mostrarAlerta('✅ vehículo encontrado. puede agregarlo.', 'success', searchAlert);
        
    } catch (error) {
        console.error('Error al buscar:', error);
        mostrarAlerta('❌ error de conexión', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
    }
}
        
        // ✅ Vehículo disponible: guardar en variable temporal
        vehiculoActual = {
            id: vehiculoEncontrado.id,
            marca: vehiculoEncontrado.marca || 'N/P',
            modelo: vehiculoEncontrado.modelo || '',
            s_carroceria: vehiculoEncontrado.s_carroceria || 'N/P',
            s_motor: vehiculoEncontrado.s_motor || 'N/P',
            placa: vehiculoEncontrado.placa || 'N/P',
            facsimil: vehiculoEncontrado.facsimil || 'N/P'
        };
        
        console.log('✅ vehiculoActual establecido:', vehiculoActual);
        
        // Habilitar botón para agregar
        if (btnAgregar) btnAgregar.disabled = false;
        mostrarAlerta('✅ vehículo encontrado y disponible. puede agregarlo a la lista.', 'success', searchAlert);
        
    } catch (error) {
        console.error('Error al buscar vehículo:', error);
        mostrarAlerta('❌ error de conexión. intente nuevamente.', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
    }
}

// ============================================
// ✅ AGREGAR VEHÍCULO AL ACTA (VALIDACIÓN ESTRICTA)
// ============================================
function agregarVehiculoAlActa() {
    if (!vehiculoActual) {
        mostrarAlerta('⚠️ primero debe buscar un vehículo', 'error');
        return;
    }
    
    // ✅ Validación EXACTA con normalización
    const yaExiste = listaVehiculos.some(v => {
        const p1 = (v.placa || '').toString().trim().toUpperCase();
        const p2 = (vehiculoActual.placa || '').toString().trim().toUpperCase();
        const s1 = (v.s_carroceria || '').toString().trim().toUpperCase();
        const s2 = (vehiculoActual.s_carroceria || '').toString().trim().toUpperCase();
        return (p1 && p2 && p1 === p2) || (s1 && s2 && s1 === s2) || (v.id === vehiculoActual.id);
    });
    
    if (yaExiste) {
        mostrarAlerta('⚠️ este vehículo ya está en la lista del acta', 'error');
        return;
    }
    
    vehicleCounter++;
    vehiculoActual.tempId = vehicleCounter;
    listaVehiculos.push({ ...vehiculoActual });
    
    // ✅ Verificar que las funciones existen antes de llamar
    if (typeof renderizarListaVehiculos === 'function') renderizarListaVehiculos();
    if (typeof renderizarVehiculosEnActa === 'function') renderizarVehiculosEnActa();
    if (typeof actualizarTextoSingularPlural === 'function') actualizarTextoSingularPlural();
    
    const searchInput = document.getElementById('searchInput');
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    if (searchInput) searchInput.value = '';
    vehiculoActual = null;
    if (btnAgregar) btnAgregar.disabled = true;
    
    mostrarAlerta(`✅ agregado. total: ${listaVehiculos.length}`, 'success');
}
// ============================================
// ✅ RENDERIZAR LISTA DE VEHÍCULOS
// ============================================
function renderizarListaVehiculos() {
    const tbody = document.getElementById('vehiclesListBody');
    const section = document.getElementById('vehiclesListSection');
    const count = document.getElementById('vehiclesCount');
    
    if (!tbody || !section || !count) {
        console.warn('⚠️ Elementos del DOM no encontrados para renderizarListaVehiculos');
        return;
    }
    
    if (listaVehiculos.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    count.textContent = listaVehiculos.length;
    
    tbody.innerHTML = listaVehiculos.map(vehiculo => `
        <tr>
            <td>${vehiculo.marca} ${vehiculo.modelo}</td>
            <td>${vehiculo.placa}</td>
            <td>${vehiculo.s_carroceria}</td>
            <td>${vehiculo.s_motor}</td>
            <td>${vehiculo.facsimil}</td>
            <td>
                <button class="btn-remove-vehicle" onclick="eliminarVehiculo(${vehiculo.tempId})">
                    🗑️ eliminar
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
        
        if (typeof renderizarListaVehiculos === 'function') renderizarListaVehiculos();
        if (typeof renderizarVehiculosEnActa === 'function') renderizarVehiculosEnActa();
        if (typeof actualizarTextoSingularPlural === 'function') actualizarTextoSingularPlural();
        
        mostrarAlerta(
            listaVehiculos.length === 0
                ? '🗑️ vehículo eliminado. la lista está vacía.'
                : `🗑️ vehículo eliminado. total: ${listaVehiculos.length} vehículo(s)`,
            'info'
        );
    }
}

// ============================================
// ✅ RENDERIZAR VEHÍCULOS EN EL ACTA
// ============================================
function renderizarVehiculosEnActa() {
    const tbody = document.getElementById('actaVehiclesBody');
    if (!tbody) return;
    
    if (listaVehiculos.length === 0) {
        tbody.innerHTML = `<tr><td>---</td><td>---</td><td>---</td><td>---</td><td>---</td></tr>`;
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
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    
    ['previewDia','previewMes','previewAnio'].forEach((id, i) => {
        const el = document.getElementById(id);
        if (el) el.textContent = i === 0 ? fecha.getDate() : i === 1 ? meses[fecha.getMonth()] : fecha.getFullYear();
    });
}

// ============================================
// ✅ AGREGAR LISTENERS AL FORMULARIO
// ============================================
function agregarListenersFormulario() {
    ['funcionarioNombre','funcionarioCedula','unidadAsignacion','funcionarioCargo'].forEach(id => {
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
        searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarVehiculo();
            }
        });
    }
}

// ============================================
// ✅ MOSTRAR ALERTAS CON SCROLL AUTOMÁTICO
// ============================================
function mostrarAlerta(mensaje, tipo, elemento = null) {
    const alertElement = elemento || document.getElementById('searchAlert');
    if (!alertElement) {
        console.error('❌ elemento de alerta no encontrado');
        return;
    }
    
    alertElement.textContent = mensaje;
    alertElement.className = `alert alert-${tipo}`;
    alertElement.style.display = 'block';
    
    // 🔄 SCROLL SUAVE HACIA LA ALERTA
    setTimeout(() => {
        alertElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }, 100);
    
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
        mostrarAlerta('⚠️ primero debe agregar al menos un vehículo al acta', 'error');
        return;
    }
    
    if (!document.getElementById('funcionarioNombre')?.value) {
        mostrarAlerta('⚠️ primero debe completar los datos del funcionario', 'error');
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
        mostrarAlerta('⚠️ por favor complete todos los campos obligatorios', 'error');
        return;
    }
    
    if (listaVehiculos.length === 0) {
        mostrarAlerta('⚠️ primero debe agregar al menos un vehículo al acta', 'error');
        return;
    }
    
    if (!supabaseClient) {
        mostrarAlerta('❌ error de conexión con la base de datos', 'error');
        return;
    }
    
    const createdByEmail = document.getElementById('userEmail')?.textContent || 'usuario@institucion.com';
    
    const actaData = {
        funcionario_nombre: funcionarioNombre,
        funcionario_cedula: funcionarioCedula,
        funcionario_cargo: document.getElementById('funcionarioCargo')?.value || '',
        unidad_asignacion: unidadAsignacion,
        vehiculos: listaVehiculos.map(v => ({
            id: v.id, marca: v.marca, modelo: v.modelo, placa: v.placa,
            facsimil: v.facsimil, s_carroceria: v.s_carroceria, s_motor: v.s_motor
        })),
        fecha_dia: document.getElementById('previewDia')?.textContent || '',
        fecha_mes: document.getElementById('previewMes')?.textContent || '',
        fecha_anio: document.getElementById('previewAnio')?.textContent || '',
        director: 'COMISARIO MAYOR (CPNB) Dr. GUILLERMO PARRA PULIDO',
        created_by_email: createdByEmail,
        created_at: new Date().toISOString()
    };
    
    console.log('📦 datos a enviar:', JSON.stringify(actaData, null, 2));
    
    try {
        const { error } = await supabaseClient.from('actas_asignacion').insert(actaData);
        if (error) throw error;
        
        mostrarAlerta('✅ acta guardada exitosamente', 'success');
        setTimeout(limpiarFormulario, 2000);
    } catch (error) {
        console.error('❌ error al guardar acta:', error);
        mostrarAlerta(`❌ error: ${error.message}`, 'error');
    }
}

// ============================================
// ✅ LIMPIAR FORMULARIO COMPLETO
// ============================================
function limpiarFormulario() {
    ['searchInput','funcionarioNombre','funcionarioCedula','unidadAsignacion','funcionarioCargo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    listaVehiculos = [];
    vehiculoActual = null;
    vehicleCounter = 0;
    
    renderizarListaVehiculos();
    renderizarVehiculosEnActa();
    actualizarActa();
    actualizarFechaActa();
    
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    if (btnAgregar) btnAgregar.disabled = true;
    
    const section = document.getElementById('vehiclesListSection');
    if (section) section.style.display = 'none';
    
    console.log('✅ formulario limpiado correctamente');
}

// ============================================
// ✅ EXPORTAR FUNCIONES AL SCOPE GLOBAL (CORREGIDO)
// ============================================
window.buscarVehiculo = buscarVehiculo;
window.agregarVehiculoAlActa = agregarVehiculoAlActa;
window.eliminarVehiculo = eliminarVehiculo;
window.renderizarListaVehiculos = renderizarListaVehiculos;
window.renderizarVehiculosEnActa = renderizarVehiculosEnActa;
window.actualizarTextoSingularPlural = actualizarTextoSingularPlural;
window.imprimirActa = imprimirActa;
window.guardarActa = guardarActa;
window.limpiarFormulario = limpiarFormulario;
window.mostrarAlerta = mostrarAlerta;
window.actualizarActa = actualizarActa;
window.cargarEmailUsuario = cargarEmailUsuario;
window.actualizarFechaActa = actualizarFechaActa;
window.normalizarTexto = normalizarTexto;
window.sonVehiculosIguales = sonVehiculosIguales;
