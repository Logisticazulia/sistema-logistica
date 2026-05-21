/**
* ============================================
* FICHA TÉCNICA DE VEHÍCULOS - VERSIÓN CORREGIDA
* ============================================
*/
// ================= CONFIGURACIÓN =================
let supabaseClient = null;

// ================= ESTADO =================
const fotosData = { foto1: null, foto2: null, foto3: null, foto4: null };
const CAMPOS_BLOQUEADOS = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'placa', 'facsimil', 'estatus', 'dependencia'];
var duplicadosEncontrados = { placa: false, facsimil: false, s_carroceria: false, s_motor: false };
var debounceTimers = {};

// ================= FUNCIONES DE UTILIDAD =================
function mostrarAlerta(mensaje, tipo) {
    var alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';

    // ✅ Auto-scroll garantizado
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

function mostrarAlertaDuplicado(campo, mensaje, existe) {
    var input = document.getElementById(campo);
    if (!input) return;
    var formGroup = input.closest('.form-group');
    if (!formGroup) return;
    var alertaExistente = formGroup.querySelector('.duplicate-alert');
    if (alertaExistente) alertaExistente.remove();
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
        if (duplicadosEncontrados[key] === true) { hayDuplicados = true; break; }
    }
    if (hayDuplicados) {
        btnGuardar.disabled = true;
        btnGuardar.style.opacity = '0.6';
        btnGuardar.innerHTML = '⛔ Hay Duplicados';
    } else {
        btnGuardar.disabled = false;
        btnGuardar.style.opacity = '1';
        btnGuardar.innerHTML = '💾 Guardar Ficha';
    }
}

function limpiarTexto(texto) {
    if (!texto) return '';
    return texto.toString().trim().toUpperCase();
}

// ================= INICIALIZAR SUPABASE =================
function inicializarSupabase() {
    if (typeof window.supabase === 'undefined') { console.error('❌ Librería Supabase no cargada'); return false; }
    var url = window.SUPABASE_URL;
    var key = window.SUPABASE_KEY;
    if (!url || !key) { console.error('❌ Configuración de Supabase no encontrada'); return false; }
    try {
        supabaseClient = window.supabase.createClient(url, key);
        return true;
    } catch (error) { console.error('❌ Error al inicializar Supabase:', error); return false; }
}

// ================= VERIFICAR DUPLICADO EN TIEMPO REAL =================
async function verificarDuplicadoEnTiempoReal(campo, valor, nombreCampo) {
    if (!valor || valor.trim() === '') return mostrarAlertaDuplicado(campo, '', false);
    valor = limpiarTexto(valor);
    try {
        var result = await supabaseClient.from('fichas_tecnicas').select('id').eq(campo, valor).limit(1);
        if (result.error) throw result.error;
        mostrarAlertaDuplicado(campo, '¡' + nombreCampo + ' YA REGISTRADO!', result.data.length > 0);
    } catch (error) { console.error('Error verificando duplicado:', error); }
}

// ================= ACTUALIZAR VISTA PREVIA =================
function actualizarVistaPrevia() {
    var campos = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'color', 'placa', 'facsimil', 'serialMotor', 'dependencia', 'estatus', 'causa', 'mecanica', 'diagnostico', 'ubicacion', 'tapiceria', 'cauchos', 'luces', 'observaciones'];
    campos.forEach(function(campo) {
        var input = document.getElementById(campo);
        var previewId = 'preview' + campo.charAt(0).toUpperCase() + campo.slice(1);
        var preview = document.getElementById(previewId);
        if (preview && input) preview.textContent = input.value || 'N/A';
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
        if (!file.type.startsWith('image/')) return mostrarAlerta('⚠️ Seleccione una imagen válida', 'error');
        if (file.size > 5 * 1024 * 1024) return mostrarAlerta('⚠️ Máximo 5MB por imagen', 'error');
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = document.getElementById(previewId);
            var container = document.getElementById(previewId + 'Container');
            var placeholder = container ? container.querySelector('.placeholder') : null;
            if (img) { img.src = e.target.result; img.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
            var fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            actualizarFotosPreview();
        };
        reader.readAsDataURL(file);
    }
}

