/**
 * ============================================
 * FICHA TÉCNICA DE VEHÍCULOS - VERSIÓN CORREGIDA
 * ============================================
 */

// ================= CONFIGURACIÓN =================
let supabaseClient = null;

// ================= ESTADO =================
const fotosData = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

const CAMPOS_BLOQUEADOS = [
    'marca', 'modelo', 'tipo', 'clase', 'serialCarroceria',
    'serialMotor', 'color', 'placa', 'facsimil', 'estatus', 'dependencia'
];

// ================= ESTADO DE DUPLICADOS =================
var duplicadosEncontrados = {
    placa: false,
    facsimil: false,
    s_carroceria: false,
    s_motor: false
};

// ================= DEBOUNCE =================
var debounceTimers = {};

function debounce(func, delay, field) {
    if (debounceTimers[field]) {
        clearTimeout(debounceTimers[field]);
    }
    debounceTimers[field] = setTimeout(func, delay);
}

// ================= UTILIDADES =================
function mostrarAlerta(mensaje, tipo) {
    var alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function() {
        alertDiv.style.display = 'none';
    }, 5000);
}

function mostrarAlertaDuplicado(campo, mensaje, existe) {
    var input = document.getElementById(campo);
    if (!input) return;
    var formGroup = input.closest('.form-group');
    if (!formGroup) return;
    
    var alertaExistente = formGroup.querySelector('.duplicate-alert');
    if (alertaExistente) {
        alertaExistente.remove();
    }
    
    if (existe) {
        var alerta = document.createElement('div');
        alerta.className = 'duplicate-alert';
        alerta.style.cssText = 'color: #dc2626; font-size: 12px; margin-top: 5px; font-weight: 600;';
        alerta.innerHTML = '⚠️ ' + mensaje;
        formGroup.appendChild(alerta);
        input.style.borderColor = '#dc2626';
        input.style.backgroundColor = '#fef2f2';
        duplicadosEncontrados[campo] = true;
    } else {
        input.style.borderColor = '#ddd';
        input.style.backgroundColor = 'white';
        duplicadosEncontrados[campo] = false;
    }
    
    actualizarEstadoBotonGuardar();
}

function actualizarEstadoBotonGuardar() {
    var btnGuardar = document.getElementById('btnGuardar');
    if (!btnGuardar) return;
    
    var hayDuplicados = false;
    for (var key in duplicadosEncontrados) {
        if (duplicadosEncontrados[key] === true) {
            hayDuplicados = true;
            break;
        }
    }
    
    if (hayDuplicados) {
        btnGuardar.disabled = true;
        btnGuardar.style.opacity = '0.6';
        btnGuardar.style.cursor = 'not-allowed';
        btnGuardar.innerHTML = '⛔ Hay Duplicados - No se puede guardar';
    } else {
        btnGuardar.disabled = false;
        btnGuardar.style.opacity = '1';
        btnGuardar.style.cursor = 'pointer';
        btnGuardar.innerHTML = '💾 Guardar Ficha';
    }
}

function limpiarTexto(texto) {
    if (!texto) return '';
    return texto.toString().trim().toUpperCase();
}

// ================= INICIALIZAR SUPABASE =================
function inicializarSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Librería Supabase no cargada');
        return false;
    }
    
    var url = window.SUPABASE_URL;
    var key = window.SUPABASE_KEY;
    
    if (!url || !key) {
        console.error('❌ Configuración de Supabase no encontrada');
        return false;
    }
    
    try {
        supabaseClient = window.supabase.createClient(url, key);
        console.log('✅ Supabase inicializado correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        return false;
    }
}

// ================= VERIFICAR DUPLICADO =================
async function verificarDuplicadoEnTiempoReal(campo, valor, nombreCampo) {
    if (!valor || valor.trim() === '') {
        mostrarAlertaDuplicado(campo, '', false);
        return;
    }
    
    valor = limpiarTexto(valor);
    
    try {
        var result = await supabaseClient
            .from('fichas_tecnicas')
            .select('id, placa, facsimil, s_carroceria, s_motor')
            .eq(campo, valor)
            .limit(1);
        
        if (result.error) {
            console.error('Error verificando duplicado:', result.error);
            return;
        }
        
        if (result.data && result.data.length > 0) {
            mostrarAlertaDuplicado(campo, '¡' + nombreCampo + ' YA REGISTRADO!', true);
        } else {
            mostrarAlertaDuplicado(campo, '', false);
        }
    } catch (error) {
        console.error('Error en verificación:', error);
    }
}

