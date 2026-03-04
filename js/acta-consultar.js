/* ============================================ */
/* ACTA-MODIFICAR.JS                            */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* CORREGIDO: Actualización REAL en BD          */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;
let vehiculoActual = null;
let listaVehiculos = [];
let vehicleCounter = 0;
let actaActualId = null;
let listaActas = [];

// ============================================
// ✅ INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOMContentLoaded - Iniciando acta-modificar.js');
    
    if (typeof window.supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY) {
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log('✅ Supabase inicializado correctamente');
    } else {
        console.error('❌ Error: Credenciales de Supabase no encontradas. Verifica config.js');
        console.log('SUPABASE_URL:', window.SUPABASE_URL);
        console.log('SUPABASE_KEY:', window.SUPABASE_KEY);
    }
    
    actualizarFechaActa();
    agregarListenersFormulario();
    agregarListenerEnter();
    cargarEmailUsuario();
    cargarListaActas();
    
    console.log('✅ Inicialización completada');
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
// ✅ CARGAR LISTA DE ACTAS EXISTENTES
// ============================================
async function cargarListaActas() {
    const actaSelect = document.getElementById('actaSelect');
    const btnCargar = document.getElementById('btnCargarActa');
    const selectorAlert = document.getElementById('selectorAlert');
    
    console.log('🔍 cargandoListaActas - supabaseClient:', supabaseClient ? 'OK' : 'NULL');
    
    if (!supabaseClient) {
        mostrarAlerta('❌ error de conexión con la base de datos', 'error', selectorAlert);
        return;
    }
    
    try {
        actaSelect.innerHTML = '<option value="">-- Cargando actas... --</option>';
        actaSelect.disabled = true;
        if (btnCargar) btnCargar.disabled = true;
        
        const { data, error } = await supabaseClient
            .from('actas_asignacion')
            .select('id, funcionario_nombre, funcionario_cedula, unidad_asignacion, created_at')
            .order('created_at', { ascending: false })
            .limit(100);
        
        console.log('📊 Respuesta de actas:', { data, error });
        
        if (error) throw error;
        
        listaActas = data || [];
        
        if (listaActas.length === 0) {
            actaSelect.innerHTML = '<option value="">-- No hay actas registradas --</option>';
            mostrarAlerta('ℹ️ no hay actas registradas en la base de datos', 'info', selectorAlert);
            return;
        }
        
        actaSelect.innerHTML = '<option value="">-- Seleccione una acta --</option>' + 
            listaActas.map(acta => {
                const fecha = acta.created_at ? new Date(acta.created_at).toLocaleDateString('es-VE') : 'N/A';
                return `<option value="${acta.id}">
                    📄 ${acta.funcionario_nombre} | C.I: ${acta.funcionario_cedula} | ${acta.unidad_asignacion} | ${fecha}
                </option>`;
            }).join('');
        
        actaSelect.disabled = false;
        if (btnCargar) btnCargar.disabled = false;
        mostrarAlerta(`✅ ${listaActas.length} acta(s) cargada(s)`, 'success', selectorAlert);
        
    } catch (error) {
        console.error('❌ Error al cargar actas:', error);
        actaSelect.innerHTML = '<option value="">-- Error al cargar --</option>';
        mostrarAlerta('❌ error al cargar la lista de actas: ' + error.message, 'error', selectorAlert);
    }
}

// ============================================
// ✅ RECARGAR LISTA DE ACTAS
// ============================================
function recargarListaActas() {
    const selectorAlert = document.getElementById('selectorAlert');
    mostrarAlerta('🔄 actualizando lista...', 'info', selectorAlert);
    cargarListaActas();
}

