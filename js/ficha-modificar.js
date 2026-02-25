/**
 * ============================================
 * MODIFICAR FICHA TÉCNICA - VERSIÓN CORREGIDA
 * ============================================
 * Solo permite modificar:
 * - Información Técnico Mecánica
 * - Fotos (4 fotos)
 * 
 * NO permite modificar:
 * - Datos del vehículo (marca, modelo, tipo, etc.)
 */

// ============================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ============================================
const supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_KEY
);

// Array para almacenar las imágenes
const fotosData = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

// URLs de fotos existentes
const fotosUrlsExistentes = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

// Fotos modificadas
const fotosModificadas = {
    foto1: false,
    foto2: false,
    foto3: false,
    foto4: false
};

// Ficha seleccionada
let fichaSeleccionada = null;
let isEditing = false;

// ============================================
// CAMPOS EDITABLES VS NO EDITABLES
// ============================================

// ✅ CAMPOS QUE SÍ SE PUEDEN EDITAR
const CAMPOS_EDITABLES = [
    'causa',
    'mecanica',
    'diagnostico',
    'ubicacion',
    'tapiceria',
    'cauchos',
    'luces',
    'observaciones',
    'foto1',
    'foto2',
    'foto3',
    'foto4'
];

// ❌ CAMPOS QUE NO SE PUEDEN EDITAR (Datos del vehículo)
const CAMPOS_NO_EDITABLES = [
    'marca',
    'modelo',
    'tipo',
    'clase',
    'serialCarroceria',
    'serialMotor',
    'color',
    'placa',
    'facsimilar',
    'estatus',
    'dependencia'
];

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando modificación de fichas técnicas...');
    
    // Cargar usuario autenticado
    cargarUsuario();
    
    // Configurar vista previa
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    // Configurar botones
    configurarBotones();
    
    // Permitir buscar con Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarFicha();
            }
        });
    }
    
    console.log('✅ Modificación de fichas inicializada');
});

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

/**
 * Carga y muestra el email del usuario autenticado
 */
async function cargarUsuario() {
    try {
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Error obteniendo sesión:', error);
            return;
        }
        
        const userEmail = document.getElementById('userEmail');
        if (session?.user?.email) {
            const email = session.user.email;
            const nombreMostrar = email.length > 25 
                ? email.split('@')[0].substring(0, 22) + '...' 
                : email;
            
            userEmail.textContent = nombreMostrar;
            userEmail.title = email;
        }
    } catch (err) {
        console.error('Error mostrando usuario:', err);
    }
}

/**
 * Configura el cierre de sesión
 */
function configurarCerrarSesion() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', async function() {
        if (confirm('¿Está seguro de cerrar sesión?')) {
            try {
                await supabaseClient.auth.signOut();
                localStorage.clear();
                window.location.href = '../index.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                window.location.href = '../index.html';
            }
        }
    });
}

// ============================================
// FUNCIONES DE BÚSQUEDA ✅ CORREGIDO
// ============================================

/**
 * Busca una ficha técnica en la tabla fichas_tecnicas
 * SOLO busca en fichas_tecnicas (NO en vehiculos)
 */
async function buscarFicha() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const btnSearch = document.getElementById('btnSearch');
    
    if (!searchInput) {
        console.error('❌ Campo de búsqueda no encontrado');
        return;
    }
    
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando ficha técnica:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    if (btnSearch) btnSearch.disabled = true;
    
    try {
        // ✅ BÚSQUEDA EN TABLA fichas_tecnicas (4 campos)
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .or(`placa.eq.${searchTerm},facsimil.eq.${searchTerm},s_carroceria.eq.${searchTerm},s_motor.eq.${searchTerm}`)
            .limit(1);
        
        if (error) {
            console.error('❌ Error en la búsqueda:', error);
            mostrarAlerta('❌ Error al buscar: ' + error.message, 'error');
            return;
        }
        
        if (!data || data.length === 0) {
            mostrarAlerta('❌ No se encontró ninguna ficha técnica con: ' + searchTerm, 'error');
            fichaSeleccionada = null;
            resetearFormulario();
            return;
        }
        
        fichaSeleccionada = data[0];
        console.log('✅ Ficha encontrada:', fichaSeleccionada);
        
        // Llenar formulario con los datos encontrados
        llenarFormulario(fichaSeleccionada);
        
        // Mostrar mensaje de éxito
        mostrarAlerta('✅ Ficha técnica encontrada: ' + 
            (fichaSeleccionada.marca || '') + ' ' + 
            (fichaSeleccionada.modelo || '') + 
            ' - Placa: ' + (fichaSeleccionada.placa || 'N/A'), 'success');
        
        // Actualizar vista previa
        actualizarVistaPrevia();
        
        // Mostrar botones de editar/cancelar
        const btnEditar = document.getElementById('btnEditar');
        const btnCancelar = document.getElementById('btnCancelar');
        if (btnEditar) btnEditar.style.display = 'inline-flex';
        if (btnCancelar) btnCancelar.style.display = 'inline-flex';
        
    } catch (error) {
        console.error('❌ Error en buscarFicha:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        if (btnSearch) btnSearch.disabled = false;
    }
}

