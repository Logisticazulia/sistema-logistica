/**
 * ============================================
 * FICHA TÉCNICA DE VEHÍCULOS - LÓGICA COMPLETA
 * Versión corregida y optimizada
 * ============================================
 */

// ================= CONFIGURACIÓN =================
let supabaseClient = null;

// Función para inicializar Supabase
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

// ================= ESTADO =================
const fotosData = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

// Campos que se bloquean después de buscar
const CAMPOS_BLOQUEADOS = [
    'marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 
    'serialMotor', 'color', 'placa', 'facsimilar', 'estatus', 'dependencia'
];

// ================= FUNCIONES DE UTILIDAD =================

/**
 * Muestra alertas en la interfaz
 */
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

/**
 * Limpia y formatea texto
 */
function limpiarTexto(texto) {
    if (!texto) return '';
    return texto.toString().trim().toUpperCase();
}

// ================= BÚSQUEDA DESDE SUPABASE =================

/**
 * Busca un vehículo en la base de datos por placa, facsímil o seriales
 */
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
        // ✅ CONSULTA A SUPABASE - BUSCA EN LOS 4 CAMPOS
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`placa.eq.${searchTerm},placa.ilike.%${searchTerm}%,facsimil.ilike.%${searchTerm}%,s_carroceria.ilike.%${searchTerm}%,s_motor.ilike.%${searchTerm}%`)
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
        
        // ✅ VEHÍCULO ENCONTRADO
        const vehiculo = data[0];
        console.log('✅ Vehículo encontrado:', vehiculo.placa || vehiculo.id);
        
        // Llenar formulario con los datos encontrados
        llenarFormulario(vehiculo);
        
        // 🔒 BLOQUEAR CAMPOS PRINCIPALES
        bloquearCamposPrincipales();
        
        mostrarAlerta(`✅ Vehículo encontrado: ${vehiculo.marca} ${vehiculo.modelo} - Placa: ${vehiculo.placa}`, 'success');
        
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    }
}

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
    
    // Mapear campos básicos
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
    
    // ✅ NUEVO: Cargar Estatus específicamente (priorizar 'estatus' sobre 'situacion')
    const estatusInput = document.getElementById('estatus');
    if (estatusInput) {
        const valorEstatus = vehiculo.estatus || vehiculo.situacion || '';
        if (valorEstatus) {
            // Normalizar valor (OPERATIVA → OPERATIVO, INOPERATIVA → INOPERATIVO)
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
                // Si no hay match exacto, intentar con el valor original
                estatusInput.value = valorEstatus.toUpperCase();
            }
        }
    }
    
    actualizarVistaPrevia();
}
// ================= BLOQUEAR CAMPOS =================

/**
 * Bloquea los campos principales después de buscar
 */
function bloquearCamposPrincipales() {
    CAMPOS_BLOQUEADOS.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
            
            // Agregar clase para mostrar ícono de candado
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('locked');
            }
        }
    });
}

// ================= DESBLOQUEAR CAMPOS =================

/**
 * Desbloquea todos los campos al limpiar
 */
function desbloquearCampos() {
    CAMPOS_BLOQUEADOS.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = false;
            element.style.backgroundColor = 'white';
            element.style.cursor = 'auto';
            
            // Remover clase de candado
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.remove('locked');
            }
        }
    });
}

// ================= LIMPIAR BÚSQUEDA =================

/**
 * Limpia la búsqueda y el formulario
 */
function limpiarBusqueda() {
    // Limpiar input de búsqueda
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    // Ocultar alertas
    const searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    // Limpiar formulario
    const form = document.getElementById('fichaForm');
    if (form) form.reset();
    
    // 🔓 DESBLOQUEAR TODOS LOS CAMPOS
    desbloquearCampos();
    
    // Limpiar vista previa
    actualizarVistaPrevia();
    
    // Limpiar fotos
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

// ================= VISTA PREVIA DE FOTOS =================

/**
 * Previsualiza imagen seleccionada
 */
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            mostrarAlerta('⚠️ Por favor seleccione un archivo de imagen válido', 'error');
            return;
        }
        
        // Validar tamaño (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
            mostrarAlerta('⚠️ La imagen no debe superar los 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            // Actualizar vista previa en el formulario
            const img = document.getElementById(previewId);
            const container = document.getElementById(previewId + 'Container');
            const placeholder = container?.querySelector('.placeholder');
            
            if (img) {
                img.src = e.target.result;
                img.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            
            // Guardar en base64
            const fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            
            // Actualizar vista previa en la ficha
            actualizarFotosPreview();
        };
        
        reader.onerror = function() {
            mostrarAlerta('❌ Error al leer la imagen', 'error');
        };
        
        reader.readAsDataURL(file);
    }
}

/**
 * Actualiza las fotos en la vista previa de la ficha
 */
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

// ================= ACTUALIZAR VISTA PREVIA =================

/**
 * Actualiza en tiempo real la vista previa con los valores del formulario
 */
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

// ================= GUARDAR FICHA =================

/**
 * Guarda la ficha técnica en localStorage
 */
function guardarFicha() {
    const form = document.getElementById('fichaForm');
    
    // Validación básica del formulario
    if (form && !form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }
    
    // Validar campos obligatorios específicos
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
    
    // Recopilar datos del formulario
    const fichaData = {
        id: Date.now(), // ID único temporal
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
    
    // Guardar en localStorage
    try {
        let fichas = JSON.parse(localStorage.getItem('fichasTecnicas') || '[]');
        fichas.push(fichaData);
        localStorage.setItem('fichasTecnicas', JSON.stringify(fichas));
        
        mostrarAlerta('✅ Ficha técnica guardada exitosamente', 'success');
        
        // 🔹 LIMPIAR FORMULARIO DESPUÉS DE GUARDAR
        limpiarBusqueda();
        
    } catch (error) {
        console.error('❌ Error al guardar ficha:', error);
        mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
    }
}

// ================= CARGAR USUARIO =================

/**
 * Carga y muestra la información del usuario autenticado
 */
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

/**
 * Cierra la sesión del usuario
 */
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
    
    // 1. Inicializar Supabase primero
    if (!inicializarSupabase()) {
        console.warn('⚠️ Supabase no disponible');
    }
    
    // 2. Inicializar vista previa
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    // 3. Event listeners para inputs (vista previa en tiempo real)
    const inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    inputs.forEach(input => {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
    // 4. Configurar botones principales
    const btnGuardar = document.getElementById('btnGuardar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (btnGuardar) btnGuardar.addEventListener('click', guardarFicha);
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarBusqueda);
    
    // 5. Permitir buscar con Enter
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarVehiculo();
            }
        });
    }
    
    // 6. Configurar logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    // 7. Cargar usuario
    cargarUsuario();
    
    console.log('✅ Inicialización completada');
});