// ================= ACTUALIZAR VISTA PREVIA =================
function actualizarVistaPrevia() {
    var campos = [
        'marca', 'modelo', 'tipo', 'clase', 'serialCarroceria',
        'color', 'placa', 'facsimil', 'serialMotor', 'dependencia',
        'estatus', 'causa', 'mecanica', 'diagnostico', 'ubicacion',
        'tapiceria', 'cauchos', 'luces', 'observaciones'
    ];
    
    campos.forEach(function(campo) {
        var input = document.getElementById(campo);
        var previewId = 'preview' + campo.charAt(0).toUpperCase() + campo.slice(1);
        var preview = document.getElementById(previewId);
        
        if (preview && input) {
            preview.textContent = input.value || 'N/A';
        }
    });
}

// ================= ACTUALIZAR FOTOS PREVIEW =================
function actualizarFotosPreview() {
    for (var i = 1; i <= 4; i++) {
        var img = document.getElementById('previewImg' + i);
        var box = document.getElementById('previewBox' + i);
        var span = box ? box.querySelector('span') : null;
        
        if (fotosData['foto' + i] && img && box && span) {
            img.src = fotosData['foto' + i];
            img.style.display = 'block';
            span.style.display = 'none';
        } else if (span) {
            if (img) img.style.display = 'none';
            span.style.display = 'block';
        }
    }
}

// ================= PREVIEW IMAGEN =================
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        
        if (!file.type.startsWith('image/')) {
            mostrarAlerta('⚠️ Por favor seleccione un archivo de imagen válido', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            mostrarAlerta('⚠️ La imagen no debe superar los 5MB', 'error');
            return;
        }
        
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = document.getElementById(previewId);
            var container = document.getElementById(previewId + 'Container');
            var placeholder = container ? container.querySelector('.placeholder') : null;
            
            if (img) {
                img.src = e.target.result;
                img.style.display = 'block';
            }
            
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            var fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            actualizarFotosPreview();
        };
        
        reader.onerror = function() {
            mostrarAlerta('❌ Error al leer la imagen', 'error');
        };
        
        reader.readAsDataURL(file);
    }
}

// ================= BUSCAR VEHÍCULO =================
async function buscarVehiculo() {
    var searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
        return;
    }
    
    var searchTerm = limpiarTexto(searchInput.value);
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando vehículo:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    try {
        var result = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or('placa.eq.' + searchTerm + ',facsimil.eq.' + searchTerm + ',s_carroceria.eq.' + searchTerm + ',s_motor.eq.' + searchTerm)
            .limit(1);
        
        var data = result.data;
        var error = result.error;
        
        if (error) {
            console.error('❌ Error en Supabase:', error);
            mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
            return;
        }
        
        if (!data || data.length === 0) {
            mostrarAlerta('❌ No se encontró ningún vehículo con: ' + searchTerm, 'error');
            return;
        }
        
        var vehiculo = data[0];
        console.log('✅ Vehículo encontrado:', vehiculo.placa || vehiculo.id);
        
        // Verificar si ya existe ficha
        var verificacionFicha = await supabaseClient
            .from('fichas_tecnicas')
            .select('id, placa')
            .or('placa.eq.' + (vehiculo.placa || '') + ',facsimil.eq.' + (vehiculo.facsimil || '') + ',s_carroceria.eq.' + (vehiculo.s_carroceria || '') + ',s_motor.eq.' + (vehiculo.s_motor || ''))
            .limit(1);
        
        if (verificacionFicha.data && verificacionFicha.data.length > 0) {
            mostrarAlerta('⚠️ ESTE VEHÍCULO YA TIENE FICHA TÉCNICA REGISTRADA', 'error');
            return;
        }
        
        // ✅ LLENAR FORMULARIO CON DATOS DEL VEHÍCULO
        llenarFormulario(vehiculo);
        bloquearCamposPrincipales();
        
        mostrarAlerta('✅ Vehículo encontrado: ' + vehiculo.marca + ' ' + vehiculo.modelo + ' - Placa: ' + vehiculo.placa, 'success');
        
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    }
}

