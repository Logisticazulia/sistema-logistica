/* ============================================ */
/* ACTA-MODIFICAR.JS                            */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* CON MODAL DE CONFIRMACIÓN ELEGANTE           */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;
let vehiculoActual = null;
let listaVehiculos = [];
let vehicleCounter = 0;
let actaActualId = null;
let actasFiltradas = [];

// ============================================
// ✅ VARIABLES DE PAGINACIÓN
// ============================================
let paginaActual = 1;
const itemsPorPagina = 10;

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
    }
    
    actualizarFechaActa();
    agregarListenersFormulario();
    agregarListenerEnter();
    cargarEmailUsuario();
    cargarTodasLasActas();
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
// ✅ BUSCAR ACTAS CON FILTROS Y PAGINACIÓN
// ============================================
async function buscarActas() {
    const filterFuncionario = document.getElementById('filterFuncionario')?.value.trim() || '';
    const filterCedula = document.getElementById('filterCedula')?.value.trim() || '';
    const filterUnidad = document.getElementById('filterUnidad')?.value.trim() || '';
    const filterFecha = document.getElementById('filterFecha')?.value || '';
    const searchActaAlert = document.getElementById('searchActaAlert');
    
    if (!supabaseClient) {
        mostrarAlerta('❌ error de conexión con la base de datos', 'error', searchActaAlert);
        return;
    }
    
    try {
        let query = supabaseClient
            .from('actas_asignacion')
            .select('id, funcionario_nombre, funcionario_cedula, unidad_asignacion, vehiculos, created_at, fecha_dia, fecha_mes, fecha_anio')
            .order('created_at', { ascending: false })
            .limit(1000);
        
        if (filterFuncionario) query = query.ilike('funcionario_nombre', `%${filterFuncionario}%`);
        if (filterCedula) query = query.ilike('funcionario_cedula', `%${filterCedula}%`);
        if (filterUnidad) query = query.ilike('unidad_asignacion', `%${filterUnidad}%`);
        if (filterFecha) {
            query = query.gte('created_at', filterFecha + 'T00:00:00')
                        .lte('created_at', filterFecha + 'T23:59:59');
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        actasFiltradas = data || [];
        paginaActual = 1;
        renderizarTablaActas();
        
        if (actasFiltradas.length === 0) {
            mostrarAlerta('ℹ️ no se encontraron actas con los filtros aplicados', 'info', searchActaAlert);
        } else {
            mostrarAlerta(`✅ ${actasFiltradas.length} acta(s) encontrada(s)`, 'success', searchActaAlert);
        }
        
    } catch (error) {
        console.error('❌ Error al buscar actas:', error);
        mostrarAlerta('❌ error al buscar actas: ' + error.message, 'error', searchActaAlert);
    }
}

// ============================================
// ✅ CARGAR TODAS LAS ACTAS
// ============================================
async function cargarTodasLasActas() {
    const searchActaAlert = document.getElementById('searchActaAlert');
    mostrarAlerta('🔄 cargando todas las actas...', 'info', searchActaAlert);
    
    document.getElementById('filterFuncionario').value = '';
    document.getElementById('filterCedula').value = '';
    document.getElementById('filterUnidad').value = '';
    document.getElementById('filterFecha').value = '';
    
    await buscarActas();
}

// ============================================
// ✅ RESETEAR FILTROS
// ============================================
function resetearFiltros() {
    document.getElementById('filterFuncionario').value = '';
    document.getElementById('filterCedula').value = '';
    document.getElementById('filterUnidad').value = '';
    document.getElementById('filterFecha').value = '';
    
    paginaActual = 1;
    actasFiltradas = [];
    
    const searchActaAlert = document.getElementById('searchActaAlert');
    mostrarAlerta('🔄 filtros limpiados. cargando todas las actas...', 'info', searchActaAlert);
    cargarTodasLasActas();
}

// ============================================
// ✅ RENDERIZAR TABLA DE ACTAS CON PAGINACIÓN
// ============================================
function renderizarTablaActas() {
    const tbody = document.getElementById('actasListBody');
    const section = document.getElementById('actaResultsSection');
    const count = document.getElementById('actaCount');
    
    if (!tbody || !section || !count) return;
    
    if (actasFiltradas.length === 0) {
        section.classList.remove('active');
        return;
    }
    
    section.classList.add('active');
    count.textContent = actasFiltradas.length;
    
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const actasPagina = actasFiltradas.slice(inicio, fin);
    
    tbody.innerHTML = actasPagina.map(acta => {
        const fecha = acta.created_at ? new Date(acta.created_at).toLocaleDateString('es-VE') : 'N/A';
        let vehiculosCount = 0;
        try {
            if (typeof acta.vehiculos === 'string') {
                const vehiculosData = JSON.parse(acta.vehiculos);
                vehiculosCount = Array.isArray(vehiculosData) ? vehiculosData.length : 0;
            } else if (Array.isArray(acta.vehiculos)) {
                vehiculosCount = acta.vehiculos.length;
            }
        } catch (e) { vehiculosCount = 0; }
        
        return `
            <tr>
                <td>${fecha}</td>
                <td>${acta.funcionario_nombre || '---'}</td>
                <td>${acta.funcionario_cedula || '---'}</td>
                <td>${acta.unidad_asignacion || '---'}</td>
                <td style="text-align: center;">${vehiculosCount}</td>
                <td>
                    <button class="btn-select-acta" onclick="seleccionarActa('${acta.id}')">📥 Cargar</button>
                </td>
            </tr>
        `;
    }).join('');
    
    renderizarPaginacion();
}

// ============================================
// ✅ RENDERIZAR CONTROLES DE PAGINACIÓN
// ============================================
function renderizarPaginacion() {
    const paginationControls = document.getElementById('paginationControls');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const btnAnterior = document.getElementById('btnAnterior');
    const btnSiguiente = document.getElementById('btnSiguiente');
    const spanPaginaActual = document.getElementById('paginaActual');
    const spanTotalPaginas = document.getElementById('totalPaginas');
    
    if (!paginationControls || !paginationNumbers) return;
    
    const totalPaginas = Math.ceil(actasFiltradas.length / itemsPorPagina);
    
    if (totalPaginas <= 1) {
        paginationControls.style.display = 'none';
        return;
    }
    
    paginationControls.style.display = 'flex';
    if (spanPaginaActual) spanPaginaActual.textContent = paginaActual;
    if (spanTotalPaginas) spanTotalPaginas.textContent = totalPaginas;
    if (btnAnterior) btnAnterior.disabled = paginaActual === 1;
    if (btnSiguiente) btnSiguiente.disabled = paginaActual === totalPaginas;
    
    let numerosHTML = '';
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActual - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPaginas, inicio + maxBotones - 1);
    
    if (fin - inicio < maxBotones - 1) inicio = Math.max(1, fin - maxBotones + 1);
    
    if (inicio > 1) {
        numerosHTML += `<button class="btn-page-number" onclick="irAPagina(1)">1</button>`;
        if (inicio > 2) numerosHTML += `<span style="padding: 0 5px;">...</span>`;
    }
    
    for (let i = inicio; i <= fin; i++) {
        if (i === paginaActual) {
            numerosHTML += `<button class="btn-page-number active">${i}</button>`;
        } else {
            numerosHTML += `<button class="btn-page-number" onclick="irAPagina(${i})">${i}</button>`;
        }
    }
    
    if (fin < totalPaginas) {
        if (fin < totalPaginas - 1) numerosHTML += `<span style="padding: 0 5px;">...</span>`;
        numerosHTML += `<button class="btn-page-number" onclick="irAPagina(${totalPaginas})">${totalPaginas}</button>`;
    }
    
    paginationNumbers.innerHTML = numerosHTML;
}