// ============================================
// ✅ CARGAR ACTA SELECCIONADA PARA EDITAR
// ============================================
async function cargarActaSeleccionada() {
    const actaSelect = document.getElementById('actaSelect');
    const selectorAlert = document.getElementById('selectorAlert');
    const btnActualizar = document.getElementById('btnActualizarActa');
    
    const actaId = actaSelect?.value;
    
    console.log('🔍 cargarActaSeleccionada - actaId:', actaId);
    console.log('🔍 supabaseClient:', supabaseClient ? 'OK' : 'NULL');
    
    if (!actaId) {
        mostrarAlerta('⚠️ por favor seleccione una acta', 'error', selectorAlert);
        return;
    }
    
    if (!supabaseClient) {
        mostrarAlerta('❌ error de conexión', 'error', selectorAlert);
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('actas_asignacion')
            .select('*')
            .eq('id', actaId)
            .single();
        
        console.log('📊 Respuesta de cargar acta:', { data, error });
        
        if (error || !data) {
            console.error('❌ Error al cargar acta:', error);
            throw error;
        }
        
        // ✅ GUARDAR ID DEL ACTA ACTUAL (CRÍTICO)
        actaActualId = data.id;
        console.log('✅ actaActualId establecido:', actaActualId);
        
        // ✅ Cargar datos del funcionario
        document.getElementById('funcionarioNombre').value = data.funcionario_nombre || '';
        document.getElementById('funcionarioCedula').value = data.funcionario_cedula || '';
        document.getElementById('unidadAsignacion').value = data.unidad_asignacion || '';
        document.getElementById('funcionarioCargo').value = data.funcionario_cargo || '';
        document.getElementById('actaId').value = data.id;
        
        // ✅ Cargar fecha si existe
        if (data.fecha_dia) document.getElementById('previewDia').textContent = data.fecha_dia;
        if (data.fecha_mes) document.getElementById('previewMes').textContent = data.fecha_mes;
        if (data.fecha_anio) document.getElementById('previewAnio').textContent = data.fecha_anio;
        
        // ✅ Cargar vehículos
        let vehiculosData = null;
        try {
            if (typeof data.vehiculos === 'string') {
                vehiculosData = JSON.parse(data.vehiculos);
            } else {
                vehiculosData = data.vehiculos;
            }
        } catch (e) {
            console.error('Error al parsear vehículos:', e);
            vehiculosData = [];
        }
        
        listaVehiculos = Array.isArray(vehiculosData) ? vehiculosData : [];
        vehicleCounter = listaVehiculos.length;
        
        console.log('🚗 Vehículos cargados:', listaVehiculos.length);
        
        // ✅ Asignar tempId a cada vehículo cargado
        listaVehiculos.forEach((v, index) => {
            if (!v.tempId) v.tempId = index + 1;
        });
        
        // ✅ Renderizar
        renderizarListaVehiculos();
        renderizarVehiculosEnActa();
        actualizarActa();
        actualizarTextoSingularPlural();
        
        // ✅ HABILITAR BOTÓN DE ACTUALIZAR
        if (btnActualizar) {
            btnActualizar.disabled = false;
            console.log('✅ Botón actualizar habilitado');
        }
        
        mostrarAlerta(`✅ acta #${actaId} cargada. ${listaVehiculos.length} vehículo(s)`, 'success', selectorAlert);
        
        // 🔍 Scroll hacia el formulario
        document.querySelector('.form-section')?.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('❌ Error al cargar acta:', error);
        mostrarAlerta('❌ error al cargar la acta seleccionada: ' + error.message, 'error', selectorAlert);
    }
}

// ============================================
// ✅ ACTUALIZAR EL ACTA EN TIEMPO REAL (Preview)
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
// ✅ FUNCIÓN AUXILIAR: Normalizar texto
// ============================================
function normalizarTexto(texto) {
    if (!texto) return '';
    return texto.toString().trim().toUpperCase();
}

// ============================================
// ✅ FUNCIÓN AUXILIAR: Comparación EXACTA de vehículos
// ============================================
function sonVehiculosIguales(v1, v2) {
    const placa1 = normalizarTexto(v1.placa);
    const placa2 = normalizarTexto(v2.placa);
    const serial1 = normalizarTexto(v1.s_carroceria);
    const serial2 = normalizarTexto(v2.s_carroceria);
    const id1 = v1.id;
    const id2 = v2.id;
    
    if (placa1 && placa2 && placa1 === placa2) return true;
    if (serial1 && serial2 && serial1 === serial2) return true;
    if (id1 && id2 && id1 === id2) return true;
    
    return false;
}

// ============================================
// ✅ BUSCAR VEHÍCULO EN BASE DE DATOS
// ============================================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    
    const terminoBusqueda = normalizarTexto(searchInput?.value);
    
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
        const camposBusqueda = ['placa', 'facsimil', 's_carroceria', 's_motor', 'n_identificacion'];
        
        for (const campo of camposBusqueda) {
            const response = await supabaseClient
                .from('vehiculos')
                .select('*')
                .eq(campo, terminoBusqueda)
                .limit(1);
            
            if (response.data && response.data.length > 0 && !response.error) {
                vehiculoEncontrado = response.data[0];
                break;
            }
        }
        
        if (!vehiculoEncontrado) {
            mostrarAlerta('❌ vehículo no encontrado en la base de datos', 'error', searchAlert);
            vehiculoActual = null;
            if (btnAgregar) btnAgregar.disabled = true;
            return;
        }
        
        const yaEnLista = listaVehiculos.some(v => sonVehiculosIguales(v, vehiculoEncontrado));
        if (yaEnLista) {
            mostrarAlerta('⚠️ este vehículo ya está en la lista del acta', 'info', searchAlert);
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
        mostrarAlerta('✅ vehículo encontrado. puede agregarlo.', 'success', searchAlert);
        
    } catch (error) {
        console.error('Error al buscar vehículo:', error);
        mostrarAlerta('❌ error de conexión', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
    }
}