// ================= LLENAR FORMULARIO ✅ CORREGIDO =================
function llenarFormulario(vehiculo) {
    console.log('📋 Llenando formulario con datos del vehículo:', vehiculo);
    
    // Campos normales (input, textarea)
    var camposNormales = {
        'marca': 'marca',
        'modelo': 'modelo',
        'clase': 'clase',
        'color': 'color',
        's_carroceria': 'serialCarroceria',
        's_motor': 'serialMotor',
        'placa': 'placa',
        'facsimil': 'facsimil',
        'unidad_administrativa': 'dependencia',
        'observacion': 'observaciones'
    };
    
    // Llenar campos normales
    Object.keys(camposNormales).forEach(function(dbField) {
        var formField = camposNormales[dbField];
        var element = document.getElementById(formField);
        if (element && vehiculo[dbField]) {
            element.value = vehiculo[dbField];
        }
    });
    
    // ✅ CAMPO TIPO (SELECT) - LLENAR DESDE BD
    var tipoSelect = document.getElementById('tipo');
    if (tipoSelect && vehiculo.tipo) {
        var valorTipo = limpiarTexto(vehiculo.tipo);
        console.log('🔧 Buscando tipo en select:', valorTipo);
        
        // Buscar opción que coincida
        var encontrado = false;
        for (var i = 0; i < tipoSelect.options.length; i++) {
            var opcion = tipoSelect.options[i];
            if (opcion.value.toUpperCase() === valorTipo) {
                tipoSelect.value = opcion.value;
                encontrado = true;
                console.log('✅ Tipo encontrado:', opcion.value);
                break;
            }
        }
        
        // Si no encontró exacto, intentar coincidencia parcial
        if (!encontrado) {
            for (var j = 0; j < tipoSelect.options.length; j++) {
                var opt = tipoSelect.options[j];
                if (valorTipo.includes(opt.value) || opt.value.includes(valorTipo)) {
                    tipoSelect.value = opt.value;
                    console.log('✅ Tipo encontrado (parcial):', opt.value);
                    break;
                }
            }
        }
    }
    
    // ✅ CAMPO ESTATUS (SELECT)
    var estatusSelect = document.getElementById('estatus');
    if (estatusSelect) {
        var valorEstatus = vehiculo.estatus || vehiculo.situacion || '';
        if (valorEstatus) {
            var valorNormalizado = limpiarTexto(valorEstatus)
                .replace('OPERATIVA', 'OPERATIVO')
                .replace('INOPERATIVA', 'INOPERATIVO')
                .replace('DESINCORPORADA', 'DESINCORPORADO');
            
            for (var k = 0; k < estatusSelect.options.length; k++) {
                var optStatus = estatusSelect.options[k];
                if (optStatus.value.toUpperCase() === valorNormalizado) {
                    estatusSelect.value = optStatus.value;
                    console.log('✅ Estatus encontrado:', optStatus.value);
                    break;
                }
            }
        }
    }
    
    actualizarVistaPrevia();
}

// ================= BLOQUEAR CAMPOS =================
function bloquearCamposPrincipales() {
    CAMPOS_BLOQUEADOS.forEach(function(campo) {
        var element = document.getElementById(campo);
        if (element) {
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
            var formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('locked');
            }
        }
    });
}

// ================= DESBLOQUEAR CAMPOS =================
function desbloquearCampos() {
    CAMPOS_BLOQUEADOS.forEach(function(campo) {
        var element = document.getElementById(campo);
        if (element) {
            element.disabled = false;
            element.style.backgroundColor = 'white';
            element.style.cursor = 'auto';
            var formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.remove('locked');
            }
        }
    });
}

// ================= LIMPIAR BÚSQUEDA =================
function limpiarBusqueda() {
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    var searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    var form = document.getElementById('fichaForm');
    if (form) form.reset();
    
    desbloquearCampos();
    actualizarVistaPrevia();
    
    // Limpiar alertas de duplicados
    var alertas = document.querySelectorAll('.duplicate-alert');
    for (var i = 0; i < alertas.length; i++) {
        alertas[i].remove();
    }
    
    // Limpiar fotos
    for (var j = 1; j <= 4; j++) {
        var input = document.getElementById('foto' + j);
        var img = document.getElementById('previewFoto' + j);
        var container = document.getElementById('previewFoto' + j + 'Container');
        var placeholder = container ? container.querySelector('.placeholder') : null;
        
        if (input) input.value = '';
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
        fotosData['foto' + j] = null;
    }
    
    // Resetear duplicados
    duplicadosEncontrados.placa = false;
    duplicadosEncontrados.facsimil = false;
    duplicadosEncontrados.s_carroceria = false;
    duplicadosEncontrados.s_motor = false;
    
    actualizarFotosPreview();
    actualizarEstadoBotonGuardar();
    
    mostrarAlerta('🔄 Formulario limpiado', 'info');
}

