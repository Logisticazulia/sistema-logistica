/**
 * FICHA TÉCNICA - VERSIÓN ESTABLE
 * ✅ Formulario bloqueado por defecto con candado
 * ✅ Botón Volver funcional
 * ✅ Miniaturas visibles en formulario y vista previa
 */

let supabaseClient = null;
const fotosData = { foto1: null, foto2: null, foto3: null, foto4: null };
const CAMPOS_BLOQUEADOS = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'placa', 'facsimil', 'estatus', 'dependencia', 'causa', 'mecanica', 'diagnostico', 'ubicacion', 'tapiceria', 'cauchos', 'luces', 'observaciones'];
const INPUTS_FOTOS = ['foto1', 'foto2', 'foto3', 'foto4'];
var duplicadosEncontrados = { placa: false, facsimil: false, s_carroceria: false, s_motor: false };
var debounceTimers = {};

// ================= UTILIDADES =================
function mostrarAlerta(mensaje, tipo) {
    var alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    setTimeout(() => alertDiv.style.display = 'none', 6000);
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
        alerta.innerHTML = '⚠️ ' + mensaje;
        formGroup.appendChild(alerta);
        duplicadosEncontrados[campo] = true;
    } else {
        duplicadosEncontrados[campo] = false;
    }
    actualizarEstadoBotonGuardar();
}

function actualizarEstadoBotonGuardar() {
    var btn = document.getElementById('btnGuardar');
    if (!btn) return;
    var hay = Object.values(duplicadosEncontrados).includes(true);
    btn.disabled = hay;
    btn.innerHTML = hay ? '⛔ Hay Duplicados' : '💾 Guardar Ficha';
    btn.style.opacity = hay ? '0.6' : '1';
}

function normalizarSerial(texto) {
    if (!texto) return '';
    return texto.toString().toUpperCase().replace(/[\s\-.]+/g, '').trim();
}

// ================= SUPABASE =================
function inicializarSupabase() {
    if (typeof window.supabase === 'undefined') return console.error('❌ Librería Supabase no cargada');
    try {
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        return true;
    } catch (e) { console.error('❌ Error init Supabase:', e); return false; }
}

// ================= DUPLICADOS =================
async function verificarDuplicadoEnTiempoReal(campo, valor, nombreCampo) {
    if (!valor || valor.trim() === '') return mostrarAlertaDuplicado(campo, '', false);
    var norm = normalizarSerial(valor);
    try {
        var res = await supabaseClient.from('fichas_tecnicas').select('id').eq(campo, norm).limit(1);
        mostrarAlertaDuplicado(campo, '¡' + nombreCampo + ' YA REGISTRADO!', res.data.length > 0);
    } catch (err) { console.error(err); }
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
                if (placa && normalizarSerial(f.placa) === placa) dups.push('Placa: ' + f.placa);
                if (facsimil && normalizarSerial(f.facsimil) === facsimil) dups.push('Facsimil: ' + f.facsimil);
                if (s_carroceria && normalizarSerial(f.s_carroceria) === s_carroceria) dups.push('Chasis: ' + f.s_carroceria);
                if (s_motor && normalizarSerial(f.s_motor) === s_motor) dups.push('Motor: ' + f.s_motor);
            });
            return { existe: true, duplicados: dups };
        }
        return { existe: false, duplicados: [] };
    } catch (err) { return { existe: false, duplicados: [] }; }
}

// ================= BLOQUEO / DESBLOQUEO =================
function bloquearCampos() {
    CAMPOS_BLOQUEADOS.forEach(id => {
        var e = document.getElementById(id);
        if (e) { e.disabled = true; e.closest('.form-group').classList.add('locked'); }
    });
    INPUTS_FOTOS.forEach(id => {
        var e = document.getElementById(id);
        if (e) { e.disabled = true; }
    });
}

function desbloquearCampos() {
    CAMPOS_BLOQUEADOS.forEach(id => {
        var e = document.getElementById(id);
        if (e) { e.disabled = false; e.closest('.form-group').classList.remove('locked'); }
    });
    INPUTS_FOTOS.forEach(id => {
        var e = document.getElementById(id);
        if (e) e.disabled = false;
    });
}