// ============================================
// FUNCIONES DE LLENADO DE FORMULARIO
// ============================================

/**
 * Llena el formulario con los datos de la ficha seleccionada
 * Bloquea campos no editables y habilita solo los editables
 */
function llenarFormulario(ficha) {
    console.log('📝 Llenando formulario con ficha:', ficha);
    
    // === 1. LLENAR CAMPOS NO EDITABLES (solo lectura) ===
    const mapeoCamposNoEditables = {
        'marca': 'marca',
        'modelo': 'modelo',
        'tipo': 'tipo',
        'clase': 'clase',
        'color': 'color',
        's_carroceria': 'serialCarroceria',
        's_motor': 'serialMotor',
        'placa': 'placa',
        'facsimil': 'facsimilar',
        'estatus_ficha': 'estatus',
        'dependencia': 'dependencia'
    };
    
    Object.entries(mapeoCamposNoEditables).forEach(function(pair) {
        const dbField = pair[0];
        const formField = pair[1];
        const element = document.getElementById(formField);
        
        if (element && ficha[dbField]) {
            if (element.tagName === 'SELECT') {
                const options = Array.from(element.options);
                const dbValue = ficha[dbField].toUpperCase().trim();
                let matchingOption = options.find(function(opt) {
                    const optValue = opt.value.toUpperCase().trim();
                    return optValue === dbValue || optValue.replace(/\s/g, '') === dbValue.replace(/\s/g, '');
                });
                
                if (matchingOption) {
                    element.value = matchingOption.value;
                } else {
                    const newOption = document.createElement('option');
                    newOption.value = dbValue;
                    newOption.textContent = dbValue;
                    newOption.selected = true;
                    element.appendChild(newOption);
                }
            } else {
                element.value = ficha[dbField];
            }
            
            // 🔒 BLOQUEAR CAMPO (siempre disabled)
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
            
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('locked');
            }
        }
    });
    
    // === 2. LLENAR CAMPOS EDITABLES (Técnico Mecánica) ===
    const mapeoCamposEditables = {
        'causa': 'causa',
        'mecanica': 'mecanica',
        'diagnostico': 'diagnostico',
        'ubicacion': 'ubicacion',
        'tapiceria': 'tapiceria',
        'cauchos': 'cauchos',
        'luces': 'luces',
        'observaciones': 'observaciones'
    };
    
    Object.entries(mapeoCamposEditables).forEach(function(pair) {
        const dbField = pair[0];
        const formField = pair[1];
        const element = document.getElementById(formField);
        
        if (element && ficha[dbField]) {
            element.value = ficha[dbField];
            element.disabled = true; // Inicialmente disabled hasta modo edición
        }
    });
    
    // === 3. ESTABLECER ID DE LA FICHA ===
    const fichaIdInput = document.getElementById('fichaId');
    if (fichaIdInput && ficha.id) {
        fichaIdInput.value = ficha.id;
    }
    
    // === 4. CARGAR FOTOS EXISTENTES ===
    cargarFotosExistentes(ficha);
    
    // === 5. ACTUALIZAR VISTA PREVIA ===
    actualizarVistaPrevia();
    
    console.log('✅ Formulario llenado correctamente');
}

/**
 * Carga las URLs de fotos existentes desde la ficha
 */
