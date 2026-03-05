/* ============================================ */
/* ACTA-CONSULTAR.JS                            */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* CONSULTAR ACTAS - SOLO LECTURA               */
/* PAGINACIÓN: 20 POR PÁGINA                    */
/* FILTRO: OCULTAR ACTAS SIN VEHÍCULOS          */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;
let actasFiltradas = [];
let actasOriginales = [];
let actaSeleccionada = null;

// ============================================
// ✅ VARIABLES DE PAGINACIÓN (20 POR PÁGINA)
// ============================================
let paginaActual = 1;
const itemsPorPagina = 20;

// ============================================
// ✅ INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOMContentLoaded - Iniciando acta-consultar.js');
    
    if (typeof window.supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY) {
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log('✅ Supabase inicializado correctamente');
    } else {
        console.error('❌ Error: Credenciales de Supabase no encontradas. Verifica config.js');
    }
    
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
// ✅ FUNCIÓN AUXILIAR: Contar vehículos
// ============================================
function contarVehiculos(vehiculos) {
    try {
        if (Array.isArray(vehiculos)) return vehiculos.length;
        if (typeof vehiculos === 'string' && vehiculos.trim()) {
            return JSON.parse(vehiculos).length;
        }
        return 0;
    } catch (e) {
        return 0;
    }
}

// ============================================
// ✅ FILTRAR ACTAS - OCULTAR SIN VEHÍCULOS
// ============================================
function filtrarActasConVehiculos(actas) {
    return actas.filter(acta => {
        const vehiculosCount = contarVehiculos(acta.vehiculos);
        const tieneVehiculos = vehiculosCount > 0;
        
        if (!tieneVehiculos) {
            console.log('🗑️ Acta ocultada (sin vehículos):', acta.id);
        }
        
        return tieneVehiculos;
    });
}

// ============================================
// ✅ BUSCAR ACTAS CON FILTROS
// ============================================
async function buscarActas() {
    const filterFuncionario = document.getElementById('filterFuncionario')?.value.trim() || '';
    const filterCedula = document.getElementById('filterCedula')?.value.trim() || '';
    const filterUnidad = document.getElementById('filterUnidad')?.value.trim() || '';
    const filterFecha = document.getElementById('filterFecha')?.value || '';
    const searchAlert = document.getElementById('searchAlert');
    
    console.log('🔍 buscarActas - Filtros:', { filterFuncionario, filterCedula, filterUnidad, filterFecha });
    
    if (!supabaseClient) {
        mostrarAlerta('❌ error de conexión con la base de datos', 'error', searchAlert);
        return;
    }
    
    try {
        let query = supabaseClient
            .from('actas_asignacion')
            .select('id, funcionario_nombre, funcionario_cedula, unidad_asignacion, funcionario_cargo, vehiculos, fecha_dia, fecha_mes, fecha_anio, created_at, created_by_email')
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
        
        // ✅ Guardar todas las actas originales
        actasOriginales = data || [];
        console.log('📊 Total de actas en BD:', actasOriginales.length);
        
        // ✅ Filtrar solo actas con vehículos (OCULTAR sin vehículos)
        actasFiltradas = filtrarActasConVehiculos(actasOriginales);
        console.log('✅ Actas con vehículos (mostrables):', actasFiltradas.length);
        
        paginaActual = 1;
        renderizarTablaActas();
        
        if (actasFiltradas.length === 0) {
            mostrarAlerta('ℹ️ no se encontraron actas con vehículos', 'info', searchAlert);
        } else {
            mostrarAlerta(`✅ ${actasFiltradas.length} acta(s) con vehículos encontrada(s)`, 'success', searchAlert);
        }
        
    } catch (error) {
        console.error('❌ Error al buscar actas:', error);
        mostrarAlerta('❌ error al buscar actas: ' + error.message, 'error', searchAlert);
    }
}

// ============================================
// ✅ CARGAR TODAS LAS ACTAS
// ============================================
async function cargarTodasLasActas() {
    const searchAlert = document.getElementById('searchAlert');
    mostrarAlerta('🔄 cargando todas las actas...', 'info', searchAlert);
    
    limpiarInput('filterFuncionario');
    limpiarInput('filterCedula');
    limpiarInput('filterUnidad');
    limpiarInput('filterFecha');
    
    paginaActual = 1;
    actasFiltradas = [];
    actasOriginales = [];
    
    await buscarActas();
}

