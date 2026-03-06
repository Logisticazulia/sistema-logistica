/* ============================================ */
/* INSPECCION-CREAR-VEHICULO.JS                 */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* INSPECCIÓN PVR - PATRULLAS                   */
/* VISTA PREVIA EN TIEMPO REAL                  */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;

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
        // Fila 1
        { nombre: 'guardafango_izq', label: 'GUARDAFANGO DEL IZQ' },
        { nombre: 'vidrio_lateral_izq', label: 'VIDRIO LATERAL DEL IZQ' },
        { nombre: 'volante', label: 'VOLANTE' },
        
        // Fila 2
        { nombre: 'guardafango_der', label: 'GUARDAFANGO DEL DER' },
        { nombre: 'vidrio_lateral_der', label: 'VIDRIO LATERAL DEL DER' },
        { nombre: 'corneta', label: 'CORNETA (PITO)' },
        
        // Fila 3
        { nombre: 'guardafango_tra_izq', label: 'GUARDAFANGO TRA IZQ' },
        { nombre: 'vidrio_tra_izq', label: 'VIDRIO LATERAL TRA IZQ' },
        { nombre: 'refrigerador', label: 'REFRIGERADOR' },
        
        // Fila 4
        { nombre: 'guardafango_tra_der', label: 'GUARDAFANGO TRA DER' },
        { nombre: 'vidrio_tra_der', label: 'VIDRIO LATERAL TRA DER' },
        { nombre: 'luces_der', label: 'LUCES ALTA Y BAJA DER' },
        
        // Fila 5
        { nombre: 'puerta_izq', label: 'PUERTA DEL IZQ' },
        { nombre: 'antena_gps', label: 'ANTENA DE GPS' },
        { nombre: 'luces_izq', label: 'LUCES ALTA Y BAJA IZQ' },
        
        // Fila 6
        { nombre: 'puerta_der', label: 'PUERTA DEL DER' },
        { nombre: 'limpia_parabrisas', label: 'LIMPIA PARABRISAS DEL' },
        { nombre: 'faro_der', label: 'FARO DEL DER. NIEBLINA' },
        
        // Fila 7
        { nombre: 'puerta_tra_izq', label: 'PUERTA TRA IZQ' },
        { nombre: 'tablero', label: 'TABLERO DE INSTRUM' },
        { nombre: 'faro_izq', label: 'FARO DEL IZQ. NIEBLINA' },
        
        // Fila 8
        { nombre: 'puerta_tra_der', label: 'PUERTA TRA DER' },
        { nombre: 'tablero_perillas', label: 'TABLERO Y PERILLAS A/A' },
        { nombre: 'cerradura_der', label: 'CERRADURA DER' },
        
        // Fila 9
        { nombre: 'parachoque_tra', label: 'PARACHOQUE TRASERO' },
        { nombre: 'stop_tra_der', label: 'STOP TRASERO DER' },
        { nombre: 'cerradura_izq', label: 'CERRADURA IZQ' },
        
        // Fila 10
        { nombre: 'parachoque_del', label: 'PARACHOQUE DELANTER' },
        { nombre: 'stop_tra_izq', label: 'STOP TRASERO IZQ' },
        { nombre: 'bombona_gas', label: 'BOMBONA DE GAS' },
        
        // Fila 11
        { nombre: 'capot', label: 'CAPOT' },
        { nombre: 'faro_del_der', label: 'FARO DELANTERO DER' },
        { nombre: 'cinturones', label: 'CINTURONES DE SEGURID' },
        
        // Fila 12
        { nombre: 'puerta_cabina', label: 'PUERTA DE LA CABINA' },
        { nombre: 'faro_del_izq', label: 'FARO DELANTERO IZQ' },
        { nombre: 'camara_motor', label: 'CAMARA MOTOR' },
        
        // Fila 13
        { nombre: 'parabrisas_tra', label: 'PARABRISAS TRASERO' },
        { nombre: 'buche_der', label: 'BUCHE DEL DER' },
        { nombre: 'electroventilador', label: 'ELECTROVENTILADOR' },
        
        // Fila 14
        { nombre: 'parabrisas_del', label: 'PARABRISAS DELANTER' },
        { nombre: 'buche_izq', label: 'BUCHE DEL IZQ' },
        { nombre: 'alternador', label: 'ALTERNADOR' },
        
        // Fila 15
        { nombre: 'espejo_der', label: 'ESPEJO RETROVISOR DER' },
        { nombre: 'buche_tra_der', label: 'BUCHE TRAS. DER' },
        { nombre: 'compresor_aa', label: 'COMPRESOR DE A/A' },
        
        // Fila 16
        { nombre: 'espejo_izq', label: 'ESPEJO RETROVISOR IZQ' },
        { nombre: 'buche_tra_izq', label: 'BUCHE TRAS. IZQ' },
        { nombre: 'radiador', label: 'RADIADOR' },
        
        // Fila 17
        { nombre: 'ables_aux', label: 'ABLES AUXILIARES DE BA' },
        { nombre: 'coctelera_check', label: 'COCTELERA' },
        { nombre: 'asfa_radiador', label: 'ASFA RADIADOR' },
        
        // Fila 18
        { nombre: 'tapa_gasolina', label: 'TAPA DE GASOLINA' },
        { nombre: 'tapa_radiador', label: 'TAPA RADIADOR' },
        { nombre: 'varilla_aceite', label: 'VARILLA MEDICION ACEIT' },
        
        // Fila 19
        { nombre: 'caja_velocidades', label: 'CAJA DE VELOCIDADES' },
        { nombre: 'tapa_distribuidor', label: 'TAPA DISTRIBUIDOR' },
        { nombre: 'tapa_bomba_hidraulic', label: 'TAPA BOMBA HIDRAULIC' },
        
        // Fila 20
        { nombre: 'asientos_del', label: 'ASIENTOS DELANTEROS' },
        { nombre: 'asientos_tra', label: 'ASIENTOS TRASEROS' },
        { nombre: 'espolder', label: 'ESPOLDER DEL (BABERO)' },
        
        // Fila 21
        { nombre: 'radiador_aa', label: 'RADIADOR DE A/A (EVA)' },
        { nombre: 'arranque', label: 'ARRANQUE' },
        { nombre: 'computadora', label: 'COMPUTADORA' },
        
        // Fila 22
        { nombre: 'bomba_freno', label: 'BOMBA DE FRENO' },
        { nombre: 'bomba_direccion', label: 'BOMBA DE DIRECCION' },
        { nombre: 'fan_cooler', label: 'FAN COOLER' },
        
        // Fila 23
        { nombre: 'cajetin_direccion', label: 'CAJETIN DE DIRECCION' },
        { nombre: 'diferencial', label: 'DIFERENCIAL DE TRANSMISION' },
        { nombre: 'disco_freno_der', label: 'DISCO DE FRENO D/DERECHO' },
        
        // Fila 24
        { nombre: 'disco_freno_izq', label: 'DISCO DE FRENO D/IZQUIERDO' },
        { nombre: 'tambor_freno_izq', label: 'TAMBOR DE FRENO IZQUIERDO' },
        { nombre: 'tambor_freno_der', label: 'TAMBOR DE FRENO DERECHO' },
        
        // Fila 25
        { nombre: 'cuerpo_aceleracion', label: 'CUERPO DE ACELERACION' },
        { nombre: 'parrilla_delantera', label: 'PARRILLA DELANTERA' },
        { nombre: 'llave_cruz', label: 'LLAVE DE CRUZ' },
        
        // Fila 26
        { nombre: 'cuna_inmovilizacion', label: 'CUNA DE INMOVILIZACION (CALZA)' },
        { nombre: 'extintor', label: 'EXTINTOR DE INCENDIO' },
        { nombre: 'gencero', label: 'GENCERO' },
        
        // Fila 27
        { nombre: 'cardan_del', label: 'CARDAN DEL' },
        { nombre: 'cardan_tra', label: 'CARDAN TRAS' },
        { nombre: null, label: '' } // Celda vacía
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
window.actualizarVistaPrevia = actualizarVistaPrevia;
window.guardarInspeccion = guardarInspeccion;
window.imprimirInspeccion = imprimirInspeccion;
window.cargarEmailUsuario = cargarEmailUsuario;

console.log('✅ Funciones exportadas a window');