// ================= BÚSQUEDA =================
async function buscarVehiculo() {
    var input = document.getElementById('searchInput');
    if (!input) return;
    var term = normalizarSerial(input.value);
    if (!term) return mostrarAlerta('⚠️ Ingrese un término', 'error');
    
    mostrarAlerta('⏳ Buscando...', 'info');
    try {
        var res = await supabaseClient.from('vehiculos').select('*').or('placa.eq."' + term + '",facsimil.eq."' + term + '",s_carroceria.eq."' + term + '",s_motor.eq."' + term + '"').limit(1);
        if (res.error) throw res.error;
        if (!res.data.length) return mostrarAlerta('❌ No encontrado: ' + term, 'error');
        
        var v = res.data[0];
        // Verificar ficha existente
        var ids = [normalizarSerial(v.placa), normalizarSerial(v.facsimil), normalizarSerial(v.s_carroceria), normalizarSerial(v.s_motor)].filter(Boolean);
        if (ids.length) {
            var fRes = await supabaseClient.from('fichas_tecnicas').select('id').or(ids.map(i => 'placa.eq."' + i + '"').join(','));
            if (fRes.data.length) return mostrarAlerta('⚠️ Vehículo ya tiene ficha', 'error');
        }
        
        // ✅ DESBLOQUEAR AL ENCONTRAR
        desbloquearCampos();
        llenarFormulario(v);
        mostrarAlerta('✅ Formulario desbloqueado', 'success');
    } catch (err) { mostrarAlerta('❌ Error: ' + err.message, 'error'); }
}

function llenarFormulario(v) {
    var map = {'marca':'marca','modelo':'modelo','tipo':'tipo','clase':'clase','color':'color','s_carroceria':'serialCarroceria','s_motor':'serialMotor','placa':'placa','facsimil':'facsimil','unidad_administrativa':'dependencia','observacion':'observaciones'};
    Object.entries(map).forEach(([k, id]) => {
        var el = document.getElementById(id);
        if (el && v[k] !== null && v[k] !== undefined) el.value = v[k];
    });
    var est = document.getElementById('estatus');
    if (est) {
        var val = (v.estatus || v.situacion || '').toUpperCase().replace('OPERATIVA','OPERATIVO').replace('INOPERATIVA','INOPERATIVO');
        var opt = Array.from(est.options).find(o => o.value === val);
        est.value = opt ? opt.value : val;
    }
    actualizarVistaPrevia();
}

// ================= GUARDAR =================
async function guardarFicha() {
    var form = document.getElementById('fichaForm');
    if (form && !form.checkValidity()) return form.reportValidity(), mostrarAlerta('⚠️ Complete campos requeridos', 'error');
    
    var req = ['marca','modelo','tipo','clase','serialCarroceria','serialMotor','color','estatus','dependencia'];
    var faltan = req.filter(id => !document.getElementById(id)?.value.trim());
    if (faltan.length) return mostrarAlerta('⚠️ Faltan: ' + faltan.join(', '), 'error');
    
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
        
        for(let i=1; i<=4; i++) {
            var inp = document.getElementById('foto'+i);
            if(inp && inp.files[0]) {
                var fileName = 'ficha_'+Date.now()+'_f'+i+'_'+(placa||'sin') + '.jpg';
                var up = await supabaseClient.storage.from('fichas-tecnicas').upload(fileName, inp.files[0], {cacheControl:'3600'});
                if(up.data?.path) data['foto'+i+'_url'] = supabaseClient.storage.from('fichas-tecnicas').getPublicUrl(fileName).data.publicUrl;
            }
        }
        
        var res = await supabaseClient.from('fichas_tecnicas').insert(data).select();
        if(res.error) throw res.error;
        
        mostrarAlerta('✅ ¡GUARDADA EXITOSAMENTE!', 'success');
        setTimeout(limpiarTodo, 2000);
    } catch(e) { mostrarAlerta('❌ Error: '+e.message, 'error'); }
}

