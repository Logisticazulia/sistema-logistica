/**
 * FICHA TÉCNICA DE VEHÍCULOS - VERSIÓN ESTABLE & EXACTA
 * ✅ Búsqueda exacta normalizada
 * ✅ Validación predictiva segura
 * ✅ Dropdowns para Tapicería, Cauchos y Luces
 * ✅ Sin ReferenceError por alcance global
 */

// ================= CONFIGURACIÓN & ESTADO =================
let supabaseClient = null;
const fotosData = { foto1: null, foto2: null, foto3: null, foto4: null };
const CAMPOS_BLOQUEADOS = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'placa', 'facsimil', 'estatus', 'dependencia'];
var duplicadosEncontrados = { placa: false, facsimil: false, s_carroceria: false, s_motor: false };
var debounceTimers = {};

// ================= UTILIDADES GLOBALES =================
window.mostrarAlerta = function(mensaje, tipo) {
    var alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => alertDiv.style.display = 'none', 5000);
};

window.mostrarAlertaDuplicado = function(campo, mensaje, existe) {
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
};

function actualizarEstadoBotonGuardar() {
    var btn = document.getElementById('btnGuardar');
    if (!btn) return;
    var hay = Object.values(duplicadosEncontrados).includes(true);
    btn.disabled = hay;
    btn.innerHTML = hay ? '⛔ Hay Duplicados - Bloqueado' : '💾 Guardar Ficha';
    btn.style.opacity = hay ? '0.6' : '1';
}

// ✅ Normalización estricta: quita espacios, guiones, puntos. Convierte a mayúsculas.
function normalizarSerial(texto) {
    if (!texto) return '';
    return texto.toString().toUpperCase().replace(/[\s\-.]+/g, '').trim();
}

// ================= SUPABASE =================
function inicializarSupabase() {
    if (typeof window.supabase === 'undefined') return console.error('❌ Librería Supabase no cargada');
    var url = window.SUPABASE_URL;
    var key = window.SUPABASE_KEY;
    if (!url || !key) return console.error('❌ Configuración de Supabase faltante');
    try {
        supabaseClient = window.supabase.createClient(url, key);
        return true;
    } catch (e) { return console.error('❌ Error init Supabase:', e), false; }
}

// ================= VERIFICACIÓN DUPLICADOS =================
async function verificarDuplicadoEnTiempoReal(campo, valor, nombreCampo) {
    if (!valor || valor.trim() === '') return mostrarAlertaDuplicado(campo, '', false);
    var norm = normalizarSerial(valor);
    try {
        var res = await supabaseClient.from('fichas_tecnicas').select('id').eq(campo, norm).limit(1);
        if (res.error) throw res.error;
        mostrarAlertaDuplicado(campo, '¡' + nombreCampo + ' YA REGISTRADO!', res.data.length > 0);
    } catch (err) { console.error('❌ Error verificación:', err); }
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
        if (res.error) throw res.error;
        var dups = [];
        if (res.data.length) {
            res.data.forEach(f => {
                if (placa && normalizarSerial(f.placa) === placa) dups.push('Placa: ' + f.placa);
                if (facsimil && normalizarSerial(f.facsimil) === facsimil) dups.push('Facsimil: ' + f.facsimil);
                if (s_carroceria && normalizarSerial(f.s_carroceria) === s_carroceria) dups.push('Chasis: ' + f.s_carroceria);
                if (s_motor && normalizarSerial(f.s_motor) === s_motor) dups.push('Motor: ' + f.s_motor);
            });
            return { existe: true, duplicados: dups };
        }
        return { existe: false, duplicados: [] };
    } catch (err) { return { existe: false, duplicados: [], error: err }; }
}

// ================= BÚSQUEDA VEHÍCULO =================
window.buscarVehiculo = async function() {
    var input = document.getElementById('searchInput');
    if (!input) return mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
    var term = normalizarSerial(input.value);
    if (!term) return mostrarAlerta('⚠️ Ingrese un término para buscar', 'error');
    
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    try {
        // ✅ BÚSQUEDA EXACTA CON COMILLAS DOBLES Y NORMALIZACIÓN
        var res = await supabaseClient.from('vehiculos').select('*').or('placa.eq."' + term + '",facsimil.eq."' + term + '",s_carroceria.eq."' + term + '",s_motor.eq."' + term + '"').limit(1);
        if (res.error) throw res.error;
        if (!res.data.length) return mostrarAlerta('❌ No se encontró vehículo con: ' + term, 'error');
        
        var v = res.data[0];
        // Verificar si ya tiene ficha
        var ids = [normalizarSerial(v.placa), normalizarSerial(v.facsimil), normalizarSerial(v.s_carroceria), normalizarSerial(v.s_motor)].filter(Boolean);
        if (ids.length) {
            var fRes = await supabaseClient.from('fichas_tecnicas').select('id').or(ids.map(i => 'placa.eq."' + i + '"').join(','));
            if (fRes.data.length) return mostrarAlerta('⚠️ Este vehículo ya tiene ficha registrada', 'error');
        }
        
        llenarFormulario(v);
        bloquearCamposPrincipales();
        mostrarAlerta('✅ Encontrado: ' + v.marca + ' ' + v.modelo + ' - Placa: ' + (v.placa || 'S/P'), 'success');
    } catch (err) { mostrarAlerta('❌ Error: ' + err.message, 'error'); }
};