// ================= BUSCAR VEHÍCULO (CON BLOQUEO ANTE DUPLICADOS) =================
async function buscarVehiculo() {
    var searchInput = document.getElementById('searchInput');
    if (!searchInput) return mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
    
    var searchTerm = limpiarTexto(searchInput.value);
    if (!searchTerm) return mostrarAlerta('⚠️ Ingrese un término de búsqueda', 'error');

    mostrarAlerta('⏳ Verificando si ya existe ficha...', 'info');
    try {
        // ✅ PASO 1: VERIFICAR PRIMERO en fichas_tecnicas
        // Si encuentra coincidencia en placa, facsimil, chasis o motor, BLOQUEA inmediatamente.
        var checkFicha = await supabaseClient
            .from('fichas_tecnicas')
            .select('id')
            .or('placa.eq."' + searchTerm + '",facsimil.eq."' + searchTerm + '",s_carroceria.eq."' + searchTerm + '",s_motor.eq."' + searchTerm + '"')
            .limit(1);

        if (checkFicha.error) throw checkFicha.error;
        if (checkFicha.data && checkFicha.data.length > 0) {
            return mostrarAlerta('⛔ ¡YA TIENE FICHA REGISTRADA! No se permite volver a buscar este vehículo.', 'error');
        }

        // ✅ PASO 2: Si NO tiene ficha, buscar en la base de datos de vehículos
        mostrarAlerta('⏳ Buscando vehículo en inventario...', 'info');
        var result = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or('placa.eq."' + searchTerm + '",facsimil.eq."' + searchTerm + '",s_carroceria.eq."' + searchTerm + '",s_motor.eq."' + searchTerm + '",n_identificacion.eq."' + searchTerm + '"')
            .limit(1);
            
        if (result.error) throw result.error;
        if (!result.data || result.data.length === 0) return mostrarAlerta('❌ No se encontró vehículo con: ' + searchTerm, 'error');
        
        var vehiculo = result.data[0];
        
        // ✅ PASO 3: Doble verificación cruzada (por si buscó por N° Identificación pero su placa ya tiene ficha)
        var ids = [limpiarTexto(vehiculo.placa), limpiarTexto(vehiculo.facsimil), limpiarTexto(vehiculo.s_carroceria), limpiarTexto(vehiculo.s_motor)].filter(Boolean);
        if (ids.length > 0) {
            var doubleCheck = await supabaseClient.from('fichas_tecnicas').select('id').or(ids.map(id => 'placa.eq."' + id + '"').join(',')).limit(1);
            if (doubleCheck.data.length > 0) return mostrarAlerta('⚠️ Este vehículo ya tiene ficha registrada por otro identificador.', 'error');
        }
        
        llenarFormulario(vehiculo);
        mostrarAlerta('✅ Vehículo cargado. Complete la información técnica.', 'success');
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    }
}
function llenarFormulario(vehiculo) {
    var map = { 
        'marca': 'marca', 'modelo': 'modelo', 'tipo': 'tipo', 'clase': 'clase', 
        'color': 'color', 's_carroceria': 'serialCarroceria', 's_motor': 'serialMotor', 
        'placa': 'placa', 'facsimil': 'facsimil', 'unidad_administrativa': 'dependencia', 
        'observacion': 'observaciones' 
    };

    // Asignar valores a los campos
    Object.keys(map).forEach(function(dbKey) {
        var el = document.getElementById(map[dbKey]);
        if (el && vehiculo[dbKey]) {
            el.value = limpiarTexto(vehiculo[dbKey]); // Limpia espacios y pasa a mayúsculas
        }
    });

    // ✅ Lógica especial para ESTATUS (maneja DESINCORPORADA -> DESINCORPORADO)
    var est = document.getElementById('estatus');
    if (est) {
        var val = (vehiculo.estatus || vehiculo.situacion || '').toString().trim().toUpperCase()
            .replace(/OPERATIVA$/, 'OPERATIVO')
            .replace(/INOPERATIVA$/, 'INOPERATIVO')
            .replace(/DESINCORPORADA$/, 'DESINCORPORADO');
            
        // Si el valor normalizado existe en el select, lo selecciona. Si no, lo asigna directo.
        var opt = Array.from(est.options).find(o => o.value === val);
        est.value = opt ? opt.value : val;
    }
    
    actualizarVistaPrevia();
}
// ================= BLOQUEAR / DESBLOQUEAR =================
function bloquearCampos() {
    CAMPOS_BLOQUEADOS.forEach(c => {
        var el = document.getElementById(c);
        if (el) { el.disabled = true; el.closest('.form-group').classList.add('locked'); }
    });
}
function desbloquearCampos() {
    CAMPOS_BLOQUEADOS.forEach(c => {
        var el = document.getElementById(c);
        if (el) { el.disabled = false; el.closest('.form-group').classList.remove('locked'); }
    });
}