// ================= FOTOS & VISTA PREVIA =================
function previewImage(input, previewId) {
    if (input.files?.[0]) {
        var reader = new FileReader();
        reader.onload = (e) => {
            var img = document.getElementById(previewId);
            var container = document.getElementById(previewId + 'Container');
            var placeholder = container?.querySelector('.placeholder');
            var btnRemove = container?.parentElement.querySelector('.btn-remove');
            if (img) { img.src = e.target.result; img.style.display = 'block'; }
            if (placeholder) placeholder.style.display = 'none';
            if (btnRemove) btnRemove.style.display = 'flex';
            
            var fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            actualizarFotosPreview();
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function removeFoto(num) {
    var input = document.getElementById('foto' + num);
    var img = document.getElementById('previewFoto' + num);
    var container = document.getElementById('previewFoto' + num + 'Container');
    var placeholder = container?.querySelector('.placeholder');
    var btnRemove = container?.parentElement.querySelector('.btn-remove');
    
    if (input) input.value = '';
    if (img) { img.src = ''; img.style.display = 'none'; }
    if (placeholder) placeholder.style.display = 'flex';
    if (btnRemove) btnRemove.style.display = 'none';
    
    fotosData['foto' + num] = null;
    actualizarFotosPreview();
}

function actualizarFotosPreview() {
    for (var i = 1; i <= 4; i++) {
        var img = document.getElementById('previewImg' + i);
        var span = document.getElementById('previewBox' + i)?.querySelector('span');
        if (fotosData['foto' + i]) { img.src = fotosData['foto' + i]; img.style.display = 'block'; if(span) span.style.display = 'none'; }
        else { img.style.display = 'none'; if(span) span.style.display = 'block'; }
    }
}

function actualizarVistaPrevia() {
    ['marca','modelo','tipo','clase','serialCarroceria','color','placa','facsimil','serialMotor','dependencia','estatus','causa','mecanica','diagnostico','ubicacion','tapiceria','cauchos','luces','observaciones'].forEach(c => {
        var prev = document.getElementById('preview' + c.charAt(0).toUpperCase() + c.slice(1));
        var el = document.getElementById(c);
        if(prev && el) prev.textContent = el.value || 'N/A';
    });
}

function limpiarTodo() {
    document.getElementById('fichaForm').reset();
    bloquearCampos();
    actualizarVistaPrevia();
    document.querySelectorAll('.duplicate-alert').forEach(e => e.remove());
    duplicadosEncontrados = {placa:false,facsimil:false,s_carroceria:false,s_motor:false};
    actualizarEstadoBotonGuardar();
    for(let j=1; j<=4; j++) removeFoto(j);
    mostrarAlerta('🔄 Limpiado', 'info');
}

// ================= CARGA USUARIO =================
async function cargarUsuario() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        document.getElementById('userEmail').textContent = session?.user?.email || 'Invitado';
    } catch(e) {}
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', () => {
    inicializarSupabase();
    bloquearCampos(); // ✅ BLOQUEADO POR DEFECTO
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    // ✅ EVENT LISTENERS SEGUROS
    document.getElementById('btnBuscar')?.addEventListener('click', buscarVehiculo);
    document.getElementById('btnLimpiarBusqueda')?.addEventListener('click', () => { document.getElementById('searchInput').value = ''; limpiarTodo(); });
    document.getElementById('btnGuardar')?.addEventListener('click', guardarFicha);
    document.getElementById('btnLimpiarForm')?.addEventListener('click', limpiarTodo);
    
    // ✅ BOTÓN VOLVER FUNCIONAL
    document.getElementById('btnVolver')?.addEventListener('click', () => window.location.href = 'ficha.html');
    document.getElementById('logoutBtn')?.addEventListener('click', () => { if(confirm('¿Cerrar sesión?')) window.location.href = '../index.html'; });
    document.getElementById('searchInput')?.addEventListener('keypress', e => { if(e.key==='Enter') buscarVehiculo(); });
    
    // Validación predictiva
    [{id:'placa', nom:'Placa', campo:'placa'},{id:'facsimil', nom:'Facsimil', campo:'facsimil'},{id:'serialCarroceria', nom:'Chasis', campo:'s_carroceria'},{id:'serialMotor', nom:'Motor', campo:'s_motor'}].forEach(c => {
        document.getElementById(c.id)?.addEventListener('input', e => {
            clearTimeout(debounceTimers[c.id]);
            debounceTimers[c.id] = setTimeout(() => verificarDuplicadoEnTiempoReal(c.campo, e.target.value, c.nom), 800);
        });
    });
    
    // Actualizar vista previa al cambiar campos
    ['tapiceria','cauchos','luces','causa','mecanica','diagnostico','ubicacion','observaciones'].forEach(id => document.getElementById(id)?.addEventListener('input', actualizarVistaPrevia));
    cargarUsuario();
});