// ============================================
// ✅ AGREGAR VEHÍCULO AL ACTA
// ============================================
function agregarVehiculoAlActa() {
    if (!vehiculoActual) {
        mostrarAlerta('⚠️ primero debe buscar un vehículo', 'error');
        return;
    }
    
    const yaExiste = listaVehiculos.some(v => {
        if (v.id && vehiculoActual.id && v.id === vehiculoActual.id) return true;
        
        const placa1 = (v.placa || '').toString().trim().toUpperCase();
        const placa2 = (vehiculoActual.placa || '').toString().trim().toUpperCase();
        const placaValida1 = placa1 && placa1 !== 'N/P' && placa1 !== 'N/D' && placa1.length >= 6;
        const placaValida2 = placa2 && placa2 !== 'N/P' && placa2 !== 'N/D' && placa2.length >= 6;
        
        if (placaValida1 && placaValida2 && placa1 === placa2) return true;
        
        const serial1 = (v.s_carroceria || '').toString().trim().toUpperCase();
        const serial2 = (vehiculoActual.s_carroceria || '').toString().trim().toUpperCase();
        const serialValido1 = serial1 && serial1 !== 'N/P' && serial1 !== 'N/D' && serial1.length >= 10;
        const serialValido2 = serial2 && serial2 !== 'N/P' && serial2 !== 'N/D' && serial2.length >= 10;
        
        if (serialValido1 && serialValido2 && serial1 === serial2) return true;
        
        return false;
    });
    
    if (yaExiste) {
        mostrarAlerta('⚠️ este vehículo ya está en la lista del acta', 'error');
        return;
    }
    
    vehicleCounter++;
    vehiculoActual.tempId = vehicleCounter;
    listaVehiculos.push({ ...vehiculoActual });
    
    if (typeof renderizarListaVehiculos === 'function') renderizarListaVehiculos();
    if (typeof renderizarVehiculosEnActa === 'function') renderizarVehiculosEnActa();
    if (typeof actualizarTextoSingularPlural === 'function') actualizarTextoSingularPlural();
    
    const searchInput = document.getElementById('searchInput');
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    if (searchInput) searchInput.value = '';
    vehiculoActual = null;
    if (btnAgregar) btnAgregar.disabled = true;
    
    // ✅ Habilitar botón de actualizar si hay cambios
    if (actaActualId) {
        const btnActualizar = document.getElementById('btnActualizarActa');
        if (btnActualizar) {
            btnActualizar.disabled = false;
            console.log('✅ Botón actualizar habilitado después de agregar vehículo');
        }
    }
    
    mostrarAlerta(`✅ vehículo agregado. total: ${listaVehiculos.length}`, 'success');
}

