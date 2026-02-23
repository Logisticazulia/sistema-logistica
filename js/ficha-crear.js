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

// ================= ESTADO GLOBAL =================
const fotosData = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

// ================= FUNCIONES DE UTILIDAD =================

/**
 * Muestra alertas en la interfaz
 * @param {string} mensaje - Texto a mostrar
 * @param {string} tipo - 'success', 'error' o 'info'
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
 * Limpia y formatea texto para consistencia
 * @param {string} texto - Texto a limpiar
 * @returns {string} Texto formateado
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
    
    console.log('🔍 Buscando vehículo:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    try {
        // Consulta optimizada: busca en múltiples campos
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(
                `placa.eq.${searchTerm},` +
                `placa.ilike.%${searchTerm}%,` +
                `facsimil.ilike.%${searchTerm}%,` +
                `s_carroceria.ilike.%${searchTerm}%,` +
                `s_motor.ilike.%${searchTerm}%`
            )
            .limit(1);
        
        if (error) {
            console.error('❌ Error en Supabase:', error);
            mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
            return;
        }
        
        console.log('📊 Resultados:', data?.length || 0, 'vehículo(s)');
        
        if (!data || data.length === 0) {
            mostrarAlerta(`❌ No se encontró ningún vehículo con: ${searchTerm}`, 'error');
            return;
        }
        
        // Vehículo encontrado
        const vehiculo = data[0];
        console.log('✅ Vehículo encontrado:', vehiculo.placa || vehiculo.id);
        
        llenarFormulario(vehiculo);
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
        'situacion': 'estatus',
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
            // 🔹 BLOQUEAR CAMPO DESPUÉS DE LLENAR
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
        }
    });
    
    actualizarVistaPrevia();
    mostrarAlerta('✅ Vehículo encontrado. Los campos principales están bloqueados.', 'success');
}
// ================= LIMPIAR BÚSQUEDA Y FORMULARIO =================

/**
 * Limpia la búsqueda y el formulario
 */
// ================= LIMPIAR BÚSQUEDA =================
function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    // Limpiar formulario
    const form = document.getElementById('fichaForm');
    if (form) form.reset();
    
    // 🔹 DESBLOQUEAR TODOS LOS CAMPOS
    const camposABloquear = [
        'marca', 'modelo', 'tipo', 'clase', 'color',
        'serialCarroceria', 'serialMotor', 'placa', 'facsimilar',
        'estatus', 'dependencia'
    ];
    
    camposABloquear.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = false;
            element.style.backgroundColor = 'white';
            element.style.cursor = 'auto';
        }
    });
    
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
 * @param {HTMLInputElement} input - Input file
 * @param {string} previewId - ID del elemento img de preview
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
            
            // Guardar en base64 para guardar después
            const fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            
            // Actualizar vista previa en la ficha final
            actualizarFotosPreview();
        };
        
        reader.onerror = function() {
            mostrarAlerta('❌ Error al leer la imagen', 'error');
        };
        
        reader.readAsDataURL(file);
    }
}

/**
 * Actualiza las fotos en la vista previa de la ficha final
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

// ================= ACTUALIZAR VISTA PREVIA DE TEXTOS =================

/**
 * Actualiza en tiempo real la vista previa con los valores del formulario
 */
function actualizarVistaPrevia() {
    const campos = [
        'marca', 'modelo', 'tipo', 'clase', 'serialCarroceria',
        'color', 'placa', 'facsimilar', 'serialMotor', 'dependencia',
        'estatus', 'causa', 'mecanica', 'diagnostico', 'ubicacion',
        'tapiceria', 'cauchos', 'luces', 'observaciones', 'ano'
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
        ano: document.getElementById('ano')?.value || '',
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
        
        // Opcional: limpiar formulario después de guardar
        // limpiarBusqueda();
        
    } catch (error) {
        console.error('❌ Error al guardar ficha:', error);
        mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
    }
}

// ================= IMPRIMIR FICHA =================

/**
 * Imprime la ficha técnica
 */
function imprimirFicha() {
    window.print();
}

// ================= CARGAR USUARIO AUTENTICADO =================

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
    console.log('🚀 Inicializando ficha técnica de vehículos...');
    
    // 1. Inicializar Supabase
    if (!inicializarSupabase()) {
        console.warn('⚠️ Supabase no disponible, algunas funciones pueden estar limitadas');
    }
    
    // 2. Inicializar vista previa
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    // 3. Configurar event listeners para inputs (vista previa en tiempo real)
    const inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    inputs.forEach(input => {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
    // 4. Configurar botones principales
    const btnGuardar = document.getElementById('btnGuardar');
    const btnImprimir = document.getElementById('btnImprimir');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnBuscar = document.getElementById('btnBuscar');
    const logoutBtn = document.getElementById('logoutBtn');
    const searchInput = document.getElementById('searchInput');
    
    if (btnGuardar) btnGuardar.addEventListener('click', guardarFicha);
    if (btnImprimir) btnImprimir.addEventListener('click', imprimirFicha);
    if (btnLimpiar) btnLimpiar.addEventListener('click', limpiarBusqueda);
    if (btnBuscar) btnBuscar.addEventListener('click', buscarVehiculo);
    
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
    
    // 7. Cargar información del usuario
    cargarUsuario();
    
    console.log('✅ Inicialización completada');
});
// ================= LIMPIAR BÚSQUEDA =================
function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    // Limpiar formulario
    const form = document.getElementById('fichaForm');
    if (form) form.reset();
    
    // 🔹 DESBLOQUEAR TODOS LOS CAMPOS
    const camposABloquear = [
        'marca', 'modelo', 'tipo', 'clase', 'color',
        'serialCarroceria', 'serialMotor', 'placa', 'facsimilar',
        'estatus', 'dependencia'
    ];
    
    camposABloquear.forEach(campo => {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = false;
            element.style.backgroundColor = 'white';
            element.style.cursor = 'auto';
        }
    });
    
 
