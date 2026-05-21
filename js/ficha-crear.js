/**
 * FICHA TÉCNICA - VERSIÓN ESTABLE
 * ✅ Datos del vehículo bloqueados permanentemente
 * ✅ Resto del formulario editable
 * ✅ Dropdowns Tapicería, Luces, Cauchos
 * ✅ Fotos visibles en formulario y vista previa
 */

let supabaseClient = null;
const fotosData = { foto1: null, foto2: null, foto3: null, foto4: null };
// Campos que siempre están bloqueados
const CAMPOS_VEHICULO = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'placa', 'facsimil', 'estatus', 'dependencia'];
var duplicadosEncontrados = { placa: false, facsimil: false, s_carroceria: false, s_motor: false };

// ================= UTILIDADES =================
function mostrarAlerta(mensaje, tipo) {
    var alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    setTimeout(() => alertDiv.style.display = 'none', 6000);
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
    } catch (e) { console.error('❌ Error init:', e); return false; }
}

// ================= VERIFICAR DUPLICADOS =================
async function verificarDuplicadosAntesDeGuardar(placa, facsimil, s_carroceria, s_motor) {
    var conds = [];
    if (placa) conds.push('placa.eq."' + placa + '"');
    if (facsimil) conds.push('facsimil.eq."' + facsimil + '"');
    if (s_carroceria) conds.push('s_carroceria.eq."' + s_carroceria + '"');
    if (s_motor) conds.push('s_motor.eq."' + s_motor + '"');
    if (conds.length === 0) return { existe: false, duplicados: [] };

    try {
        var res = await supabaseClient.from('fichas_tecnicas').select('id').or(conds.join(','));
        return { existe: res.data.length > 0 };
    } catch (err) { return { existe: false }; }
}

// ================= BÚSQUEDA =================
async function buscarVehiculo() {
    var input = document.getElementById('searchInput');
    if (!input) return;
    var term = normalizarSerial(input.value);
    if (!term) return mostrarAlerta('⚠️ Ingrese un término', 'error');

    mostrarAlerta('⏳ Buscando...', 'info');
    try {
        // Búsqueda exacta
        var res = await supabaseClient.from('vehiculos').select('*').or('placa.eq."' + term + '",facsimil.eq."' + term + '",s_carroceria.eq."' + term + '",s_motor.eq."' + term + '"').limit(1);
        if (res.error) throw res.error;
        if (!res.data.length) return mostrarAlerta('❌ No encontrado: ' + term, 'error');

        var v = res.data[0];
        // Verificar si ya tiene ficha
        var ids = [normalizarSerial(v.placa), normalizarSerial(v.facsimil), normalizarSerial(v.s_carroceria), normalizarSerial(v.s_motor)].filter(Boolean);
        if (ids.length) {
            var fRes = await supabaseClient.from('fichas_tecnicas').select('id').or(ids.map(i => 'placa.eq."' + i + '"').join(','));
            if (fRes.data.length) return mostrarAlerta('⚠️ Vehículo ya tiene ficha', 'error');
        }

        // ✅ LLENAR DATOS (PERMANECEN BLOQUEADOS POR HTML)
        llenarFormulario(v);
        mostrarAlerta('✅ Vehículo cargado. Complete la info técnica.', 'success');
    } catch (err) { mostrarAlerta('❌ Error: ' + err.message, 'error'); }
}