// ============================================
// ✅ CAMBIAR PÁGINA / IR A PÁGINA ESPECÍFICA
// ============================================
function cambiarPagina(direccion) {
    const totalPaginas = Math.ceil(actasFiltradas.length / itemsPorPagina);
    const nuevaPagina = paginaActual + direccion;
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        renderizarTablaActas();
        document.getElementById('actaResultsSection')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
function irAPagina(numeroPagina) {
    const totalPaginas = Math.ceil(actasFiltradas.length / itemsPorPagina);
    if (numeroPagina >= 1 && numeroPagina <= totalPaginas) {
        paginaActual = numeroPagina;
        renderizarTablaActas();
        document.getElementById('actaResultsSection')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// ============================================
// ✅ SELECCIONAR ACTA PARA MODIFICAR
// ============================================
async function seleccionarActa(actaId) {
    const searchActaAlert = document.getElementById('searchActaAlert');
    const btnActualizar = document.getElementById('btnActualizarActa');
    
    if (!actaId) { mostrarAlerta('⚠️ ID de acta no válido', 'error', searchActaAlert); return; }
    if (!supabaseClient) { mostrarAlerta('❌ error de conexión', 'error', searchActaAlert); return; }
    
    try {
        const { data, error } = await supabaseClient.from('actas_asignacion').select('*').eq('id', actaId).single();
        if (error || !data) throw error;
        
        actaActualId = String(data.id);
        
        document.getElementById('funcionarioNombre').value = data.funcionario_nombre || '';
        document.getElementById('funcionarioCedula').value = data.funcionario_cedula || '';
        document.getElementById('unidadAsignacion').value = data.unidad_asignacion || '';
        document.getElementById('funcionarioCargo').value = data.funcionario_cargo || '';
        document.getElementById('actaId').value = data.id;
        
        if (data.fecha_dia) document.getElementById('previewDia').textContent = data.fecha_dia;
        if (data.fecha_mes) document.getElementById('previewMes').textContent = data.fecha_mes;
        if (data.fecha_anio) document.getElementById('previewAnio').textContent = data.fecha_anio;
        
        let vehiculosData = null;
        try {
            vehiculosData = typeof data.vehiculos === 'string' ? JSON.parse(data.vehiculos) : data.vehiculos;
        } catch (e) { vehiculosData = []; }
        
        listaVehiculos = Array.isArray(vehiculosData) ? vehiculosData : [];
        vehicleCounter = listaVehiculos.length;
        listaVehiculos.forEach((v, index) => { if (!v.tempId) v.tempId = index + 1; });
        
        renderizarListaVehiculos();
        renderizarVehiculosEnActa();
        actualizarActa();
        actualizarTextoSingularPlural();
        
        if (btnActualizar) btnActualizar.disabled = false;
        
        const btnReasignar = document.getElementById('btnReasignarVehiculos');
        if (btnReasignar && listaVehiculos.length > 0) {
            btnReasignar.disabled = false;
        }
        
        mostrarAlerta(`✅ acta #${actaId} cargada. ${listaVehiculos.length} vehículo(s)`, 'success', searchActaAlert);
        document.querySelector('.form-section')?.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('❌ Error al cargar acta:', error);
        mostrarAlerta('❌ error al cargar la acta: ' + error.message, 'error', searchActaAlert);
    }
}

// ============================================
// ✅ FUNCIONES DE ACTUALIZACIÓN Y RENDERIZADO
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

function normalizarTexto(texto) { if (!texto) return ''; return texto.toString().trim().toUpperCase(); }

function sonVehiculosIguales(v1, v2) {
    const placa1 = normalizarTexto(v1.placa), placa2 = normalizarTexto(v2.placa);
    const serial1 = normalizarTexto(v1.s_carroceria), serial2 = normalizarTexto(v2.s_carroceria);
    const id1 = v1.id, id2 = v2.id;
    if (placa1 && placa2 && placa1 === placa2) return true;
    if (serial1 && serial2 && serial1 === serial2) return true;
    if (id1 && id2 && id1 === id2) return true;
    return false;
}

async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const btnAgregar = document.getElementById('btnAgregarVehiculo');
    const terminoBusqueda = normalizarTexto(searchInput?.value);
    
    if (!terminoBusqueda) { mostrarAlerta('⚠️ por favor ingrese un término de búsqueda', 'error', searchAlert); vehiculoActual = null; if (btnAgregar) btnAgregar.disabled = true; return; }
    if (!supabaseClient) { mostrarAlerta('❌ error de conexión con la base de datos', 'error', searchAlert); vehiculoActual = null; if (btnAgregar) btnAgregar.disabled = true; return; }
    
    try {
        let vehiculoEncontrado = null;
        const camposBusqueda = ['placa', 'facsimil', 's_carroceria', 's_motor', 'n_identificacion'];
        for (const campo of camposBusqueda) {
            const response = await supabaseClient.from('vehiculos').select('*').eq(campo, terminoBusqueda).limit(1);
            if (response.data && response.data.length > 0 && !response.error) { vehiculoEncontrado = response.data[0]; break; }
        }
        if (!vehiculoEncontrado) { mostrarAlerta('❌ vehículo no encontrado en la base de datos', 'error', searchAlert); vehiculoActual = null; if (btnAgregar) btnAgregar.disabled = true; return; }
        
        const yaEnLista = listaVehiculos.some(v => sonVehiculosIguales(v, vehiculoEncontrado));
        if (yaEnLista) { mostrarAlerta('⚠️ este vehículo ya está en la lista del acta', 'info', searchAlert); if (btnAgregar) btnAgregar.disabled = true; return; }
        
        vehiculoActual = { id: vehiculoEncontrado.id, marca: vehiculoEncontrado.marca || 'N/P', modelo: vehiculoEncontrado.modelo || '', s_carroceria: vehiculoEncontrado.s_carroceria || 'N/P', s_motor: vehiculoEncontrado.s_motor || 'N/P', placa: vehiculoEncontrado.placa || 'N/P', facsimil: vehiculoEncontrado.facsimil || 'N/P' };
        if (btnAgregar) btnAgregar.disabled = false;
        mostrarAlerta('✅ vehículo encontrado. puede agregarlo.', 'success', searchAlert);
    } catch (error) {
        console.error('Error al buscar vehículo:', error);
        mostrarAlerta('❌ error de conexión', 'error', searchAlert);
        vehiculoActual = null;
        if (btnAgregar) btnAgregar.disabled = true;
    }
}

function agregarVehiculoAlActa() {
    if (!vehiculoActual) { mostrarAlerta('⚠️ primero debe buscar un vehículo', 'error'); return; }
    const yaExiste = listaVehiculos.some(v => {
        if (v.id && vehiculoActual.id && v.id === vehiculoActual.id) return true;
        const placa1 = (v.placa || '').toString().trim().toUpperCase(), placa2 = (vehiculoActual.placa || '').toString().trim().toUpperCase();
        const placaValida1 = placa1 && placa1 !== 'N/P' && placa1 !== 'N/D' && placa1.length >= 6;
        const placaValida2 = placa2 && placa2 !== 'N/P' && placa2 !== 'N/D' && placa2.length >= 6;
        if (placaValida1 && placaValida2 && placa1 === placa2) return true;
        const serial1 = (v.s_carroceria || '').toString().trim().toUpperCase(), serial2 = (vehiculoActual.s_carroceria || '').toString().trim().toUpperCase();
        const serialValido1 = serial1 && serial1 !== 'N/P' && serial1 !== 'N/D' && serial1.length >= 10;
        const serialValido2 = serial2 && serial2 !== 'N/P' && serial2 !== 'N/D' && serial2.length >= 10;
        if (serialValido1 && serialValido2 && serial1 === serial2) return true;
        return false;
    });
    if (yaExiste) { mostrarAlerta('⚠️ este vehículo ya está en la lista del acta', 'error'); return; }
    
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
    
    if (actaActualId) { const btnActualizar = document.getElementById('btnActualizarActa'); if (btnActualizar) btnActualizar.disabled = false; }
    mostrarAlerta(`✅ vehículo agregado. total: ${listaVehiculos.length}`, 'success');
}

function renderizarListaVehiculos() {
    const tbody = document.getElementById('vehiclesListBody'), section = document.getElementById('vehiclesListSection'), count = document.getElementById('vehiclesCount');
    if (!tbody || !section || !count) return;
    if (listaVehiculos.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    count.textContent = listaVehiculos.length;
    tbody.innerHTML = listaVehiculos.map(vehiculo => `<tr><td>${vehiculo.marca} ${vehiculo.modelo}</td><td>${vehiculo.placa}</td><td>${vehiculo.s_carroceria}</td><td>${vehiculo.s_motor}</td><td>${vehiculo.facsimil}</td><td><button class="btn-remove-vehicle" onclick="eliminarVehiculo(${vehiculo.tempId})">🗑️ eliminar</button></td></tr>`).join('');
}

function eliminarVehiculo(tempId) {
    const index = listaVehiculos.findIndex(v => v.tempId === tempId);
    if (index >= 0) {
        listaVehiculos.splice(index, 1);
        if (typeof renderizarListaVehiculos === 'function') renderizarListaVehiculos();
        if (typeof renderizarVehiculosEnActa === 'function') renderizarVehiculosEnActa();
        if (typeof actualizarTextoSingularPlural === 'function') actualizarTextoSingularPlural();
        if (actaActualId) { const btnActualizar = document.getElementById('btnActualizarActa'); if (btnActualizar) btnActualizar.disabled = false; }
        mostrarAlerta(listaVehiculos.length === 0 ? '🗑️ vehículo eliminado. la lista está vacía.' : `🗑️ vehículo eliminado. total: ${listaVehiculos.length}`, 'info');
    }
}

function renderizarVehiculosEnActa() {
    const tbody = document.getElementById('actaVehiclesBody');
    if (!tbody) return;
    if (listaVehiculos.length === 0) { tbody.innerHTML = `<tr><td>---</td><td>---</td><td>---</td><td>---</td><td>---</td></tr>`; return; }
    tbody.innerHTML = listaVehiculos.map(vehiculo => `<tr><td>${vehiculo.marca} ${vehiculo.modelo}</td><td>${vehiculo.s_carroceria}</td><td>${vehiculo.s_motor}</td><td>${vehiculo.placa}</td><td>${vehiculo.facsimil}</td></tr>`).join('');
}

function actualizarFechaActa() {
    const fecha = new Date();
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    ['previewDia','previewMes','previewAnio'].forEach((id, i) => { const el = document.getElementById(id); if (el) el.textContent = i === 0 ? fecha.getDate() : i === 1 ? meses[fecha.getMonth()] : fecha.getFullYear(); });
}

function agregarListenersFormulario() {
    ['funcionarioNombre','funcionarioCedula','unidadAsignacion','funcionarioCargo'].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) { elemento.addEventListener('input', actualizarActa); elemento.addEventListener('change', actualizarActa); }
    });
}