function cargarFotosExistentes(ficha) {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewFoto' + i);
        const container = document.getElementById('previewFoto' + i + 'Container');
        const placeholder = container ? container.querySelector('.placeholder') : null;
        const btnRemove = container ? container.parentElement.querySelector('.btn-remove') : null;
        const input = document.getElementById('foto' + i);
        
        const fotoUrlField = 'foto' + i + '_url';
        
        if (ficha[fotoUrlField]) {
            fotosUrlsExistentes['foto' + i] = ficha[fotoUrlField];
            fotosData['foto' + i] = ficha[fotoUrlField];
            fotosModificadas['foto' + i] = false;
            
            if (img) {
                img.src = ficha[fotoUrlField];
                img.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            if (btnRemove) btnRemove.style.display = 'flex';
            if (input) input.disabled = true;
        } else {
            fotosUrlsExistentes['foto' + i] = null;
            fotosData['foto' + i] = null;
            fotosModificadas['foto' + i] = false;
            
            if (img) {
                img.src = '';
                img.style.display = 'none';
            }
            if (placeholder) placeholder.style.display = 'flex';
            if (btnRemove) btnRemove.style.display = 'none';
            if (input) input.disabled = true;
        }
    }
    
    actualizarFotosPreview();
}

/**
 * Resetea el formulario a su estado inicial
 */
function resetearFormulario() {
    const form = document.getElementById('fichaForm');
    if (form) form.reset();
    
    const fichaIdInput = document.getElementById('fichaId');
    if (fichaIdInput) fichaIdInput.value = '';
    
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewFoto' + i);
        const container = document.getElementById('previewFoto' + i + 'Container');
        const placeholder = container ? container.querySelector('.placeholder') : null;
        const btnRemove = container ? container.parentElement.querySelector('.btn-remove') : null;
        const input = document.getElementById('foto' + i);
        
        if (img) {
            img.src = '';
            img.style.display = 'none';
        }
        if (placeholder) placeholder.style.display = 'flex';
        if (btnRemove) btnRemove.style.display = 'none';
        if (input) {
            input.value = '';
            input.disabled = true;
        }
        
        fotosData['foto' + i] = null;
        fotosUrlsExistentes['foto' + i] = null;
        fotosModificadas['foto' + i] = false;
    }
    
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    const btnEditar = document.getElementById('btnEditar');
    const btnCancelar = document.getElementById('btnCancelar');
    if (btnEditar) btnEditar.style.display = 'none';
    if (btnCancelar) btnCancelar.style.display = 'none';
}

/**
 * Limpia la búsqueda y el formulario
 */
function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    resetearFormulario();
    fichaSeleccionada = null;
    
    console.log('🧹 Búsqueda y formulario limpiados');
}

// ============================================
// FUNCIONES DE EDICIÓN
// ============================================

/**
 * Activa el modo de edición del formulario
 * Solo habilita campos de Información Técnico Mecánica y fotos
 */
function editarFicha() {
    if (!fichaSeleccionada) {
        mostrarAlerta('⚠️ Primero debe buscar una ficha técnica', 'error');
        return;
    }
    
    console.log('✏️ Activando modo edición...');
    
    // === 1. MANTENER BLOQUEADOS LOS CAMPOS PRINCIPALES ===
    CAMPOS_NO_EDITABLES.forEach(function(campo) {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
        }
    });
    
    // === 2. HABILITAR SOLO CAMPOS EDITABLES ===
    CAMPOS_EDITABLES.forEach(function(campo) {
        const element = document.getElementById(campo);
        if (element && (element.tagName !== 'INPUT' || element.type !== 'file')) {
            element.disabled = false;
            element.style.backgroundColor = 'white';
            element.style.cursor = 'auto';
        }
    });
    
    // === 3. HABILITAR INPUTS DE FOTOS ===
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById('foto' + i);
        if (input) {
            input.disabled = false;
            input.style.cursor = 'pointer';
        }
    }
    
    // === 4. CAMBIAR VISIBILIDAD DE BOTONES ===
    const btnEditar = document.getElementById('btnEditar');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnCancelar = document.getElementById('btnCancelar');
    
    if (btnEditar) btnEditar.style.display = 'none';
    if (btnGuardar) btnGuardar.style.display = 'inline-flex';
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';
    
    isEditing = true;
    
    mostrarAlerta('ℹ️ Editando ficha. Solo puede modificar: Información Técnico Mecánica y Fotos.', 'info');
}

/**
 * Cancela la edición y restaura los datos originales
 */
function cancelarEdicion() {
    if (fichaSeleccionada) {
        llenarFormulario(fichaSeleccionada);
    }
    
    // Deshabilitar campos editables
    CAMPOS_EDITABLES.forEach(function(campo) {
        const element = document.getElementById(campo);
        if (element && (element.tagName !== 'INPUT' || element.type !== 'file')) {
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
        }
    });
    
    // Deshabilitar inputs de fotos
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById('foto' + i);
        if (input) {
            input.disabled = true;
            input.style.cursor = 'not-allowed';
        }
    }
    
    // Cambiar visibilidad de botones
    const btnEditar = document.getElementById('btnEditar');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnCancelar = document.getElementById('btnCancelar');
    
    if (btnEditar) btnEditar.style.display = 'inline-flex';
    if (btnGuardar) btnGuardar.style.display = 'none';
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';
    
    isEditing = false;
    
    mostrarAlerta('ℹ️ Edición cancelada. Los cambios no fueron guardados.', 'info');
}

