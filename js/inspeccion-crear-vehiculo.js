/* ============================================ */
/* INSPECCION-CREAR-VEHICULO.JS                 */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* INSPECCIÓN PVR - PATRULLAS                   */
/* BÚSQUEDA Y AUTO-LLENADO                      */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;
let vehiculoEncontrado = null;

// ============================================
// ✅ INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOMContentLoaded - Iniciando inspeccion-crear-vehiculo.js');
    
    if (typeof window.supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY) {
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log('✅ Supabase inicializado correctamente');
    } else {
        console.error('❌ Error: Credenciales de Supabase no encontradas. Verifica config.js');
    }
    
    cargarEmailUsuario();
    actualizarVistaPrevia(); // Actualizar al cargar
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
// ✅ BUSCAR VEHÍCULO EN LA BASE DE DATOS
// ============================================
async function buscarVehiculo() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const terminoBusqueda = searchInput.value.trim().toUpperCase();
    
    if (!terminoBusqueda) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error', searchAlert);
        return;
    }
    
    if (!supabaseClient) {
        mostrarAlerta('❌ Error de conexión con la base de datos', 'error', searchAlert);
        return;
    }
    
    try {
        mostrarAlerta('🔄 Buscando vehículo...', 'info', searchAlert);
        
        // ✅ Buscar en la tabla de vehículos
        // Buscamos por placa, facsimilar, serial_carroceria, serial_motor, marca, modelo
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq.${terminoBusqueda},facsimilar.eq.${terminoBusqueda},serial_carroceria.eq.${terminoBusqueda},serial_motor.eq.${terminoBusqueda},marca.ilike.%${terminoBusqueda}%,modelo.ilike.%${terminoBusqueda}%`)
            .limit(1);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            mostrarAlerta('❌ No se encontró ningún vehículo con los datos proporcionados', 'error', searchAlert);
            vehiculoEncontrado = null;
            return;
        }
        
        // ✅ Vehículo encontrado
        vehiculoEncontrado = data[0];
        console.log('✅ Vehículo encontrado:', vehiculoEncontrado);
        
        // ✅ Autollenar el formulario
        autollenarFormulario(vehiculoEncontrado);
        
        mostrarAlerta(`✅ Vehículo encontrado: ${vehiculoEncontrado.marca} ${vehiculoEncontrado.modelo} - Placa: ${vehiculoEncontrado.placa}`, 'success', searchAlert);
        
    } catch (error) {
        console.error('❌ Error al buscar vehículo:', error);
        mostrarAlerta('❌ Error al buscar: ' + error.message, 'error', searchAlert);
    }
}

// ============================================
// ✅ AUTOLLENAR FORMULARIO CON DATOS DEL VEHÍCULO
// ============================================
function autollenarFormulario(vehiculo) {
    console.log('🔄 Autollenando formulario...');
    
    // Datos básicos del vehículo
    if (vehiculo.placa) document.getElementById('placa').value = vehiculo.placa;
    if (vehiculo.marca) document.getElementById('marca').value = vehiculo.marca;
    if (vehiculo.modelo) document.getElementById('modelo').value = vehiculo.modelo;
    if (vehiculo.anio) document.getElementById('ano').value = vehiculo.anio;
    if (vehiculo.tipo) document.getElementById('tipoVehiculo').value = vehiculo.tipo;
    if (vehiculo.color) document.getElementById('color').value = vehiculo.color;
    if (vehiculo.kilometraje) document.getElementById('kilometraje').value = vehiculo.kilometraje;
    if (vehiculo.numero_identificacion) document.getElementById('numeroIdentificacion').value = vehiculo.numero_identificacion;
    if (vehiculo.serial_carroceria) document.getElementById('serialCarroceria').value = vehiculo.serial_carroceria;
    
    // ✅ Actualizar vista previa automáticamente
    actualizarVistaPrevia();
    
    console.log('✅ Formulario autollenado correctamente');
}

// ============================================
// ✅ LIMPIAR BÚSQUEDA
// ============================================
function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    
    searchInput.value = '';
    vehiculoEncontrado = null;
    
    if (searchAlert) {
        searchAlert.style.display = 'none';
    }
    
    console.log('🔄 Búsqueda limpiada');
}

// ============================================
// ✅ ACTUALIZAR VISTA PREVIA EN TIEMPO REAL
// ============================================
function actualizarVistaPrevia() {
    console.log('🔄 Actualizando vista previa...');
    
    // ===== DATOS GENERALES =====
    document.getElementById('previewNumeroInspeccion').textContent = document.getElementById('numeroInspeccion').value || '-';
    document.getElementById('previewFecha').textContent = formatearFecha(document.getElementById('fechaInspeccion').value) || '-';
    document.getElementById('previewMotivo').textContent = document.getElementById('motivoInspeccion').value || '-';
    document.getElementById('previewHora').textContent = document.getElementById('horaInspeccion').value || '-';
    document.getElementById('previewLugar').textContent = document.getElementById('lugarInspeccion').value || '-';
    document.getElementById('previewAdscrita').textContent = document.getElementById('adscritaA').value || '-';
    
    // ===== DATOS DEL VEHÍCULO =====
    document.getElementById('previewPlaca').textContent = document.getElementById('placa').value || '-';
    document.getElementById('previewMarca').textContent = document.getElementById('marca').value || '-';
    document.getElementById('previewModelo').textContent = document.getElementById('modelo').value || '-';
    document.getElementById('previewAno').textContent = document.getElementById('ano').value || '-';
    document.getElementById('previewTipo').textContent = document.getElementById('tipoVehiculo').value || '-';
    document.getElementById('previewColor').textContent = document.getElementById('color').value || '-';
    document.getElementById('previewKilometraje').textContent = document.getElementById('kilometraje').value || '-';
    document.getElementById('previewNumeroIdentificacion').textContent = document.getElementById('numeroIdentificacion').value || '-';
    document.getElementById('previewSerialCarroceria').textContent = document.getElementById('serialCarroceria').value || '-';
    
    // ===== EQUIPAMIENTO =====
    document.getElementById('previewBateria').textContent = document.getElementById('bateria').value || '-';
    document.getElementById('previewEstacionBase').textContent = document.getElementById('estacionBase').value || '-';
    document.getElementById('previewEstacionLuces').textContent = document.getElementById('estacionLuces').value || '-';
    document.getElementById('previewCoctelera').textContent = document.getElementById('coctelera').value || '-';
    document.getElementById('previewTriangulo').textContent = document.getElementById('triangulo').value || '-';
    document.getElementById('previewPoseePlacas').textContent = document.getElementById('poseePlacas').value || '-';
    document.getElementById('previewHerramientas').textContent = document.getElementById('herramientas').value || '-';
    document.getElementById('previewGato').textContent = document.getElementById('gato').value || '-';
    
    // ===== ACTUALIZAR TABLA DE COMPONENTES =====
    actualizarTablaComponentes();
    
    // ===== ACTUALIZAR TABLA DE CAUCHOS =====
    actualizarTablaCaucho();
    
    // ===== OBSERVACIONES =====
    document.getElementById('previewObservaciones').textContent = document.getElementById('observaciones').value || '-';
}

// ============================================
// ✅ ACTUALIZAR TABLA DE COMPONENTES
// ============================================
function actualizarTablaComponentes() {
    const tbody = document.getElementById('previewComponentesBody');
    if (!tbody) return;
    
    // Lista completa de todos los componentes del formulario
    const componentes = [
        { nombre: 'guardafango_izq', label: 'GUARDAFANGO DEL IZQ' },
        { nombre: 'vidrio_lateral_izq', label: 'VIDRIO LATERAL DEL IZQ' },
        { nombre: 'volante', label: 'VOLANTE' },
        { nombre: 'guardafango_der', label: 'GUARDAFANGO DEL DER' },
        { nombre: 'vidrio_lateral_der', label: 'VIDRIO LATERAL DEL DER' },
        { nombre: 'corneta', label: 'CORNETA (PITO)' },
        // ... agregar todos los componentes restantes
    ];
    
    let html = '';
    
    // Generar filas de 3 componentes cada una
    for (let i = 0; i < componentes.length; i += 3) {
        const comp1 = componentes[i];
        const comp2 = componentes[i + 1] || { nombre: null, label: '' };
        const comp3 = componentes[i + 2] || { nombre: null, label: '' };
        
        html += '<tr>';
        
        // Componente 1
        if (comp1.nombre) {
            const estado1 = getRadioValue(comp1.nombre);
            html += `<td>${comp1.label}</td>`;
            html += `<td>${estado1 === 'B' ? '✓' : ''}</td>`;
            html += `<td>${estado1 === 'M' ? '✓' : ''}</td>`;
            html += `<td>${estado1 === 'NT' ? '✓' : ''}</td>`;
        } else {
            html += '<td></td><td></td><td></td><td></td>';
        }
        
        // Componente 2
        if (comp2.nombre) {
            const estado2 = getRadioValue(comp2.nombre);
            html += `<td>${comp2.label}</td>`;
            html += `<td>${estado2 === 'B' ? '✓' : ''}</td>`;
            html += `<td>${estado2 === 'M' ? '✓' : ''}</td>`;
            html += `<td>${estado2 === 'NT' ? '✓' : ''}</td>`;
        } else {
            html += '<td></td><td></td><td></td><td></td>';
        }
        
        // Componente 3
        if (comp3.nombre) {
            const estado3 = getRadioValue(comp3.nombre);
            html += `<td>${comp3.label}</td>`;
            html += `<td>${estado3 === 'B' ? '✓' : ''}</td>`;
            html += `<td>${estado3 === 'M' ? '✓' : ''}</td>`;
            html += `<td>${estado3 === 'NT' ? '✓' : ''}</td>`;
        } else {
            html += '<td></td><td></td><td></td><td></td>';
        }
        
        html += '</tr>';
    }
    
    tbody.innerHTML = html;
}

// ============================================
// ✅ ACTUALIZAR TABLA DE CAUCHOS
// ============================================
function actualizarTablaCaucho() {
    const tbody = document.getElementById('previewCauchoBody');
    if (!tbody) return;
    
    const cauchos = [
        { numero: '1', name: 'caucho_1' },
        { numero: '2', name: 'caucho_2' },
        { numero: '3', name: 'caucho_3' },
        { numero: '4', name: 'caucho_4' },
        { numero: 'REPUESTO', name: 'caucho_repuesto' }
    ];
    
    let html = '';
    
    cauchos.forEach(caucho => {
        const estado = getRadioValue(`${caucho.name}_estado`);
        const siChecked = document.querySelector(`input[name="${caucho.name}_si"]:checked`) ? '✓' : '';
        const noChecked = document.querySelector(`input[name="${caucho.name}_no"]:checked`) ? '✓' : '';
        const tapa = document.querySelector(`input[name="${caucho.name}_tapa"]`)?.value || '';
        const numero = document.querySelector(`input[name="${caucho.name}_numero"]`)?.value || '';
        
        html += '<tr>';
        html += `<td>${caucho.numero}</td>`;
        html += `<td>${estado === 'B' ? '✓' : ''}</td>`;
        html += `<td>${estado === 'M' ? '✓' : ''}</td>`;
        html += `<td>${siChecked}</td>`;
        html += `<td>${noChecked}</td>`;
        html += `<td>${tapa}</td>`;
        html += `<td>${numero}</td>`;
        html += '</tr>';
    });
    
    tbody.innerHTML = html;
}

// ============================================
// ✅ OBTENER VALOR DE RADIO BUTTON
// ============================================
function getRadioValue(name) {
    const radio = document.querySelector(`input[name="${name}"]:checked`);
    return radio ? radio.value : '';
}

// ============================================
// ✅ FORMATEAR FECHA
// ============================================
function formatearFecha(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-VE');
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
    
    setTimeout(() => {
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    if (tipo !== 'error') {
        setTimeout(() => { alertElement.style.display = 'none'; }, 5000);
    }
}

// ============================================
// ✅ GUARDAR INSPECCIÓN
// ============================================
async function guardarInspeccion() {
    const numeroInspeccion = document.getElementById('numeroInspeccion').value;
    
    if (!numeroInspeccion) {
        alert('⚠️ Por favor complete el número de inspección');
        document.getElementById('numeroInspeccion').focus();
        return;
    }
    
    if (!confirm('¿Está seguro de guardar esta inspección?')) {
        return;
    }
    
    try {
        // Recolectar todos los datos del formulario
        const inspeccionData = {
            numero_inspeccion: document.getElementById('numeroInspeccion').value,
            fecha_inspeccion: document.getElementById('fechaInspeccion').value,
            motivo: document.getElementById('motivoInspeccion').value,
            hora: document.getElementById('horaInspeccion').value,
            lugar: document.getElementById('lugarInspeccion').value,
            adscrita_a: document.getElementById('adscritaA').value,
            placa: document.getElementById('placa').value,
            marca: document.getElementById('marca').value,
            modelo: document.getElementById('modelo').value,
            ano: document.getElementById('ano').value,
            tipo: document.getElementById('tipoVehiculo').value,
            color: document.getElementById('color').value,
            kilometraje: document.getElementById('kilometraje').value,
            numero_identificacion: document.getElementById('numeroIdentificacion').value,
            serial_carroceria: document.getElementById('serialCarroceria').value,
            bateria: document.getElementById('bateria').value,
            estacion_base: document.getElementById('estacionBase').value,
            estacion_luces: document.getElementById('estacionLuces').value,
            coctelera: document.getElementById('coctelera').value,
            triangulo: document.getElementById('triangulo').value,
            posee_placas: document.getElementById('poseePlacas').value,
            herramientas: document.getElementById('herramientas').value,
            gato: document.getElementById('gato').value,
            observaciones: document.getElementById('observaciones').value,
            created_at: new Date().toISOString()
        };
        
        console.log('💾 Guardando inspección:', inspeccionData);
        
        if (supabaseClient) {
            const { data, error } = await supabaseClient
                .from('inspecciones_pvr')
                .insert([inspeccionData]);
            
            if (error) throw error;
            
            alert('✅ Inspección guardada exitosamente');
            
            // Opcional: Limpiar formulario
            if (confirm('¿Desea crear una nueva inspección?')) {
                document.getElementById('inspeccionForm').reset();
                actualizarVistaPrevia();
                limpiarBusqueda();
            }
        } else {
            alert('⚠️ Simulación: Inspección guardada (Supabase no disponible)');
            console.log('Datos a guardar:', inspeccionData);
        }
        
    } catch (error) {
        console.error('❌ Error al guardar inspección:', error);
        alert('❌ Error al guardar: ' + error.message);
    }
}

// ============================================
// ✅ IMPRIMIR INSPECCIÓN
// ============================================
function imprimirInspeccion() {
    window.print();
}

// ============================================
// ✅ EXPORTAR FUNCIONES GLOBALES
// ============================================
window.buscarVehiculo = buscarVehiculo;
window.limpiarBusqueda = limpiarBusqueda;
window.autollenarFormulario = autollenarFormulario;
window.actualizarVistaPrevia = actualizarVistaPrevia;
window.guardarInspeccion = guardarInspeccion;
window.imprimirInspeccion = imprimirInspeccion;
window.cargarEmailUsuario = cargarEmailUsuario;
window.mostrarAlerta = mostrarAlerta;

console.log('✅ Funciones exportadas a window');