function agregarListenerEnter() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) { searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); buscarVehiculo(); } }); }
    ['filterFuncionario','filterCedula','filterUnidad','filterFecha'].forEach(id => {
        const elemento = document.getElementById(id);
        if (elemento) { elemento.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); buscarActas(); } }); }
    });
}

function mostrarAlerta(mensaje, tipo, elemento = null) {
    const alertElement = elemento || document.getElementById('searchAlert');
    if (!alertElement) { console.error('❌ elemento de alerta no encontrado'); return; }
    alertElement.textContent = mensaje;
    alertElement.className = `alert alert-${tipo}`;
    alertElement.style.display = 'block';
    setTimeout(() => { alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
    if (tipo !== 'error') { setTimeout(() => { alertElement.style.display = 'none'; }, 5000); }
}

function imprimirActa() {
    if (listaVehiculos.length === 0) { mostrarAlerta('⚠️ primero debe agregar al menos un vehículo', 'error'); return; }
    if (!document.getElementById('funcionarioNombre')?.value) { mostrarAlerta('⚠️ complete los datos del funcionario', 'error'); return; }
    actualizarActa();
    renderizarVehiculosEnActa();
    window.print();
}

// ============================================
// ✅ MODAL DE CONFIRMACIÓN - FUNCIONES
// ============================================
function abrirModalReasignar() {
    const modal = document.getElementById('modalReasignar');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Evitar scroll del fondo
    }
}

function cerrarModalReasignar() {
    const modal = document.getElementById('modalReasignar');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar scroll
    }
}