function llenarFormulario(v) {
    var map = {'marca':'marca','modelo':'modelo','tipo':'tipo','clase':'clase','color':'color','s_carroceria':'serialCarroceria','s_motor':'serialMotor','placa':'placa','facsimil':'facsimil','unidad_administrativa':'dependencia','observacion':'observaciones'};
    Object.entries(map).forEach(([k, id]) => {
        var el = document.getElementById(id);
        if (el && v[k]) el.value = v[k];
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
    // 1. Verificar que se buscó un vehículo (validación manual por estar disabled)
    var marca = document.getElementById('marca').value;
    if (!marca) return mostrarAlerta('⚠️ Debe buscar un vehículo primero', 'error');

    var placa = normalizarSerial(document.getElementById('placa').value);
    var facsimil = normalizarSerial(document.getElementById('facsimil').value);
    var s_carroceria = normalizarSerial(document.getElementById('serialCarroceria').value);
    var s_motor = normalizarSerial(document.getElementById('serialMotor').value);

    // 2. Verificar duplicados en ficha
    var verif = await verificarDuplicadosAntesDeGuardar(placa, facsimil, s_carroceria, s_motor);
    if (verif.existe) return mostrarAlerta('❌ YA EXISTE FICHA', 'error');

    mostrarAlerta('⏳ Guardando...', 'info');
    try {
        var data = {
            vehiculo_id: null, placa, facsimil, s_carroceria, s_motor,
            marca: marca.toUpperCase(),
            modelo: (document.getElementById('modelo').value || '').toUpperCase(),
            tipo: document.getElementById('tipo').value,
            clase: (document.getElementById('clase').value || '').toUpperCase(),
            color: (document.getElementById('color').value || '').toUpperCase(),
            estatus_ficha: document.getElementById('estatus').value,
            dependencia: (document.getElementById('dependencia').value || '').toUpperCase(),
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
            if(inp && inp.files[0]) {
                var fileName = 'ficha_'+Date.now()+'_f'+i+'_'+(placa||'sin') + '.jpg';
                var up = await supabaseClient.storage.from('fichas-tecnicas').upload(fileName, inp.files[0], {cacheControl:'3600'});
                if(up.data?.path) data['foto'+i+'_url'] = supabaseClient.storage.from('fichas-tecnicas').getPublicUrl(fileName).data.publicUrl;
            }
        }

        var res = await supabaseClient.from('fichas_tecnicas').insert(data).select();
        if(res.error) throw res.error;
        
        mostrarAlerta('✅ ¡GUARDADA!', 'success');
        setTimeout(limpiarBusqueda, 2000);
    } catch(e) { mostrarAlerta('❌ Error: '+e.message, 'error'); }
}

// ================= FOTOS Y PREVIEW =================
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            // 1. Mostrar en el formulario (input box)
            var localImg = document.getElementById(previewId); // ej: previewFoto1
            if (localImg) {
                localImg.src = e.target.result;
                localImg.style.display = 'block';
                var placeholder = localImg.parentElement.querySelector('.placeholder');
                if (placeholder) placeholder.style.display = 'none';
            }
            
            // 2. Mostrar en la vista previa (tabla ficha)
            var num = previewId.replace('previewFoto', '');
            var fichaImg = document.getElementById('previewImg' + num); // ej: previewImg1
            if (fichaImg) {
                fichaImg.src = e.target.result;
                fichaImg.style.display = 'block';
                var span = fichaImg.parentElement.querySelector('span');
                if (span) span.style.display = 'none';
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function actualizarVistaPrevia() {
    ['marca','modelo','tipo','clase','serialCarroceria','color','placa','facsimil','serialMotor','dependencia','estatus','causa','mecanica','diagnostico','ubicacion','tapiceria','cauchos','luces','observaciones'].forEach(c => {
        var prev = document.getElementById('preview' + c.charAt(0).toUpperCase() + c.slice(1));
        var el = document.getElementById(c);
        if(prev && el) prev.textContent = el.value || 'N/A';
    });
}

function limpiarBusqueda() {
    document.getElementById('fichaForm').reset();
    actualizarVistaPrevia();
    
    // Limpiar fotos
    for(let j=1; j<=4; j++) {
        var img = document.getElementById('previewFoto' + j);
        var fichaImg = document.getElementById('previewImg' + j);
        if(img) { img.src = ''; img.style.display = 'none'; img.parentElement.querySelector('.placeholder').style.display = 'flex'; }
        if(fichaImg) { fichaImg.src = ''; fichaImg.style.display = 'none'; fichaImg.parentElement.querySelector('span').style.display = 'block'; }
        document.getElementById('foto' + j).value = '';
    }
    mostrarAlerta('🔄 Limpiado', 'info');
}

async function cargarUsuario() {
    try {
        if(supabaseClient) {
            var { data: { session } } = await supabaseClient.auth.getSession();
            document.getElementById('userEmail').textContent = session?.user?.email || 'Invitado';
        }
    } catch(e) {}
}

// ================= INIT =================
document.addEventListener('DOMContentLoaded', function() {
    inicializarSupabase();
    
    // Event Listeners seguros
    document.getElementById('btnBuscar')?.addEventListener('click', buscarVehiculo);
    document.getElementById('btnLimpiar')?.addEventListener('click', limpiarBusqueda);
    document.getElementById('btnGuardar')?.addEventListener('click', guardarFicha);
    document.getElementById('searchInput')?.addEventListener('keypress', e => { if(e.key==='Enter') buscarVehiculo(); });
    document.getElementById('logoutBtn')?.addEventListener('click', async () => { 
        if(supabaseClient) await supabaseClient.auth.signOut(); 
        window.location.href = '../index.html'; 
    });

    // Actualizar preview en tiempo real
    var inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(i => i.addEventListener('input', actualizarVistaPrevia));
    
    cargarUsuario();
});