// ============================================
// ✅ RESETEAR FILTROS
// ============================================
function resetearFiltros() {
    limpiarInput('filterFuncionario');
    limpiarInput('filterCedula');
    limpiarInput('filterUnidad');
    limpiarInput('filterFecha');
    
    paginaActual = 1;
    actasFiltradas = [];
    actasOriginales = [];
    
    const searchAlert = document.getElementById('searchAlert');
    mostrarAlerta('🔄 filtros limpiados. cargando todas las actas...', 'info', searchAlert);
    cargarTodasLasActas();
}

// ============================================
// ✅ LIMPIAR INPUT DE FORMA SEGURA
// ============================================
function limpiarInput(id) {
    const el = document.getElementById(id);
    if (el && typeof el.value !== 'undefined') {
        el.value = '';
    }
}

// ============================================
// ✅ RENDERIZAR TABLA DE ACTAS (20 POR PÁGINA)
// ============================================
function renderizarTablaActas() {
    const tbody = document.getElementById('actasListBody');
    const section = document.getElementById('resultsSection');
    const count = document.getElementById('actaCount');
    
    if (!tbody || !section || !count) return;
    
    if (actasFiltradas.length === 0) {
        section.classList.remove('active');
        return;
    }
    
    section.classList.add('active');
    count.textContent = actasFiltradas.length;
    
    // ✅ Paginación de 20 en 20
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const actasPagina = actasFiltradas.slice(inicio, fin);
    
    tbody.innerHTML = actasPagina.map(acta => {
        const fecha = acta.created_at ? new Date(acta.created_at).toLocaleDateString('es-VE') : 'N/A';
        const vehiculosCount = contarVehiculos(acta.vehiculos);
        
        return `
            <tr onclick="verActa('${acta.id}')">
                <td>${fecha}</td>
                <td>${acta.funcionario_nombre || '---'}</td>
                <td>${acta.funcionario_cedula || '---'}</td>
                <td>${acta.unidad_asignacion || '---'}</td>
                <td style="text-align: center;">${vehiculosCount}</td>
                <td>
                    <button class="btn-view-acta" onclick="event.stopPropagation(); verActa('${acta.id}')">
                        👁️ Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    renderizarPaginacion();
}

// ============================================
// ✅ RENDERIZAR PAGINACIÓN (20 POR PÁGINA)
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
    
    if (fin - inicio < maxBotones - 1) {
        inicio = Math.max(1, fin - maxBotones + 1);
    }
    
    if (inicio > 1) {
        numerosHTML += `<button class="btn-page-number" onclick="irAPagina(1)">1</button>`;
        if (inicio > 2) {
            numerosHTML += `<span style="padding: 0 5px;">...</span>`;
        }
    }
    
    for (let i = inicio; i <= fin; i++) {
        if (i === paginaActual) {
            numerosHTML += `<button class="btn-page-number active">${i}</button>`;
        } else {
            numerosHTML += `<button class="btn-page-number" onclick="irAPagina(${i})">${i}</button>`;
        }
    }
    
    if (fin < totalPaginas) {
        if (fin < totalPaginas - 1) {
            numerosHTML += `<span style="padding: 0 5px;">...</span>`;
        }
        numerosHTML += `<button class="btn-page-number" onclick="irAPagina(${totalPaginas})">${totalPaginas}</button>`;
    }
    
    paginationNumbers.innerHTML = numerosHTML;
}

// ============================================
// ✅ CAMBIAR PÁGINA
// ============================================
function cambiarPagina(direccion) {
    const totalPaginas = Math.ceil(actasFiltradas.length / itemsPorPagina);
    const nuevaPagina = paginaActual + direccion;
    
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        renderizarTablaActas();
        
        document.getElementById('resultsSection')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }
}

// ============================================
// ✅ IR A PÁGINA ESPECÍFICA
// ============================================
function irAPagina(numeroPagina) {
    const totalPaginas = Math.ceil(actasFiltradas.length / itemsPorPagina);
    
    if (numeroPagina >= 1 && numeroPagina <= totalPaginas) {
        paginaActual = numeroPagina;
        renderizarTablaActas();
        
        document.getElementById('resultsSection')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }
}

// ============================================
// ✅ VER ACTA (CARGAR VISTA PREVIA)
// ============================================
async function verActa(actaId) {
    const searchAlert = document.getElementById('searchAlert');
    
    if (!actaId) {
        mostrarAlerta('⚠️ ID de acta no válido', 'error', searchAlert);
        return;
    }
    
    if (!supabaseClient) {
        mostrarAlerta('❌ error de conexión', 'error', searchAlert);
        return;
    }
    
    try {
        const idNumero = Number(actaId);
        const idString = String(actaId);
        
        let actaData = null;
        
        const responseNum = await supabaseClient.from('actas_asignacion').select('*').eq('id', idNumero).limit(1);
        if (responseNum.data && responseNum.data.length > 0) {
            actaData = responseNum.data[0];
        } else {
            const responseStr = await supabaseClient.from('actas_asignacion').select('*').eq('id', idString).limit(1);
            if (responseStr.data && responseStr.data.length > 0) {
                actaData = responseStr.data[0];
            }
        }
        
        if (!actaData) throw new Error('No se encontró el acta');
        
        actaSeleccionada = actaData;
        
        // ✅ Llenar datos del funcionario
        const elNombre = document.getElementById('previewFuncionarioNombre');
        const elCedula = document.getElementById('previewFuncionarioCedula');
        const elUnidad = document.getElementById('previewUnidadAsignacion');
        const elFirma = document.getElementById('previewFirmaFuncionario');
        const elCargo = document.getElementById('previewCargoFuncionario');
        
        if (elNombre) elNombre.textContent = actaData.funcionario_nombre || '---';
        if (elCedula) elCedula.textContent = actaData.funcionario_cedula || '---';
        if (elUnidad) elUnidad.textContent = actaData.unidad_asignacion || '---';
        
        if (elFirma) {
            if (actaData.funcionario_nombre && actaData.funcionario_cedula) {
                elFirma.innerHTML = `${actaData.funcionario_nombre}, Cédula de Identidad numero ${actaData.funcionario_cedula}`;
            } else if (actaData.funcionario_nombre) {
                elFirma.innerHTML = `${actaData.funcionario_nombre}, Cédula de Identidad numero V-00.000.000`;
            } else {
                elFirma.textContent = '---';
            }
        }
        
        if (elCargo) {
            elCargo.textContent = actaData.funcionario_cargo || (actaData.unidad_asignacion ? `Jefe de ${actaData.unidad_asignacion}` : '---');
        }
        
        // ✅ Llenar fecha
        const elDia = document.getElementById('previewDia');
        const elMes = document.getElementById('previewMes');
        const elAnio = document.getElementById('previewAnio');
        if (elDia) elDia.textContent = actaData.fecha_dia || '---';
        if (elMes) elMes.textContent = actaData.fecha_mes || '---';
        if (elAnio) elAnio.textContent = actaData.fecha_anio || '---';
        
        // ✅ Llenar vehículos
        renderizarVehiculosEnActa(actaData.vehiculos);
        
        // ✅ Actualizar texto singular/plural
        actualizarTextoSingularPlural(actaData.vehiculos);
        
        // ✅ Mostrar vista previa y ocultar tabla
        document.getElementById('resultsSection').classList.remove('active');
        document.getElementById('previewSection').classList.add('active');
        
        // ✅ Scroll hacia la vista previa
        document.getElementById('previewSection')?.scrollIntoView({ behavior: 'smooth' });
        
        console.log('✅ Acta cargada:', actaData.id);
        
    } catch (error) {
        console.error('❌ Error al cargar acta:', error);
        mostrarAlerta('❌ error al cargar la acta: ' + error.message, 'error', searchAlert);
    }
}

// ============================================
// ✅ RENDERIZAR VEHÍCULOS EN EL ACTA
// ============================================
function renderizarVehiculosEnActa(vehiculos) {
    const tbody = document.getElementById('actaVehiclesBody');
    if (!tbody) return;
    
    let vehiculosData = null;
    try {
        if (typeof vehiculos === 'string') {
            vehiculosData = JSON.parse(vehiculos);
        } else {
            vehiculosData = vehiculos;
        }
    } catch (e) {
        vehiculosData = [];
    }
    
    if (!Array.isArray(vehiculosData) || vehiculosData.length === 0) {
        tbody.innerHTML = `<tr><td>---</td><td>---</td><td>---</td><td>---</td><td>---</td></tr>`;
        return;
    }
    
    tbody.innerHTML = vehiculosData.map(vehiculo => `
        <tr>
            <td>${vehiculo.marca || 'N/P'} ${vehiculo.modelo || ''}</td>
            <td>${vehiculo.s_carroceria || 'N/P'}</td>
            <td>${vehiculo.s_motor || 'N/P'}</td>
            <td>${vehiculo.placa || 'N/P'}</td>
            <td>${vehiculo.facsimil || 'N/P'}</td>
        </tr>
    `).join('');
}

// ============================================
// ✅ ACTUALIZAR TEXTO SINGULAR/PLURAL
// ============================================
function actualizarTextoSingularPlural(vehiculos) {
    const vehiculosData = contarVehiculos(vehiculos);
    const textoUnidad = document.getElementById('textoUnidad');
    const textoUso = document.getElementById('textoUso');
    const textoUnidad2 = document.getElementById('textoUnidad2');
    
    if (vehiculosData >= 2) {
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
// ✅ CERRAR VISTA PREVIA
// ============================================
function cerrarVistaPrevia() {
    document.getElementById('previewSection').classList.remove('active');
    document.getElementById('resultsSection').classList.add('active');
    actaSeleccionada = null;
}

// ============================================
// ✅ IMPRIMIR ACTA
// ============================================
function imprimirActa() {
    if (!actaSeleccionada) {
        mostrarAlerta('⚠️ no hay un acta cargada para imprimir', 'error');
        return;
    }
    window.print();
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
// ✅ BUSCAR ACTA POR VEHÍCULO (AGREGADA)
// ============================================
async function buscarActaPorVehiculo() {
    const searchInput = document.getElementById('vehicleSearchInput');
    const searchAlert = document.getElementById('vehicleSearchAlert');
    
    const terminoBusqueda = searchInput?.value.trim().toUpperCase() || '';
    
    if (!terminoBusqueda) {
        mostrarAlerta('⚠️ por favor ingrese un término de búsqueda', 'error', searchAlert);
        return;
    }
    
    if (!supabaseClient) {
        mostrarAlerta('❌ error de conexión con la base de datos', 'error', searchAlert);
        return;
    }
    
    try {
        // Buscar en todas las actas el vehículo
        const { data: actas, error } = await supabaseClient
            .from('actas_asignacion')
            .select('id, funcionario_nombre, funcionario_cedula, unidad_asignacion, vehiculos, fecha_dia, fecha_mes, fecha_anio, created_at');
        
        if (error) throw error;
        
        let actasEncontradas = [];
        
        for (const acta of actas) {
            let vehiculosData = null;
            try {
                if (typeof acta.vehiculos === 'string') {
                    vehiculosData = JSON.parse(acta.vehiculos);
                } else {
                    vehiculosData = acta.vehiculos;
                }
            } catch (e) { continue; }
            
            if (Array.isArray(vehiculosData)) {
                const encontrado = vehiculosData.some(v => {
                    const placa = (v.placa || '').toString().trim().toUpperCase();
                    const serial = (v.s_carroceria || '').toString().trim().toUpperCase();
                    const facsimil = (v.facsimil || '').toString().trim().toUpperCase();
                    const motor = (v.s_motor || '').toString().trim().toUpperCase();
                    
                    return placa === terminoBusqueda || 
                           serial === terminoBusqueda || 
                           facsimil === terminoBusqueda || 
                           motor === terminoBusqueda;
                });
                
                if (encontrado) {
                    actasEncontradas.push(acta);
                }
            }
        }
        
        // ✅ Aplicar filtro de vehículos > 0 también aquí
        actasFiltradas = filtrarActasConVehiculos(actasEncontradas);
        paginaActual = 1;
        renderizarTablaActas();
        
        if (actasFiltradas.length === 0) {
            mostrarAlerta('ℹ️ no se encontraron actas con ese vehículo', 'info', searchAlert);
        } else {
            mostrarAlerta(`✅ ${actasFiltradas.length} acta(s) encontrada(s)`, 'success', searchAlert);
        }
        
    } catch (error) {
        console.error('Error al buscar acta por vehículo:', error);
        mostrarAlerta('❌ error de conexión. intente nuevamente.', 'error', searchAlert);
    }
}

// ============================================
// ✅ EXPORTAR FUNCIONES GLOBALES
// ============================================
window.buscarActas = buscarActas;
window.cargarTodasLasActas = cargarTodasLasActas;
window.resetearFiltros = resetearFiltros;
window.verActa = verActa;
window.cerrarVistaPrevia = cerrarVistaPrevia;
window.imprimirActa = imprimirActa;
window.cambiarPagina = cambiarPagina;
window.irAPagina = irAPagina;
window.cargarEmailUsuario = cargarEmailUsuario;
window.mostrarAlerta = mostrarAlerta;
window.limpiarInput = limpiarInput;
window.contarVehiculos = contarVehiculos;
window.filtrarActasConVehiculos = filtrarActasConVehiculos;
window.renderizarVehiculosEnActa = renderizarVehiculosEnActa;
window.actualizarTextoSingularPlural = actualizarTextoSingularPlural;
window.buscarActaPorVehiculo = buscarActaPorVehiculo;  // ✅ AGREGADA

console.log('✅ Funciones exportadas a window');
console.log('📊 Paginación configurada:', itemsPorPagina, 'actas por página');
console.log('🚫 Filtro activo: Ocultar actas sin vehículos');
