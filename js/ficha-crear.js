/**
 * ============================================
 * FICHA TÉCNICA DE VEHÍCULOS - VERSIÓN FINAL
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
    'serialMotor', 'color', 'placa', 'facsimilar', 'estatus', 'dependencia'
];

// ================= FUNCIONES DE UTILIDAD =================

function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = `alert alert-${tipo}`;
    alertDiv.style.display = 'block';
    
    setTimeout(() => {
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
    
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_KEY;
    
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
    const campos = [
        'marca', 'modelo', 'tipo', 'clase', 'serialCarroceria',
        'color', 'placa', 'facsimilar', 'serialMotor', 'dependencia',
        'estatus', 'causa', 'mecanica', 'diagnostico', 'ubicacion',
        'tapiceria', 'cauchos', 'luces', 'observaciones'
    ];
    
    campos.forEach(campo => {
        const input = document.getElementById(campo);
        const previewId = 'preview' + campo.charAt(0).toUpperCase() + campo.slice(1);
        const preview = document.getElementById(previewId);
        if (preview && input) {
            preview.textContent = input.value || 'N/A';
        }
    });
}

// ================= ACTUALIZAR FOTOS PREVIEW =================

function actualizarFotosPreview() {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewImg' + i);
        const box = document.getElementById('previewBox' + i);
        const span = box?.querySelector('span');
        
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
        const file = input.files[0];
        
        if (!file.type.startsWith('image/')) {
            mostrarAlerta('⚠️ Por favor seleccione un archivo de imagen válido', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            mostrarAlerta('⚠️ La imagen no debe superar los 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const img = document.getElementById(previewId);
            const container = document.getElementById(previewId + 'Container');
            const placeholder = container?.querySelector('.placeholder');
            
            if (img) {
                img.src = e.target.result;
                img.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            
            const fotoNum = previewId.replace('previewFoto', 'foto');
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
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
        return;
    }
    
    const searchTerm = limpiarTexto(searchInput.value);
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando vehículo en Supabase:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    try {
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq.${searchTerm},facsimil.eq.${searchTerm},s_carroceria.eq.${searchTerm},s_motor.eq.${searchTerm}`)
            .limit(1);
        
        if (error) {
            console.error('❌ Error en Supabase:', error);
            mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
            return;
        }
        
        console.log('📊 Resultado:', data?.length || 0, 'vehículo(s) encontrado(s)');
        
        if (!data || data.length === 0) {
            mostrarAlerta(`❌ No se encontró ningún vehículo con: ${searchTerm}`, 'error');
            return;
        }
        
        const vehiculo = data[0];
        console.log('✅ Vehículo encontrado:', vehiculo.placa || vehiculo.id);
        
        llenarFormulario(vehiculo);
        bloquearCamposPrincipales();
        mostrarAlerta(`✅ Vehículo encontrado: ${vehiculo.marca} ${vehiculo.modelo} - Placa: ${vehiculo.placa}`, 'success');
        
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    }
}

// ================= LLENAR FORMULARIO =================

function llenarFormulario(vehiculo) {
    const mapeoCampos = {
        'marca': 'marca',
        'modelo': 'modelo',
        'tipo': 'tipo',
        'clase': 'clase',
        'color': 'color',
        's_carroceria': 'serialCarroceria',
        's_motor': 'serialMotor',
        'placa': 'placa',
        'facsimil': 'facsimilar',
        'unidad_administrativa': 'dependencia',
        'observacion': 'observaciones'
    };
    
    Object.entries(mapeoCampos).forEach(([dbField, formField]) => {
        const element = document.getElementById(formField);
        if (element && vehiculo[dbField]) {
            if (element.tagName === 'SELECT') {
                const matchingOption = Array.from(element.options).find(opt =>
                    opt.value.toUpperCase() === vehiculo[dbField].toUpperCase()
                );
                if (matchingOption) element.value = matchingOption.value;
            } else {
                element.value = vehiculo[dbField];
            }
        }
    });
    
    // Cargar Estatus
    const estatusInput = document.getElementById('estatus');
    if (estatusInput) {
        const valorEstatus = vehiculo.estatus || vehiculo.situacion || '';
        if (valorEstatus) {
            const valorNormalizado = valorEstatus.toUpperCase()
                .replace('OPERATIVA', 'OPERATIVO')
                .replace('INOPERATIVA', 'INOPERATIVO')
                .replace('DESINCORPORADA', 'DESINCORPORADO');
            
            const matchingOption = Array.from(estatusInput.options).find(opt =>
                opt.value.toUpperCase() === valorNormalizado
            );
            
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
    CAMPOS_BLOQUEADOS.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
            
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('locked');
            }
        }
    });
}

// ================= DESBLOQUEAR CAMPOS =================

function desbloquearCampos() {
    CAMPOS_BLOQUEADOS.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = false;
            element.style.backgroundColor = 'white';
            element.style.cursor = 'auto';
            
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.remove('locked');
            }
        }
    });
}

// ================= LIMPIAR BÚSQUEDA =================

function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    const form = document.getElementById('fichaForm');
    if (form) form.reset();
    
    desbloquearCampos();
    actualizarVistaPrevia();
    
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById('foto' + i);
        const img = document.getElementById('previewFoto' + i);
        const container = document.getElementById('previewFoto' + i + 'Container');
        const placeholder = container?.querySelector('.placeholder');
        
        if (input) input.value = '';
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        if (placeholder) placeholder.style.display = 'flex';
        fotosData['foto' + i] = null;
    }
    
    actualizarFotosPreview();
    mostrarAlerta('🔄 Formulario limpiado', 'info');
}

// ================= GUARDAR FICHA =================

function guardarFicha() {
    const form = document.getElementById('fichaForm');
    
    if (form && !form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }
    
    const camposObligatorios = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'estatus', 'dependencia'];
    let camposFaltantes = [];
    
    camposObligatorios.forEach(campo => {
        const input = document.getElementById(campo);
        if (input && !input.value.trim()) {
            camposFaltantes.push(campo);
        }
    });
    
    if (camposFaltantes.length > 0) {
        mostrarAlerta('⚠️ Los siguientes campos son obligatorios: ' + camposFaltantes.join(', '), 'error');
        return;
    }
    
    const fichaData = {
        id: Date.now(),
        marca: document.getElementById('marca')?.value || '',
        modelo: document.getElementById('modelo')?.value || '',
        tipo: document.getElementById('tipo')?.value || '',
        clase: document.getElementById('clase')?.value || '',
        serialCarroceria: document.getElementById('serialCarroceria')?.value || '',
        serialMotor: document.getElementById('serialMotor')?.value || '',
        color: document.getElementById('color')?.value || '',
        placa: document.getElementById('placa')?.value || '',
        facsimilar: document.getElementById('facsimilar')?.value || '',
        estatus: document.getElementById('estatus')?.value || '',
        dependencia: document.getElementById('dependencia')?.value || '',
        causa: document.getElementById('causa')?.value || '',
        mecanica: document.getElementById('mecanica')?.value || '',
        diagnostico: document.getElementById('diagnostico')?.value || '',
        ubicacion: document.getElementById('ubicacion')?.value || '',
        tapiceria: document.getElementById('tapiceria')?.value || '',
        cauchos: document.getElementById('cauchos')?.value || '',
        luces: document.getElementById('luces')?.value || '',
        observaciones: document.getElementById('observaciones')?.value || '',
        fotos: { ...fotosData },
        fechaCreacion: new Date().toISOString(),
        creadoPor: document.getElementById('userEmail')?.textContent || 'usuario@institucion.com'
    };
    
    try {
        let fichas = JSON.parse(localStorage.getItem('fichasTecnicas') || '[]');
        fichas.push(fichaData);
        localStorage.setItem('fichasTecnicas', JSON.stringify(fichas));
        
        mostrarAlerta('✅ Ficha técnica guardada exitosamente', 'success');
        limpiarBusqueda();
        
    } catch (error) {
        console.error('❌ Error al guardar ficha:', error);
        mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
    }
}

// ================= CARGAR USUARIO =================

async function cargarUsuario() {
    try {
        if (supabaseClient) {
            const { data } = await supabaseClient.auth.getSession();
            const session = data?.session;
            
            if (session?.user?.email) {
                const userEmail = document.getElementById('userEmail');
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando ficha técnica...');
    
    if (!inicializarSupabase()) {
        console.warn('⚠️ Supabase no disponible');
    }
    
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    const inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    inputs.forEach(input => {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
    const btnGuardar = document.getElementById('btnGuardar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (btnGuardar) btnGuardar.addEventListener('click', guardarFicha);
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarBusqueda);
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
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