// ================= SUBIR FOTO =================
async function subirFotoSupabase(file, placa, numeroFoto) {
    try {
        var bucketName = 'fichas-tecnicas';
        var fileName = 'ficha_' + Date.now() + '_foto' + numeroFoto + '_' + (placa || 'sinplaca') + '.jpg';
        
        var result = await supabaseClient
            .storage
            .from(bucketName)
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (result.error) {
            console.error('❌ Error subiendo foto:', result.error);
            return null;
        }
        
        var urlResult = supabaseClient
            .storage
            .from(bucketName)
            .getPublicUrl(fileName);
        
        console.log('✅ Foto subida:', urlResult.data.publicUrl);
        return urlResult.data.publicUrl;
        
    } catch (error) {
        console.error('❌ Error en subirFotoSupabase:', error);
        return null;
    }
}

// ================= VERIFICAR DUPLICADOS =================
async function verificarDuplicadosAntesDeGuardar(placa, facsimil, s_carroceria, s_motor) {
    var duplicados = [];
    var condiciones = [];
    
    if (placa && placa.trim() !== '') {
        condiciones.push('placa.eq.' + placa.trim());
    }
    if (facsimil && facsimil.trim() !== '') {
        condiciones.push('facsimil.eq.' + facsimil.trim());
    }
    if (s_carroceria && s_carroceria.trim() !== '') {
        condiciones.push('s_carroceria.eq.' + s_carroceria.trim());
    }
    if (s_motor && s_motor.trim() !== '') {
        condiciones.push('s_motor.eq.' + s_motor.trim());
    }
    
    if (condiciones.length === 0) {
        return { existe: false, duplicados: [] };
    }
    
    try {
        var result = await supabaseClient
            .from('fichas_tecnicas')
            .select('id, placa, facsimil, s_carroceria, s_motor')
            .or(condiciones.join(','));
        
        if (result.error) {
            console.error('❌ Error verificando duplicados:', result.error);
            return { existe: false, duplicados: [], error: result.error };
        }
        
        if (result.data && result.data.length > 0) {
            result.data.forEach(function(ficha) {
                if (placa && ficha.placa === placa) duplicados.push('Placa: ' + ficha.placa);
                if (facsimil && ficha.facsimil === facsimil) duplicados.push('Facsimil: ' + ficha.facsimil);
                if (s_carroceria && ficha.s_carroceria === s_carroceria) duplicados.push('Serial Carrocería: ' + ficha.s_carroceria);
                if (s_motor && ficha.s_motor === s_motor) duplicados.push('Serial Motor: ' + ficha.s_motor);
            });
            return { existe: true, duplicados: duplicados };
        }
        
        return { existe: false, duplicados: [] };
        
    } catch (error) {
        console.error('❌ Error en verificarDuplicados:', error);
        return { existe: false, duplicados: [], error: error };
    }
}