// Cerrar modal al hacer click fuera del contenido
document.addEventListener('click', function(e) {
    const modal = document.getElementById('modalReasignar');
    const modalContent = modal?.querySelector('.modal-content');
    if (modal && e.target === modal) {
        cerrarModalReasignar();
    }
});

// Cerrar modal con tecla ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        cerrarModalReasignar();
    }
});

// ============================================
// ✅ REASIGNAR VEHÍCULOS DEL ACTA
// ============================================
function reasignarVehiculos() {
    console.log('🔍 reasignarVehiculos - INICIANDO');
    console.log('🔍 actaActualId:', actaActualId);
    console.log('🔍 listaVehiculos.length:', listaVehiculos.length);
    
    if (!actaActualId) { mostrarAlerta('⚠️ primero debe cargar una acta para reasignar', 'error'); return; }
    if (!listaVehiculos || listaVehiculos.length === 0) { mostrarAlerta('⚠️ el acta no tiene vehículos para reasignar', 'error'); return; }
    
    // ✅ MOSTRAR MODAL ELEGANTE EN VEZ DE confirm()
    abrirModalReasignar();
}

// Función que se ejecuta cuando el usuario confirma en el modal
async function confirmarReasignacion() {
    cerrarModalReasignar();
    
    if (!supabaseClient) { mostrarAlerta('❌ error de conexión con la base de datos', 'error'); return; }
    
    try {
        // ✅ PASO 1: Obtener datos completos del acta actual
        const { data: actaData, error: errorActa } = await supabaseClient
            .from('actas_asignacion')
            .select('*')
            .eq('id', actaActualId)
            .single();
        
        if (errorActa || !actaData) {
            console.error('❌ Error al obtener datos del acta:', errorActa);
            throw new Error('No se pudo obtener la información del acta');
        }
        
        // ✅ PASO 2: Registrar en historial_de_actas
        const historialData = {
            acta_id: String(actaActualId),  // ✅ Forzar conversión a string para compatibilidad
            funcionario_nombre: actaData.funcionario_nombre || '',
            funcionario_cedula: actaData.funcionario_cedula || '',
            unidad_asignacion: actaData.unidad_asignacion || '',
            vehiculos: actaData.vehiculos,
            fecha_reasignacion: new Date().toISOString(),
            fecha_dia: actaData.fecha_dia || '',
            fecha_mes: actaData.fecha_mes || '',
            fecha_anio: actaData.fecha_anio || '',
            usuario_reasigno: document.getElementById('userEmail')?.textContent || 'usuario@institucion.com',
            motivo: 'Reasignación de vehículos solicitada por usuario',
            estado: 'reasignado'
        };
        
        console.log('📦 Datos para historial:', JSON.stringify(historialData, null, 2));
        
        const { error: errorHistorial } = await supabaseClient
            .from('historial_de_actas')
            .insert(historialData);
        
        if (errorHistorial) {
            console.error('❌ Error al guardar en historial:', errorHistorial);
            throw new Error('No se pudo registrar en el historial: ' + errorHistorial.message);
        }
        
        console.log('✅ Registro guardado en historial_de_actas');
        
        // ✅ PASO 3: Actualizar el acta original (marcar como reasignada)
        const { error: errorUpdate } = await supabaseClient
            .from('actas_asignacion')
            .update({
                estado: 'reasignado',
                fecha_reasignacion: new Date().toISOString(),
                vehiculos: []  // ✅ Limpiar vehículos para que queden disponibles
            })
            .eq('id', actaActualId);
        
        if (errorUpdate) {
            console.error('❌ Error al actualizar acta:', errorUpdate);
            throw new Error('No se pudo actualizar el acta: ' + errorUpdate.message);
        }
        
        console.log('✅ Acta actualizada como reasignada');
        
        // ✅ PASO 4: Limpiar formulario y recargar
        mostrarAlerta('✅ vehículos reasignados exitosamente. ahora están disponibles para nuevas actas', 'success');
        
        setTimeout(() => {
            limpiarFormulario();
            cargarTodasLasActas();
        }, 2000);
        
    } catch (error) {
        console.error('❌ error al reasignar vehículos:', error);
        mostrarAlerta(`❌ error: ${error.message}`, 'error');
    }
}