// ================= LIMPIAR BÚSQUEDA =================
function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    document.getElementById('fichaForm').reset();
    desbloquearCampos();
    actualizarVistaPrevia();
    document.querySelectorAll('.duplicate-alert').forEach(e => e.remove());
    duplicadosEncontrados = { placa: false, facsimil: false, s_carroceria: false, s_motor: false };
    actualizarEstadoBotonGuardar();
    for (var j = 1; j <= 4; j++) {
        var img = document.getElementById('previewFoto' + j);
        if (img) { img.src = ''; img.style.display = 'none'; img.parentElement.querySelector('.placeholder').style.display = 'flex'; }
        var imgPrev = document.getElementById('previewImg' + j);
        if (imgPrev) { imgPrev.src = ''; imgPrev.style.display = 'none'; imgPrev.parentElement.querySelector('span').style.display = 'block'; }
        document.getElementById('foto' + j).value = '';
        fotosData['foto' + j] = null;
    }
    actualizarFotosPreview();
    mostrarAlerta('🔄 Formulario limpiado', 'info');
}

// ================= GUARDAR FICHA =================
async function guardarFicha() {
    // ✅ 1. Validar que se haya buscado un vehículo primero
    if (!document.getElementById('marca').value?.trim()) {
        return mostrarAlerta('⚠️ Debe buscar y cargar un vehículo antes de guardar', 'error');
    }

    // ✅ 2. Validar CAMPOS TÉCNICOS EDITABLES (Obligatorios)
    var camposTecnicos = [
        { id: 'causa', label: 'Causa' },
        { id: 'mecanica', label: 'Mecánica' },
        { id: 'diagnostico', label: 'Diagnóstico' },
        { id: 'ubicacion', label: 'Ubicación' }
    ];
    var faltantes = camposTecnicos.filter(c => !document.getElementById(c.id)?.value?.trim());
    if (faltantes.length > 0) {
        return mostrarAlerta('⚠️ Complete la Información Técnico Mecánica: ' + faltantes.map(c => c.label).join(', '), 'error');
    }

    // ✅ 3. Validar mínimo 2 fotos
    var fotosCargadas = [fotosData.foto1, fotosData.foto2, fotosData.foto3, fotosData.foto4].filter(f => f !== null).length;
    if (fotosCargadas < 2) {
        return mostrarAlerta('📸 Debe cargar al menos 2 fotos del vehículo', 'error');
    }

    // ✅ 4. Verificar duplicados finales antes de insertar
    var placa = limpiarTexto(document.getElementById('placa').value);
    var facsimil = limpiarTexto(document.getElementById('facsimil').value);
    var s_carroceria = limpiarTexto(document.getElementById('serialCarroceria').value);
    var s_motor = limpiarTexto(document.getElementById('serialMotor').value);

    var verif = await verificarDuplicadosAntesDeGuardar(placa, facsimil, s_carroceria, s_motor);
    if (verif.existe) return mostrarAlerta('❌ YA EXISTE FICHA CON: ' + verif.duplicados.join(', '), 'error');

    mostrarAlerta('⏳ Guardando ficha...', 'info');
    try {
        var data = {
            vehiculo_id: null, placa, facsimil, s_carroceria, s_motor,
            marca: document.getElementById('marca').value.toUpperCase(),
            modelo: document.getElementById('modelo').value.toUpperCase(),
            tipo: document.getElementById('tipo').value,
            clase: document.getElementById('clase').value.toUpperCase(),
            color: document.getElementById('color').value.toUpperCase(),
            estatus_ficha: document.getElementById('estatus').value,
            dependencia: document.getElementById('dependencia').value.toUpperCase(),
            causa: document.getElementById('causa').value || '',
            mecanica: document.getElementById('mecanica').value || '',
            diagnostico: document.getElementById('diagnostico').value || '',
            ubicacion: document.getElementById('ubicacion').value || '',
            tapiceria: document.getElementById('tapiceria').value || '',
            cauchos: document.getElementById('cauchos').value || '',
            luces: document.getElementById('luces').value || '',
            observaciones: document.getElementById('observaciones').value || '',
            creado_por: document.getElementById('userEmail')?.textContent || 'anonimo',
            fecha_creacion: new Date().toISOString()
        };

        for (let i = 1; i <= 4; i++) {
            var inp = document.getElementById('foto' + i);
            if (inp && inp.files[0]) {
                var fileName = 'ficha_' + Date.now() + '_f' + i + '_' + (placa || 'sin') + '.jpg';
                var up = await supabaseClient.storage.from('fichas-tecnicas').upload(fileName, inp.files[0], { cacheControl: '3600' });
                if (up.data?.path) data['foto' + i + '_url'] = supabaseClient.storage.from('fichas-tecnicas').getPublicUrl(fileName).data.publicUrl;
            }
        }

        var res = await supabaseClient.from('fichas_tecnicas').insert(data).select();
        if (res.error) throw res.error;

        mostrarAlerta('✅ ¡FICHA GUARDADA EXITOSAMENTE!', 'success');
        setTimeout(limpiarBusqueda, 2000);
    } catch (e) {
        console.error('❌ Error al guardar:', e);
        mostrarAlerta('❌ Error al guardar: ' + e.message, 'error');
    }
}
async function verificarDuplicadosAntesDeGuardar(placa, facsimil, s_carroceria, s_motor) {
    var conds = [];
    if (placa) conds.push('placa.eq."' + placa + '"');
    if (facsimil) conds.push('facsimil.eq."' + facsimil + '"');
    if (s_carroceria) conds.push('s_carroceria.eq."' + s_carroceria + '"');
    if (s_motor) conds.push('s_motor.eq."' + s_motor + '"');
    if (conds.length === 0) return { existe: false, duplicados: [] };
    
    try {
        var res = await supabaseClient.from('fichas_tecnicas').select('id, placa, facsimil, s_carroceria, s_motor').or(conds.join(','));
        var dups = [];
        if (res.data.length) {
            res.data.forEach(f => {
                if (placa && limpiarTexto(f.placa) === placa) dups.push('Placa');
                if (facsimil && limpiarTexto(f.facsimil) === facsimil) dups.push('Facsimil');
                if (s_carroceria && limpiarTexto(f.s_carroceria) === s_carroceria) dups.push('Chasis');
                if (s_motor && limpiarTexto(f.s_motor) === s_motor) dups.push('Motor');
            });
            return { existe: true, duplicados: dups };
        }
        return { existe: false, duplicados: [] };
    } catch (e) { return { existe: false, duplicados: [] }; }
}