// ============================================
// ✅ RENDERIZAR LISTA DE VEHÍCULOS
// ============================================
function renderizarListaVehiculos() {
    const tbody = document.getElementById('vehiclesListBody');
    const section = document.getElementById('vehiclesListSection');
    const count = document.getElementById('vehiclesCount');
    
    if (!tbody || !section || !count) return;
    
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
        
        if (actaActualId) {
            const btnActualizar = document.getElementById('btnActualizarActa');
            if (btnActualizar) btnActualizar.disabled = false;
        }
        
        mostrarAlerta(
            listaVehiculos.length === 0
                ? '🗑️ vehículo eliminado. la lista está vacía.'
                : `🗑️ vehículo eliminado. total: ${listaVehiculos.length}`,
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
// ✅ MOSTRAR ALERTAS
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
    
    setTimeout(() => {
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    if (tipo !== 'error') {
        setTimeout(() => { alertElement.style.display = 'none'; }, 5000);
    }
}

// ============================================
// ✅ IMPRIMIR ACTA
// ============================================
function imprimirActa() {
    if (listaVehiculos.length === 0) {
        mostrarAlerta('⚠️ primero debe agregar al menos un vehículo', 'error');
        return;
    }
    if (!document.getElementById('funcionarioNombre')?.value) {
        mostrarAlerta('⚠️ complete los datos del funcionario', 'error');
        return;
    }
    
    actualizarActa();
    renderizarVehiculosEnActa();
    window.print();
}

// ============================================
// ✅ ACTUALIZAR ACTA EN BASE DE DATOS (CORREGIDO)
// ============================================
async function actualizarActaEnBD() {
    console.log('🔍 actualizarActaEnBD - INICIANDO');
    console.log('🔍 actaActualId:', actaActualId);
    console.log('🔍 supabaseClient:', supabaseClient ? 'OK' : 'NULL');
    console.log('🔍 listaVehiculos.length:', listaVehiculos.length);
    
    // ✅ VALIDACIÓN 1: Verificar ID del acta
    if (!actaActualId) {
        console.error('❌ actaActualId es null o undefined');
        mostrarAlerta('⚠️ primero debe cargar una acta para modificar', 'error');
        return;
    }
    
    // ✅ VALIDACIÓN 2: Campos obligatorios
    const funcionarioNombre = document.getElementById('funcionarioNombre')?.value || '';
    const funcionarioCedula = document.getElementById('funcionarioCedula')?.value || '';
    const unidadAsignacion = document.getElementById('unidadAsignacion')?.value || '';
    
    if (!funcionarioNombre || !funcionarioCedula || !unidadAsignacion) {
        mostrarAlerta('⚠️ complete todos los campos obligatorios', 'error');
        return;
    }
    
    // ✅ VALIDACIÓN 3: Al menos un vehículo
    if (listaVehiculos.length === 0) {
        mostrarAlerta('⚠️ el acta debe tener al menos un vehículo', 'error');
        return;
    }
    
    // ✅ VALIDACIÓN 4: Cliente Supabase
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
        updated_at: new Date().toISOString()
    };
    
    console.log('📦 datos a actualizar:', JSON.stringify(actaData, null, 2));
    console.log('🔍 ID del acta a actualizar:', actaActualId);
    
    try {
        console.log('🔍 Ejecutando update en Supabase...');
        
        const { data, error } = await supabaseClient
            .from('actas_asignacion')
            .update(actaData)
            .eq('id', actaActualId)
            .select();  // ✅ Agregar .select() para verificar qué se actualizó
        
        console.log('📊 Respuesta de update:', { data, error });
        
        if (error) {
            console.error('❌ Error de Supabase:', error);
            throw error;
        }
        
        if (!data || data.length === 0) {
            console.error('❌ No se actualizó ninguna fila - RLS o ID incorrecto');
            mostrarAlerta('❌ no se pudo actualizar - verifique permisos o ID del acta', 'error');
            return;
        }
        
        console.log('✅ Acta actualizada exitosamente:', data[0].id);
        mostrarAlerta('✅ acta actualizada exitosamente', 'success');
        document.getElementById('btnActualizarActa').disabled = true;
        
        // ✅ Recargar lista de actas para mostrar cambios
        setTimeout(() => {
            recargarListaActas();
        }, 1000);
        
    } catch (error) {
        console.error('❌ error al actualizar acta:', error);
        console.error('📋 Detalles del error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        mostrarAlerta(`❌ error: ${error.message}`, 'error');
    }
}

// ============================================
// ✅ LIMPIAR FORMULARIO
// ============================================
function limpiarFormulario() {
    ['searchInput','funcionarioNombre','funcionarioCedula','unidadAsignacion','funcionarioCargo','actaId'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    listaVehiculos = [];
    vehiculoActual = null;
    vehicleCounter = 0;
    actaActualId = null;
    
    renderizarListaVehiculos();
    renderizarVehiculosEnActa();
    actualizarActa();
    actualizarFechaActa();
    
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    const btnActualizar = document.getElementById('btnActualizarActa');
    if (btnAgregar) btnAgregar.disabled = true;
    if (btnActualizar) btnActualizar.disabled = true;
    
    const section = document.getElementById('vehiclesListSection');
    if (section) section.style.display = 'none';
    
    console.log('✅ formulario limpiado');
}

// ============================================
// ✅ EXPORTAR FUNCIONES GLOBALES (CRÍTICO)
// ============================================
window.buscarVehiculo = buscarVehiculo;
window.agregarVehiculoAlActa = agregarVehiculoAlActa;
window.eliminarVehiculo = eliminarVehiculo;
window.renderizarListaVehiculos = renderizarListaVehiculos;
window.renderizarVehiculosEnActa = renderizarVehiculosEnActa;
window.actualizarTextoSingularPlural = actualizarTextoSingularPlural;
window.imprimirActa = imprimirActa;
window.actualizarActaEnBD = actualizarActaEnBD;  // ✅ ESTA ES LA QUE FALLABA
window.limpiarFormulario = limpiarFormulario;
window.mostrarAlerta = mostrarAlerta;
window.actualizarActa = actualizarActa;
window.cargarEmailUsuario = cargarEmailUsuario;
window.actualizarFechaActa = actualizarFechaActa;
window.cargarListaActas = cargarListaActas;
window.cargarActaSeleccionada = cargarActaSeleccionada;
window.recargarListaActas = recargarListaActas;
window.normalizarTexto = normalizarTexto;
window.sonVehiculosIguales = sonVehiculosIguales;

console.log('✅ Funciones exportadas a window:', {
    actualizarActaEnBD: typeof window.actualizarActaEnBD,
    cargarActaSeleccionada: typeof window.cargarActaSeleccionada,
    buscarVehiculo: typeof window.buscarVehiculo
});