// ============================================
// ✅ ACTUALIZAR ACTA EN BASE DE DATOS
// ============================================
async function actualizarActaEnBD() {
    console.log('🔍 actualizarActaEnBD - INICIANDO');
    console.log('🔍 actaActualId:', actaActualId);
    console.log('🔍 supabaseClient:', supabaseClient ? 'OK' : 'NULL');
    console.log('🔍 listaVehiculos.length:', listaVehiculos.length);
    
    if (!actaActualId) { console.error('❌ actaActualId es null o undefined'); mostrarAlerta('⚠️ primero debe cargar una acta para modificar', 'error'); return; }
    
    const funcionarioNombre = document.getElementById('funcionarioNombre')?.value || '';
    const funcionarioCedula = document.getElementById('funcionarioCedula')?.value || '';
    const unidadAsignacion = document.getElementById('unidadAsignacion')?.value || '';
    
    if (!funcionarioNombre || !funcionarioCedula || !unidadAsignacion) { mostrarAlerta('⚠️ complete todos los campos obligatorios', 'error'); return; }
    if (listaVehiculos.length === 0) { mostrarAlerta('⚠️ el acta debe tener al menos un vehículo', 'error'); return; }
    if (!supabaseClient) { mostrarAlerta('❌ error de conexión con la base de datos', 'error'); return; }
    
    const createdByEmail = document.getElementById('userEmail')?.textContent || 'usuario@institucion.com';
    
    const actaData = {
        funcionario_nombre: funcionarioNombre,
        funcionario_cedula: funcionarioCedula,
        funcionario_cargo: document.getElementById('funcionarioCargo')?.value || '',
        unidad_asignacion: unidadAsignacion,
        vehiculos: listaVehiculos.map(v => ({ id: v.id, marca: v.marca, modelo: v.modelo, placa: v.placa, facsimil: v.facsimil, s_carroceria: v.s_carroceria, s_motor: v.s_motor })),
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
        const { data, error } = await supabaseClient.from('actas_asignacion').update(actaData).eq('id', actaActualId).select();
        console.log('📊 Respuesta de update:', { data, error });
        
        if (error) throw error;
        if (!data || data.length === 0) { console.error('❌ No se actualizó ninguna fila - RLS o ID incorrecto'); mostrarAlerta('❌ no se pudo actualizar - verifique permisos o ID del acta', 'error'); return; }
        
        console.log('✅ Acta actualizada exitosamente:', data[0].id);
        mostrarAlerta('✅ acta actualizada exitosamente', 'success');
        document.getElementById('btnActualizarActa').disabled = true;
        setTimeout(() => { cargarTodasLasActas(); }, 1000);
        
    } catch (error) {
        console.error('❌ error al actualizar acta:', error);
        mostrarAlerta(`❌ error: ${error.message}`, 'error');
    }
}