// ================= CARGAR USUARIO =================
async function cargarUsuario() {
    try {
        var res = await supabaseClient.auth.getSession();
        var email = res.data?.session?.user?.email;
        document.getElementById('userEmail').textContent = email || 'Invitado';
    } catch (e) {}
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', function() {
    if (!inicializarSupabase()) return;
    bloquearCampos();
    actualizarVistaPrevia();
    actualizarFotosPreview();

    document.getElementById('btnBuscar')?.addEventListener('click', buscarVehiculo);
    document.getElementById('btnGuardar')?.addEventListener('click', guardarFicha);
    document.getElementById('btnLimpiar')?.addEventListener('click', limpiarBusqueda);
    document.getElementById('searchInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') buscarVehiculo(); });
    document.getElementById('logoutBtn')?.addEventListener('click', () => { if (confirm('¿Cerrar sesión?')) window.location.href = '../index.html'; });

    ['placa', 'facsimil', 'serialCarroceria', 'serialMotor'].forEach(id => {
        var inp = document.getElementById(id);
        if (inp) {
            inp.addEventListener('input', function() {
                clearTimeout(debounceTimers[id]);
                debounceTimers[id] = setTimeout(() => {
                    verificarDuplicadoEnTiempoReal(id.replace('serialCarroceria', 's_carroceria').replace('serialMotor', 's_motor').replace('facsimil', 'facsimil').replace('placa', 'placa'), inp.value, id.replace('serialCarroceria', 'Chasis').replace('serialMotor', 'Motor').replace('facsimil', 'Facsimil').replace('placa', 'Placa'));
                }, 800);
            });
        }
    });
    
    document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea').forEach(el => el.addEventListener('input', actualizarVistaPrevia));
    cargarUsuario();
});