// ============================================
// FUNCIONES DE VISTA PREVIA
// ============================================

/**
 * Actualiza la vista previa con los valores del formulario
 */
function actualizarVistaPrevia() {
    const campos = {
        'marca': 'previewMarca',
        'modelo': 'previewModelo',
        'tipo': 'previewTipo',
        'clase': 'previewClase',
        'serialCarroceria': 'previewSerialCarroceria',
        'color': 'previewColor',
        'placa': 'previewPlaca',
        'facsimilar': 'previewFacsimilar',
        'serialMotor': 'previewSerialMotor',
        'dependencia': 'previewDependencia',
        'estatus': 'previewEstatus',
        'causa': 'previewCausa',
        'mecanica': 'previewMecanica',
        'diagnostico': 'previewDiagnostico',
        'ubicacion': 'previewUbicacion',
        'tapiceria': 'previewTapiceria',
        'cauchos': 'previewCauchos',
        'luces': 'previewLuces',
        'observaciones': 'previewObservaciones'
    };
    
    Object.keys(campos).forEach(function(formField) {
        const previewField = campos[formField];
        const element = document.getElementById(formField);
        const preview = document.getElementById(previewField);
        
        if (element && preview) {
            preview.textContent = element.value || 'N/A';
            if (formField === 'observaciones') {
                preview.style.whiteSpace = 'pre-wrap';
            }
        }
    });
}

/**
 * Maneja la previsualización de imágenes al seleccionar archivos
 */
function previewImage(input, previewId) {
    if (!input.files || !input.files[0]) return;
    
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
        const placeholder = container ? container.querySelector('.placeholder') : null;
        const btnRemove = container ? container.parentElement.querySelector('.btn-remove') : null;
        
        if (img) {
            img.src = e.target.result;
            img.style.display = 'block';
        }
        if (placeholder) placeholder.style.display = 'none';
        if (btnRemove) btnRemove.style.display = 'flex';
        
        const fotoNum = previewId.replace('previewFoto', 'foto');
        fotosData[fotoNum] = e.target.result;
        fotosModificadas[fotoNum] = true;
        
        actualizarFotosPreview();
    };
    
    reader.onerror = function() {
        mostrarAlerta('❌ Error al leer la imagen', 'error');
    };
    
    reader.readAsDataURL(file);
}

/**
 * Elimina una foto del preview
 */
function removeFoto(numero) {
    const img = document.getElementById('previewFoto' + numero);
    const container = document.getElementById('previewFoto' + numero + 'Container');
    const placeholder = container ? container.querySelector('.placeholder') : null;
    const btnRemove = container ? container.parentElement.querySelector('.btn-remove') : null;
    const input = document.getElementById('foto' + numero);
    
    if (img) {
        img.src = '';
        img.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'flex';
    if (btnRemove) btnRemove.style.display = 'none';
    if (input) input.value = '';
    
    fotosData['foto' + numero] = null;
    fotosUrlsExistentes['foto' + numero] = null;
    fotosModificadas['foto' + numero] = true;
    
    actualizarFotosPreview();
}

/**
 * Actualiza las fotos en la vista previa de la ficha impresa
 */
function actualizarFotosPreview() {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewImg' + i);
        const box = document.getElementById('previewBox' + i);
        const span = box ? box.querySelector('span') : null;
        
        if (fotosData['foto' + i]) {
            img.src = fotosData['foto' + i];
            img.style.display = 'block';
            if (span) span.style.display = 'none';
        } else {
            if (img) img.style.display = 'none';
            if (span) span.style.display = 'block';
        }
    }
}

// ============================================
// FUNCIONES DE GUARDADO ✅ CORREGIDO
// ============================================

/**
 * Guarda los cambios de la ficha en Supabase
 * SOLO guarda campos editables (Técnico Mecánica + Fotos)
 */