// ============================================
// ✅ LIMPIAR FORMULARIO
// ============================================
function limpiarFormulario() {
    ['searchInput','funcionarioNombre','funcionarioCedula','unidadAsignacion','funcionarioCargo','actaId'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
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
    const btnReasignar = document.getElementById('btnReasignarVehiculos');
    if (btnAgregar) btnAgregar.disabled = true;
    if (btnActualizar) btnActualizar.disabled = true;
    if (btnReasignar) btnReasignar.disabled = true;
    const section = document.getElementById('vehiclesListSection');
    if (section) section.style.display = 'none';
    console.log('✅ formulario limpiado');
}

// ============================================
// ✅ EXPORTAR FUNCIONES GLOBALES
// ============================================
window.buscarVehiculo = buscarVehiculo;
window.agregarVehiculoAlActa = agregarVehiculoAlActa;
window.eliminarVehiculo = eliminarVehiculo;
window.renderizarListaVehiculos = renderizarListaVehiculos;
window.renderizarVehiculosEnActa = renderizarVehiculosEnActa;
window.actualizarTextoSingularPlural = actualizarTextoSingularPlural;
window.imprimirActa = imprimirActa;
window.actualizarActaEnBD = actualizarActaEnBD;
window.limpiarFormulario = limpiarFormulario;
window.mostrarAlerta = mostrarAlerta;
window.actualizarActa = actualizarActa;
window.cargarEmailUsuario = cargarEmailUsuario;
window.actualizarFechaActa = actualizarFechaActa;
window.buscarActas = buscarActas;
window.seleccionarActa = seleccionarActa;
window.cargarTodasLasActas = cargarTodasLasActas;
window.resetearFiltros = resetearFiltros;
window.normalizarTexto = normalizarTexto;
window.sonVehiculosIguales = sonVehiculosIguales;
window.cambiarPagina = cambiarPagina;
window.irAPagina = irAPagina;
// ✅ FUNCIONES DEL MODAL DE REASIGNACIÓN
window.reasignarVehiculos = reasignarVehiculos;
window.confirmarReasignacion = confirmarReasignacion;
window.abrirModalReasignar = abrirModalReasignar;
window.cerrarModalReasignar = cerrarModalReasignar;

console.log('✅ Funciones exportadas a window');