// ================= GUARDAR FICHA =================
async function guardarFicha() {
    var form = document.getElementById('fichaForm');
    if (form && !form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }
    
    // Validar campos obligatorios
    var camposObligatorios = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'estatus', 'dependencia'];
    var camposFaltantes = [];
    
    camposObligatorios.forEach(function(campo) {
        var input = document.getElementById(campo);
        if (input && !input.value.trim()) {
            camposFaltantes.push(campo);
        }
    });
    
    if (camposFaltantes.length > 0) {
        mostrarAlerta('⚠️ Campos obligatorios: ' + camposFaltantes.join(', '), 'error');
        return;
    }
    
    // Obtener valores
    var placa = (document.getElementById('placa')?.value || '').toUpperCase().trim();
    var facsimil = (document.getElementById('facsimil')?.value || '').toUpperCase().trim();
    var s_carroceria = (document.getElementById('serialCarroceria')?.value || '').toUpperCase().trim();
    var s_motor = (document.getElementById('serialMotor')?.value || '').toUpperCase().trim();
    
    // Verificar duplicados
    var hayDuplicados = false;
    for (var key in duplicadosEncontrados) {
        if (duplicadosEncontrados[key] === true) {
            hayDuplicados = true;
            break;
        }
    }
    
    if (hayDuplicados) {
        mostrarAlerta('❌ No se puede guardar: Hay campos duplicados', 'error');
        return;
    }
    
    mostrarAlerta('⏳ Verificando duplicados...', 'info');
    var verificacion = await verificarDuplicadosAntesDeGuardar(placa, facsimil, s_carroceria, s_motor);
    
    if (verificacion.existe) {
        mostrarAlerta('❌ YA EXISTE UNA FICHA CON: ' + verificacion.duplicados.join(', '), 'error');
        return;
    }
    
    mostrarAlerta('⏳ Guardando ficha técnica...', 'info');
    
    try {
        var fichaData = {
            vehiculo_id: null,
            placa: placa,
            facsimil: facsimil,
            marca: (document.getElementById('marca')?.value || '').toUpperCase(),
            modelo: (document.getElementById('modelo')?.value || '').toUpperCase(),
            tipo: (document.getElementById('tipo')?.value || '').toUpperCase(),
            clase: (document.getElementById('clase')?.value || '').toUpperCase(),
            color: (document.getElementById('color')?.value || '').toUpperCase(),
            s_carroceria: s_carroceria,
            s_motor: s_motor,
            estatus_ficha: (document.getElementById('estatus')?.value || '').toUpperCase(),
            dependencia: (document.getElementById('dependencia')?.value || '').toUpperCase(),
            causa: document.getElementById('causa')?.value || '',
            mecanica: document.getElementById('mecanica')?.value || '',
            diagnostico: document.getElementById('diagnostico')?.value || '',
            ubicacion: document.getElementById('ubicacion')?.value || '',
            tapiceria: document.getElementById('tapiceria')?.value || '',
            cauchos: document.getElementById('cauchos')?.value || '',
            luces: document.getElementById('luces')?.value || '',
            observaciones: document.getElementById('observaciones')?.value || '',
            creado_por: document.getElementById('userEmail')?.textContent || 'usuario@institucion.com',
            fecha_creacion: new Date().toISOString()
        };
        
        // Subir fotos
        var fotoUrls = {
            foto1_url: null,
            foto2_url: null,
            foto3_url: null,
            foto4_url: null
        };
        
        for (var i = 1; i <= 4; i++) {
            var input = document.getElementById('foto' + i);
            if (input && input.files && input.files[0]) {
                var url = await subirFotoSupabase(input.files[0], placa, i);
                fotoUrls['foto' + i + '_url'] = url;
            }
        }
        
        // Insertar en Supabase
        var result = await supabaseClient
            .from('fichas_tecnicas')
            .insert([Object.assign({}, fichaData, fotoUrls)])
            .select();
        
        if (result.error) {
            console.error('❌ Error en Supabase:', result.error);
            mostrarAlerta('❌ Error al guardar: ' + result.error.message, 'error');
            return;
        }
        
        console.log('✅ Ficha guardada:', result.data);
        mostrarAlerta('✅ ¡FICHA TÉCNICA GUARDADA EXITOSAMENTE!', 'success');
        
        setTimeout(function() {
            limpiarBusqueda();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error al guardar ficha:', error);
        mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
    }
}

// ================= CARGAR USUARIO =================
async function cargarUsuario() {
    try {
        if (supabaseClient) {
            var result = await supabaseClient.auth.getSession();
            var session = result.data ? result.data.session : null;
            
            if (session && session.user && session.user.email) {
                var userEmail = document.getElementById('userEmail');
                if (userEmail) {
                    userEmail.textContent = session.user.email;
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}

// ================= CERRAR SESIÓN =================
async function cerrarSesion() {
    if (confirm('¿Está seguro de cerrar sesión?')) {
        try {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            localStorage.clear();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '../index.html';
        }
    }
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando ficha técnica...');
    
    if (!inicializarSupabase()) {
        console.warn('⚠️ Supabase no disponible');
    }
    
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    // Event listeners para vista previa
    var inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    inputs.forEach(function(input) {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
    // Validación predictiva de duplicados
    var camposPredictivos = [
        { id: 'placa', nombre: 'Placa', campo: 'placa' },
        { id: 'facsimil', nombre: 'Facsimil', campo: 'facsimil' },
        { id: 'serialCarroceria', nombre: 'Serial Carrocería', campo: 's_carroceria' },
        { id: 'serialMotor', nombre: 'Serial Motor', campo: 's_motor' }
    ];
    
    camposPredictivos.forEach(function(campo) {
        var input = document.getElementById(campo.id);
        if (input) {
            input.addEventListener('input', function(e) {
                var valor = e.target.value;
                debounce(function() {
                    verificarDuplicadoEnTiempoReal(campo.campo, valor, campo.nombre);
                }, 800, campo.id);
            });
            
            input.addEventListener('blur', function(e) {
                var valor = e.target.value;
                if (valor && valor.trim() !== '') {
                    verificarDuplicadoEnTiempoReal(campo.campo, valor, campo.nombre);
                }
            });
        }
    });
    
    // Botones
    var btnGuardar = document.getElementById('btnGuardar');
    var btnLimpiar = document.getElementById('btnLimpiar');
    var logoutBtn = document.getElementById('logoutBtn');
    var searchInput = document.getElementById('searchInput');
    
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarFicha);
    }
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarBusqueda);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarVehiculo();
            }
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    cargarUsuario();
    actualizarEstadoBotonGuardar();
    
    console.log('✅ Inicialización completada');
});