async function guardarFicha(event) {
    if (event) event.preventDefault();
    
    if (!fichaSeleccionada) {
        mostrarAlerta('⚠️ No hay ficha seleccionada', 'error');
        return;
    }
    
    const btnGuardar = document.getElementById('btnGuardar');
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span>⏳</span><span>Guardando...</span>';
    }
    
    try {
        console.log('💾 Guardando ficha ID:', fichaSeleccionada.id);
        
        // === PREPARAR DATOS ACTUALIZADOS (SOLO CAMPOS EDITABLES) ===
        const fichaActualizada = {
            // Información Técnico Mecánica
            causa: (document.getElementById('causa')?.value || '').trim() || null,
            mecanica: (document.getElementById('mecanica')?.value || '').trim() || null,
            diagnostico: (document.getElementById('diagnostico')?.value || '').trim() || null,
            ubicacion: (document.getElementById('ubicacion')?.value || '').trim() || null,
            tapiceria: (document.getElementById('tapiceria')?.value || '').trim() || null,
            cauchos: (document.getElementById('cauchos')?.value || '').trim() || null,
            luces: (document.getElementById('luces')?.value || '').trim() || null,
            observaciones: (document.getElementById('observaciones')?.value || '').trim() || null,
            
            // URLs de fotos
            foto1_url: fotosUrlsExistentes.foto1,
            foto2_url: fotosUrlsExistentes.foto2,
            foto3_url: fotosUrlsExistentes.foto3,
            foto4_url: fotosUrlsExistentes.foto4,
            
            // Metadatos
            updated_at: new Date().toISOString()
        };
        
        // === SUBIR FOTOS MODIFICADAS A SUPABASE STORAGE ===
        const bucketName = 'fichas-tecnicas';
        
        for (let i = 1; i <= 4; i++) {
            if (fotosModificadas['foto' + i] && fotosData['foto' + i]) {
                console.log('📤 Subiendo foto ' + i + '...');
                
                const base64Data = fotosData['foto' + i];
                let blob;
                
                if (base64Data.startsWith('http')) {
                    fichaActualizada['foto' + i + '_url'] = base64Data;
                    continue;
                } else {
                    const response = await fetch(base64Data);
                    blob = await response.blob();
                }
                
                const fileName = 'ficha_' + Date.now() + '_foto' + i + '_' + 
                    (fichaSeleccionada.placa || fichaSeleccionada.id) + '.jpg';
                
                const { data: uploadData, error: uploadError } = await supabaseClient
                    .storage
                    .from(bucketName)
                    .upload(fileName, blob, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (uploadError) {
                    console.error('❌ Error subiendo foto ' + i + ':', uploadError);
                    throw uploadError;
                }
                
                const { data: urlData } = supabaseClient
                    .storage
                    .from(bucketName)
                    .getPublicUrl(fileName);
                
                fichaActualizada['foto' + i + '_url'] = urlData.publicUrl;
                console.log('✅ Foto ' + i + ' subida:', urlData.publicUrl);
            }
        }
        
        // === ACTUALIZAR REGISTRO EN SUPABASE ===
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .update(fichaActualizada)
            .eq('id', fichaSeleccionada.id)
            .select();
        
        if (error) {
            console.error('❌ Error al actualizar:', error);
            mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Ficha actualizada:', data);
        
        fichaSeleccionada = Object.assign({}, fichaSeleccionada, data[0]);
        
        mostrarAlerta('✅ Ficha técnica actualizada exitosamente', 'success');
        
        setTimeout(function() {
            cancelarEdicion();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error en guardarFicha:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerHTML = '<span>💾</span><span>Guardar Cambios</span>';
        }
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Muestra una alerta temporal en la interfaz
 */
function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(function() {
        alertDiv.style.display = 'none';
    }, 5000);
}

/**
 * Configura los event listeners de los botones
 */
function configurarBotones() {
    const btnSearch = document.getElementById('btnSearch');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnEditar = document.getElementById('btnEditar');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnCancelar = document.getElementById('btnCancelar');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (btnSearch) {
        btnSearch.addEventListener('click', buscarFicha);
    }
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarBusqueda);
    }
    
    if (btnEditar) {
        btnEditar.addEventListener('click', editarFicha);
    }
    
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarFicha);
    }
    
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarEdicion);
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('¿Está seguro de cerrar sesión?')) {
                await supabaseClient.auth.signOut();
                window.location.href = '../index.html';
            }
        });
    }
    
    configurarCerrarSesion();
}

// ============================================
// FIN DEL MÓDULO
// ============================================
console.log('✅ Módulo ficha-modificar.js cargado correctamente');
console.log('🔒 Campos principales BLOQUEADOS (solo lectura)');
console.log('✏️ Campos editables: Información Técnico Mecánica + Fotos');