function llenarFormulario(v) {
    var map = {'marca':'marca','modelo':'modelo','tipo':'tipo','clase':'clase','color':'color','s_carroceria':'serialCarroceria','s_motor':'serialMotor','placa':'placa','facsimil':'facsimil','unidad_administrativa':'dependencia','observacion':'observaciones'};
    Object.entries(map).forEach(([k, formId]) => {
        var el = document.getElementById(formId);
        if (el && v[k] !== null && v[k] !== undefined) el.value = v[k];
    });
    // Estatus especial
    var est = document.getElementById('estatus');
    if (est && (v.estatus || v.situacion)) {
        var norm = (v.estatus || v.situacion).toUpperCase().replace('OPERATIVA','OPERATIVO').replace('INOPERATIVA','INOPERATIVO').trim();
        var opt = Array.from(est.options).find(o => o.value === norm);
        est.value = opt ? opt.value : norm;
    }
    actualizarVistaPrevia();
}

// ================= GUARDAR FICHA =================
window.guardarFicha = async function() {
    var form = document.getElementById('fichaForm');
    if (form && !form.checkValidity()) return form.reportValidity(), mostrarAlerta('⚠️ Complete campos requeridos', 'error');
    
    var req = ['marca','modelo','tipo','clase','serialCarroceria','serialMotor','color','estatus','dependencia'];
    var faltan = req.filter(id => !document.getElementById(id)?.value.trim());
    if (faltan.length) return mostrarAlerta('⚠️ Faltan: ' + faltan.join(', '), 'error');
    
    // ✅ NORMALIZAR ANTES DE GUARDAR
    var placa = normalizarSerial(document.getElementById('placa').value);
    var facsimil = normalizarSerial(document.getElementById('facsimil').value);
    var s_carroceria = normalizarSerial(document.getElementById('serialCarroceria').value);
    var s_motor = normalizarSerial(document.getElementById('serialMotor').value);
    
    var verif = await verificarDuplicadosAntesDeGuardar(placa, facsimil, s_carroceria, s_motor);
    if (verif.existe) return mostrarAlerta('❌ YA EXISTE: ' + verif.duplicados.join(', '), 'error');
    
    mostrarAlerta('⏳ Guardando...', 'info');
    try {
        var data = {
            vehiculo_id: null, placa, facsimil, s_carroceria, s_motor,
            marca: document.getElementById('marca').value.toUpperCase(),
            modelo: document.getElementById('modelo').value.toUpperCase(),
            tipo: document.getElementById('tipo').value,
            clase: document.getElementById('clase').value.toUpperCase(),
            color: document.getElementById('color').value.toUpperCase(),
            estatus_ficha: document.getElementById('estatus').value.toUpperCase(),
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
        
        // Subir fotos
        for(let i=1; i<=4; i++) {
            var inp = document.getElementById('foto'+i);
            if(inp?.files[0]) {
                var fileName = 'ficha_'+Date.now()+'_f'+i+'_'+(placa||'sin').jpg';
                var up = await supabaseClient.storage.from('fichas-tecnicas').upload(fileName, inp.files[0], {cacheControl:'3600'});
                if(up.error) console.error('❌ Error foto', up.error);
                else data['foto'+i+'_url'] = supabaseClient.storage.from('fichas-tecnicas').getPublicUrl(fileName).data.publicUrl;
            }
        }
        
        var res = await supabaseClient.from('fichas_tecnicas').insert(data).select();
        if(res.error) throw res.error;
        
        mostrarAlerta('✅ ¡GUARDADA EXITOSAMENTE!', 'success');
        setTimeout(window.limpiarBusqueda, 2000);
    } catch(e) { mostrarAlerta('❌ Error: '+e.message, 'error'); }
};

// ================= LIMPIAR & VISTA PREVIA =================
window.limpiarBusqueda = function() {
    document.getElementById('fichaForm').reset();
    desbloquearCampos();
    actualizarVistaPrevia();
    document.querySelectorAll('.duplicate-alert').forEach(e => e.remove());
    duplicadosEncontrados = {placa:false,facsimil:false,s_carroceria:false,s_motor:false};
    actualizarEstadoBotonGuardar();
    mostrarAlerta('🔄 Formulario limpiado', 'info');
};

function bloquearCamposPrincipales() { CAMPOS_BLOQUEADOS.forEach(id => { var e=document.getElementById(id); if(e){e.disabled=true; e.style.backgroundColor='#f3f4f6';}}); }
function desbloquearCampos() { CAMPOS_BLOQUEADOS.forEach(id => { var e=document.getElementById(id); if(e){e.disabled=false; e.style.backgroundColor='white';}}); }

function actualizarVistaPrevia() {
    ['marca','modelo','tipo','clase','serialCarroceria','color','placa','facsimil','serialMotor','dependencia','estatus','causa','mecanica','diagnostico','ubicacion','tapiceria','cauchos','luces','observaciones'].forEach(c => {
        var el = document.getElementById(c);
        var prev = document.getElementById('preview' + c.charAt(0).toUpperCase() + c.slice(1));
        if(prev && el) prev.textContent = el.value || 'N/A';
    });
}

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

function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        var file = input.files[0];
        if (!file.type.startsWith('image/')) return mostrarAlerta('⚠️ Seleccione una imagen válida', 'error');
        if (file.size > 5 * 1024 * 1024) return mostrarAlerta('⚠️ Máximo 5MB por imagen', 'error');
        var reader = new FileReader();
        reader.onload = function(e) {
            var img = document.getElementById(previewId);
            if (img) img.src = e.target.result;
            var fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            actualizarFotosPreview();
        };
        reader.readAsDataURL(file);
    }
}

