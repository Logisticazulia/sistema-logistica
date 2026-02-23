/**
 * ============================================
 * FICHA TÉCNICA DE VEHÍCULOS
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

// ================= FUNCIONES DE UTILIDAD =================
function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    
    // ✅ SCROLL AUTOMÁTICO HACIA LA ALERTA
    alertDiv.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
    });
    
    setTimeout(function() {
        alertDiv.style.display = 'none';
    }, 5000);
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
        console.log('SUPABASE_URL:', url);
        console.log('SUPABASE_KEY:', key ? '***' : 'undefined');
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
    
    console.log('🔍 Buscando vehículo en Supabase:', searchTerm);
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
        
        console.log('📊 Resultado:', data ? data.length : 0, 'vehículo(s) encontrado(s)');
        
        if (!data || data.length === 0) {
            mostrarAlerta('❌ No se encontró ningún vehículo con: ' + searchTerm, 'error');
            return;
        }
        
        var vehiculo = data[0];
        console.log('✅ Vehículo encontrado:', vehiculo.placa || vehiculo.id);
        
        llenarFormulario(vehiculo);
        bloquearCamposPrincipales();
        mostrarAlerta('✅ Vehículo encontrado: ' + vehiculo.marca + ' ' + vehiculo.modelo + ' - Placa: ' + vehiculo.placa, 'success');
        
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    }
}

// ================= LLENAR FORMULARIO =================
function llenarFormulario(vehiculo) {
    var mapeoCampos = {
        'marca': 'marca',
        'modelo': 'modelo',
        'tipo': 'tipo',
        'clase': 'clase',
        'color': 'color',
        's_carroceria': 'serialCarroceria',
        's_motor': 'serialMotor',
        'placa': 'placa',
        'facsimil': 'facsimil',
        'unidad_administrativa': 'dependencia',
        'observacion': 'observaciones'
    };
    
    Object.keys(mapeoCampos).forEach(function(dbField) {
        var formField = mapeoCampos[dbField];
        var element = document.getElementById(formField);
        
        if (element && vehiculo[dbField]) {
            if (element.tagName === 'SELECT') {
                var matchingOption = Array.from(element.options).find(function(opt) {
                    return opt.value.toUpperCase() === vehiculo[dbField].toUpperCase();
                });
                if (matchingOption) {
                    element.value = matchingOption.value;
                }
            } else {
                element.value = vehiculo[dbField];
            }
        }
    });
    
    var estatusInput = document.getElementById('estatus');
    if (estatusInput) {
        var valorEstatus = vehiculo.estatus || vehiculo.situacion || '';
        if (valorEstatus) {
            var valorNormalizado = valorEstatus.toUpperCase()
                .replace('OPERATIVA', 'OPERATIVO')
                .replace('INOPERATIVA', 'INOPERATIVO')
                .replace('DESINCORPORADA', 'DESINCORPORADO');
            
            var matchingOption = Array.from(estatusInput.options).find(function(opt) {
                return opt.value.toUpperCase() === valorNormalizado;
            });
            
            if (matchingOption) {
                estatusInput.value = matchingOption.value;
            } else {
                estatusInput.value = valorEstatus.toUpperCase();
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
    
    for (var i = 1; i <= 4; i++) {
        var input = document.getElementById('foto' + i);
        var img = document.getElementById('previewFoto' + i);
        var container = document.getElementById('previewFoto' + i + 'Container');
        var placeholder = container ? container.querySelector('.placeholder') : null;
        
        if (input) input.value = '';
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
        fotosData['foto' + i] = null;
    }
    
    actualizarFotosPreview();
    mostrarAlerta('🔄 Formulario limpiado', 'info');
}

// ================= GUARDAR FICHA (TU VERSIÓN ORIGINAL) =================
function guardarFicha() {
    var form = document.getElementById('fichaForm');
    
    if (form && !form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }
    
    var camposObligatorios = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'estatus', 'dependencia'];
    var camposFaltantes = [];
    
    camposObligatorios.forEach(function(campo) {
        var input = document.getElementById(campo);
        if (input && !input.value.trim()) {
            camposFaltantes.push(campo);
        }
    });
    
    if (camposFaltantes.length > 0) {
        mostrarAlerta('⚠️ Los siguientes campos son obligatorios: ' + camposFaltantes.join(', '), 'error');
        return;
    }
    
    var fichaData = {
        id: Date.now(),
        marca: document.getElementById('marca') ? document.getElementById('marca').value : '',
        modelo: document.getElementById('modelo') ? document.getElementById('modelo').value : '',
        tipo: document.getElementById('tipo') ? document.getElementById('tipo').value : '',
        clase: document.getElementById('clase') ? document.getElementById('clase').value : '',
        serialCarroceria: document.getElementById('serialCarroceria') ? document.getElementById('serialCarroceria').value : '',
        serialMotor: document.getElementById('serialMotor') ? document.getElementById('serialMotor').value : '',
        color: document.getElementById('color') ? document.getElementById('color').value : '',
        placa: document.getElementById('placa') ? document.getElementById('placa').value : '',
        facsimil: document.getElementById('facsimil') ? document.getElementById('facsimil').value : '',
        estatus: document.getElementById('estatus') ? document.getElementById('estatus').value : '',
        dependencia: document.getElementById('dependencia') ? document.getElementById('dependencia').value : '',
        causa: document.getElementById('causa') ? document.getElementById('causa').value : '',
        mecanica: document.getElementById('mecanica') ? document.getElementById('mecanica').value : '',
        diagnostico: document.getElementById('diagnostico') ? document.getElementById('diagnostico').value : '',
        ubicacion: document.getElementById('ubicacion') ? document.getElementById('ubicacion').value : '',
        tapiceria: document.getElementById('tapiceria') ? document.getElementById('tapiceria').value : '',
        cauchos: document.getElementById('cauchos') ? document.getElementById('cauchos').value : '',
        luces: document.getElementById('luces') ? document.getElementById('luces').value : '',
        observaciones: document.getElementById('observaciones') ? document.getElementById('observaciones').value : '',
        fotos: Object.assign({}, fotosData),
        fechaCreacion: new Date().toISOString(),
        creadoPor: document.getElementById('userEmail') ? document.getElementById('userEmail').textContent : 'usuario@institucion.com'
    };
    
    try {
        var fichas = JSON.parse(localStorage.getItem('fichasTecnicas') || '[]');
        fichas.push(fichaData);
        localStorage.setItem('fichasTecnicas', JSON.stringify(fichas));
        
        // ✅ MENSAJE DE ÉXITO CON SCROLL
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
    
    var inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    inputs.forEach(function(input) {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
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
    console.log('✅ Inicialización completada');
});