// ================= CARGAR USUARIO =================
async function cargarUsuario() {
    try {
        if (!supabaseClient) return;
        const { data: { session } } = await supabaseClient.auth.getSession();
        var el = document.getElementById('userEmail');
        if (el) el.textContent = session?.user?.email || 'Invitado';
    } catch(e) { console.warn('⚠️ Usuario:', e.message); }
}

// ================= INICIALIZACIÓN SEGURA =================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando ficha técnica...');
    inicializarSupabase();
    actualizarVistaPrevia();
    
    // ✅ VINCULAR BOTONES DE FORMA SEGURA (EVITA REFERENCEERROR)
    document.getElementById('btnBuscar')?.addEventListener('click', window.buscarVehiculo);
    document.getElementById('btnLimpiarBusqueda')?.addEventListener('click', window.limpiarBusqueda);
    document.getElementById('btnGuardar')?.addEventListener('click', window.guardarFicha);
    document.getElementById('btnVolver')?.addEventListener('click', () => window.location.href = 'ficha.html');
    document.getElementById('logoutBtn')?.addEventListener('click', async () => { if(confirm('¿Cerrar sesión?')) window.location.href = '../index.html'; });
    document.getElementById('searchInput')?.addEventListener('keypress', e => { if(e.key==='Enter'){ e.preventDefault(); window.buscarVehiculo(); }});
    
    // ✅ VALIDACIÓN PREDICTIVA
    var camposPred = [
        {id:'placa', nom:'Placa', campo:'placa'},
        {id:'facsimil', nom:'Facsimil', campo:'facsimil'},
        {id:'serialCarroceria', nom:'Chasis', campo:'s_carroceria'},
        {id:'serialMotor', nom:'Motor', campo:'s_motor'}
    ];
    camposPred.forEach(c => {
        var inp = document.getElementById(c.id);
        if(inp) {
            inp.addEventListener('input', e => {
                clearTimeout(debounceTimers[c.id]);
                debounceTimers[c.id] = setTimeout(() => verificarDuplicadoEnTiempoReal(c.campo, e.target.value, c.nom), 800);
            });
        }
    });
    
    // ✅ ACTUALIZAR VISTA PREVIA EN TIEMPO REAL (INCLUYE NUEVOS SELECTS)
    ['tapiceria','cauchos','luces','causa','mecanica','diagnostico','ubicacion','observaciones'].forEach(id => {
        var el = document.getElementById(id);
        if(el) el.addEventListener('change', actualizarVistaPrevia);
    });
    
    cargarUsuario();
    console.log('✅ Sistema listo. Búsqueda exacta activada.');
});
