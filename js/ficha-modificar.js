/**
 * ============================================
 * MODIFICAR FICHA TÉCNICA - VERSIÓN CORREGIDA
 * ============================================
 * Busca y modifica registros en la tabla: fichas_tecnicas
 */

// ============================================
// CONFIGURACIÓN Y ESTADO GLOBAL
// ============================================
let supabaseClient = null;
let fichaSeleccionada = null;
let isEditing = false;

// Array para almacenar las imágenes en base64 o URLs
const fotosData = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

// URLs de fotos existentes (para no volver a subirlas si no se modifican)
const fotosUrlsExistentes = {
    foto1: null,
    foto2: null,
    foto3: null,
    foto4: null
};

// Flags para saber qué fotos fueron modificadas
const fotosModificadas = {
    foto1: false,
    foto2: false,
    foto3: false,
    foto4: false
};

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando modificación de fichas técnicas...');
    
    try {
        // 1. Inicializar cliente de Supabase
        if (typeof window.supabase === 'undefined') {
            throw new Error('Supabase no está cargado');
        }
        
        supabaseClient = window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_KEY
        );
        
        console.log('✅ Supabase inicializado');
        
        // 2. Cargar usuario autenticado
        await cargarUsuario();
        
        // 3. Configurar vista previa
        actualizarVistaPrevia();
        actualizarFotosPreview();
        
        // 4. Event listeners para vista previa en tiempo real
        const inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
        inputs.forEach(function(input) {
            input.addEventListener('input', actualizarVistaPrevia);
        });
        
        // 5. Configurar botones
        configurarBotones();
        
        // 6. Permitir buscar con Enter
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
        
    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        mostrarAlerta('❌ Error al inicializar: ' + error.message, 'error');
    }
});

// ============================================
// FUNCIONES DE AUTENTICACIÓN
// ============================================

/**
 * Carga y muestra el email del usuario autenticado
 */
async function cargarUsuario() {
    try {
        if (!supabaseClient) return;
        
        const { data: { session }, error } = await supabaseClient.auth.getSession();
        
        if (error) {
            console.error('Error obteniendo sesión:', error);
            return;
        }
        
        const userEmail = document.getElementById('userEmail');
        if (userEmail && session?.user?.email) {
            // Mostrar email truncado si es muy largo
            const email = session.user.email;
            const nombreMostrar = email.length > 25 
                ? email.split('@')[0].substring(0, 22) + '...' 
                : email;
            
            userEmail.textContent = nombreMostrar;
            userEmail.title = email; // Tooltip con email completo
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
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
    });
}

// ============================================
// FUNCIONES DE BÚSQUEDA ✅ CORREGIDO
// ============================================

/**
 * Busca una ficha técnica en la tabla fichas_tecnicas
 * Solo busca por: placa, facsimil, s_carroceria, s_motor
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
    
    // Deshabilitar botón durante búsqueda
    if (btnSearch) btnSearch.disabled = true;
    
    try {
        // ✅ BÚSQUEDA EXACTA POR 4 CAMPOS VÁLIDOS EN fichas_tecnicas
        // NOTA: n_identificacion NO existe en fichas_tecnicas, solo en vehiculos
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
        // Re-habilitar botón
        if (btnSearch) btnSearch.disabled = false;
    }
}

// ============================================
// FUNCIONES DE LLENADO DE FORMULARIO
// ============================================

/**
 * Llena el formulario con los datos de la ficha seleccionada
 * @param {Object} ficha - Datos de la ficha desde Supabase
 */
function llenarFormulario(ficha) {
    console.log('📝 Llenando formulario con ficha:', ficha.id);
    
    // Mapeo de campos de BD a campos del formulario
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
        'estatus_ficha': 'estatus',
        'dependencia': 'dependencia',
        'causa': 'causa',
        'mecanica': 'mecanica',
        'diagnostico': 'diagnostico',
        'ubicacion': 'ubicacion',
        'tapiceria': 'tapiceria',
        'cauchos': 'cauchos',
        'luces': 'luces',
        'observaciones': 'observaciones'
    };
    
    // Llenar campos normales (input, textarea)
    Object.entries(mapeoCampos).forEach(function(pair) {
        const dbField = pair[0];
        const formField = pair[1];
        const element = document.getElementById(formField);
        
        if (element && ficha[dbField] !== null && ficha[dbField] !== undefined) {
            if (element.tagName === 'SELECT') {
                // Para selects, buscar la opción que coincida
                const dbValue = ficha[dbField].toString().toUpperCase().trim();
                let found = false;
                
                for (let i = 0; i < element.options.length; i++) {
                    const optValue = element.options[i].value.toUpperCase().trim();
                    // Comparación flexible (con/sin espacios)
                    if (optValue === dbValue || optValue.replace(/\s/g, '') === dbValue.replace(/\s/g, '')) {
                        element.value = element.options[i].value;
                        found = true;
                        break;
                    }
                }
                
                // Si no encontró, agregar la opción dinámicamente
                if (!found) {
                    const newOption = document.createElement('option');
                    newOption.value = ficha[dbField];
                    newOption.textContent = ficha[dbField];
                    newOption.selected = true;
                    element.appendChild(newOption);
                    console.log('⚠️ Opción agregada dinámicamente:', formField, '=', ficha[dbField]);
                }
            } else {
                // Para inputs y textareas
                element.value = ficha[dbField];
            }
        }
    });
    
    // Establecer ID de la ficha (campo oculto)
    const fichaIdInput = document.getElementById('fichaId');
    if (fichaIdInput && ficha.id) {
        fichaIdInput.value = ficha.id;
    }
    
    // Cargar fotos existentes
    cargarFotosExistentes(ficha);
    
    // Actualizar vista previa
    actualizarVistaPrevia();
    
    console.log('✅ Formulario llenado correctamente');
}

/**
 * Carga las URLs de fotos existentes desde la ficha
 * @param {Object} ficha - Datos de la ficha
 */
function cargarFotosExistentes(ficha) {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewFoto' + i);
        const container = document.getElementById('previewFoto' + i + 'Container');
        const placeholder = container ? container.querySelector('.placeholder') : null;
        const btnRemove = container ? container.parentElement.querySelector('.btn-remove') : null;
        
        const fotoUrlField = 'foto' + i + '_url';
        
        if (ficha[fotoUrlField]) {
            // Hay foto existente
            fotosUrlsExistentes['foto' + i] = ficha[fotoUrlField];
            fotosData['foto' + i] = ficha[fotoUrlField];
            fotosModificadas['foto' + i] = false;
            
            if (img) {
                img.src = ficha[fotoUrlField];
                img.style.display = 'block';
            }
            if (placeholder) placeholder.style.display = 'none';
            if (btnRemove) btnRemove.style.display = 'flex';
        } else {
            // No hay foto
            fotosUrlsExistentes['foto' + i] = null;
            fotosData['foto' + i] = null;
            fotosModificadas['foto' + i] = false;
            
            if (img) {
                img.src = '';
                img.style.display = 'none';
            }
            if (placeholder) placeholder.style.display = 'flex';
            if (btnRemove) btnRemove.style.display = 'none';
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
    
    // Limpiar campo oculto de ID
    const fichaIdInput = document.getElementById('fichaId');
    if (fichaIdInput) fichaIdInput.value = '';
    
    // Limpiar fotos
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
        if (input) input.value = '';
        
        fotosData['foto' + i] = null;
        fotosUrlsExistentes['foto' + i] = null;
        fotosModificadas['foto' + i] = false;
    }
    
    // Actualizar vistas
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    // Ocultar botones de editar/cancelar
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
 */
function editarFicha() {
    if (!fichaSeleccionada) {
        mostrarAlerta('⚠️ Primero debe buscar una ficha técnica', 'error');
        return;
    }
    
    // Habilitar todos los campos del formulario
    toggleFormFields(true);
    
    // Cambiar visibilidad de botones
    const btnEditar = document.getElementById('btnEditar');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnCancelar = document.getElementById('btnCancelar');
    
    if (btnEditar) btnEditar.style.display = 'none';
    if (btnGuardar) btnGuardar.style.display = 'inline-flex';
    if (btnCancelar) btnCancelar.style.display = 'inline-flex';
    
    isEditing = true;
    
    mostrarAlerta('ℹ️ Editando ficha. Modifique los campos y haga clic en "Guardar Cambios".', 'info');
}

/**
 * Cancela la edición y restaura los datos originales
 */
function cancelarEdicion() {
    if (fichaSeleccionada) {
        // Restaurar datos originales
        llenarFormulario(fichaSeleccionada);
    }
    
    // Deshabilitar campos
    toggleFormFields(false);
    
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

/**
 * Habilita o deshabilita los campos del formulario
 * @param {boolean} enable - true para habilitar, false para deshabilitar
 */
function toggleFormFields(enable) {
    const fields = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    
    fields.forEach(function(field) {
        // No deshabilitar el campo oculto de ID
        if (field.id !== 'fichaId') {
            field.disabled = !enable;
        }
    });
    
    // Actualizar clase del formulario para estilos CSS
    const form = document.getElementById('fichaForm');
    if (form) {
        form.classList.toggle('form-disabled', !enable);
    }
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
            
            // Formato especial para observaciones
            if (formField === 'observaciones') {
                preview.style.whiteSpace = 'pre-wrap';
            }
        }
    });
}

/**
 * Maneja la previsualización de imágenes al seleccionar archivos
 * @param {HTMLInputElement} input - Input file
 * @param {string} previewId - ID del elemento img para preview
 */
function previewImage(input, previewId) {
    if (!input.files || !input.files[0]) return;
    
    const file = input.files[0];
    
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
        mostrarAlerta('⚠️ Por favor seleccione un archivo de imagen válido', 'error');
        return;
    }
    
    // Validar tamaño (máximo 5MB)
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
        
        // Guardar en memoria y marcar como modificada
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
 * @param {number} numero - Número de la foto (1-4)
 */
function removeFoto(numero) {
    const img = document.getElementById('previewFoto' + numero);
    const container = document.getElementById('previewFoto' + numero + 'Container');
    const placeholder = container ? container.querySelector('.placeholder') : null;
    const btnRemove = container ? container.parentElement.querySelector('.btn-remove') : null;
    const input = document.getElementById('foto' + numero);
    
    // Resetear elementos visuales
    if (img) {
        img.src = '';
        img.style.display = 'none';
    }
    if (placeholder) placeholder.style.display = 'flex';
    if (btnRemove) btnRemove.style.display = 'none';
    if (input) input.value = '';
    
    // Limpiar datos en memoria
    fotosData['foto' + numero] = null;
    fotosUrlsExistentes['foto' + numero] = null;
    fotosModificadas['foto' + numero] = true; // Marcar como modificada para eliminar
    
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

// ============================================
// FUNCIONES DE GUARDADO
// ============================================

/**
 * Guarda los cambios de la ficha en Supabase
 * @param {Event} event - Evento del formulario
 */
async function guardarFicha(event) {
    if (event) event.preventDefault();
    
    if (!fichaSeleccionada) {
        mostrarAlerta('⚠️ No hay ficha seleccionada para guardar', 'error');
        return;
    }
    
    // Validar formulario
    const form = document.getElementById('fichaForm');
    if (form && !form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }
    
    // Validar campos obligatorios
    const camposObligatorios = ['marca', 'modelo', 'tipo', 'clase', 'serialCarroceria', 'serialMotor', 'color', 'estatus', 'dependencia'];
    const camposFaltantes = [];
    
    camposObligatorios.forEach(function(campo) {
        const input = document.getElementById(campo);
        if (input && !input.value.trim()) {
            camposFaltantes.push(campo);
        }
    });
    
    if (camposFaltantes.length > 0) {
        mostrarAlerta('⚠️ Campos obligatorios faltantes: ' + camposFaltantes.join(', '), 'error');
        return;
    }
    
    // Deshabilitar botón durante guardado
    const btnGuardar = document.getElementById('btnGuardar');
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerHTML = '<span>⏳</span><span>Guardando...</span>';
    }
    
    try {
        console.log('💾 Guardando ficha ID:', fichaSeleccionada.id);
        
        // Preparar datos actualizados
        const fichaActualizada = {
            // Campos de texto
            marca: (document.getElementById('marca')?.value || '').trim().toUpperCase(),
            modelo: (document.getElementById('modelo')?.value || '').trim().toUpperCase(),
            tipo: (document.getElementById('tipo')?.value || '').trim().toUpperCase(),
            clase: (document.getElementById('clase')?.value || '').trim().toUpperCase(),
            color: (document.getElementById('color')?.value || '').trim().toUpperCase(),
            s_carroceria: (document.getElementById('serialCarroceria')?.value || '').trim(),
            s_motor: (document.getElementById('serialMotor')?.value || '').trim(),
            placa: (document.getElementById('placa')?.value || '').trim().toUpperCase(),
            facsimil: (document.getElementById('facsimilar')?.value || '').trim(),
            estatus_ficha: (document.getElementById('estatus')?.value || '').trim().toUpperCase(),
            dependencia: (document.getElementById('dependencia')?.value || '').trim(),
            
            // Campos técnicos (opcionales)
            causa: (document.getElementById('causa')?.value || '').trim() || null,
            mecanica: (document.getElementById('mecanica')?.value || '').trim() || null,
            diagnostico: (document.getElementById('diagnostico')?.value || '').trim() || null,
            ubicacion: (document.getElementById('ubicacion')?.value || '').trim() || null,
            tapiceria: (document.getElementById('tapiceria')?.value || '').trim() || null,
            cauchos: (document.getElementById('cauchos')?.value || '').trim() || null,
            luces: (document.getElementById('luces')?.value || '').trim() || null,
            observaciones: (document.getElementById('observaciones')?.value || '').trim() || null,
            
            // Fotos (se mantienen las existentes a menos que se modifiquen)
            foto1_url: fotosUrlsExistentes.foto1,
            foto2_url: fotosUrlsExistentes.foto2,
            foto3_url: fotosUrlsExistentes.foto3,
            foto4_url: fotosUrlsExistentes.foto4,
            
            // Metadatos
            updated_at: new Date().toISOString()
        };
        
        // Subir fotos modificadas a Supabase Storage
        const bucketName = 'fichas-tecnicas';
        
        for (let i = 1; i <= 4; i++) {
            if (fotosModificadas['foto' + i] && fotosData['foto' + i]) {
                console.log(`📤 Subiendo foto ${i}...`);
                
                const base64Data = fotosData['foto' + i];
                let blob;
                
                // Convertir base64 o URL a Blob
                if (base64Data.startsWith('http')) {
                    // Es una URL existente, no necesitamos subirla de nuevo
                    fichaActualizada['foto' + i + '_url'] = base64Data;
                    continue;
                } else {
                    // Es base64, convertir a Blob
                    const response = await fetch(base64Data);
                    blob = await response.blob();
                }
                
                // Generar nombre único para el archivo
                const fileName = 'ficha_' + Date.now() + '_foto' + i + '_' + 
                    (fichaSeleccionada.placa || fichaSeleccionada.id) + '.jpg';
                
                // Subir a Supabase Storage
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
                
                // Obtener URL pública
                const { data: urlData } = supabaseClient
                    .storage
                    .from(bucketName)
                    .getPublicUrl(fileName);
                
                fichaActualizada['foto' + i + '_url'] = urlData.publicUrl;
                console.log('✅ Foto ' + i + ' subida:', urlData.publicUrl);
            }
        }
        
        // Actualizar registro en Supabase
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .update(fichaActualizada)
            .eq('id', fichaSeleccionada.id)
            .select();
        
        if (error) {
            console.error('❌ Error al actualizar:', error);
            throw error;
        }
        
        console.log('✅ Ficha actualizada:', data);
        
        // Actualizar ficha seleccionada con los nuevos datos
        fichaSeleccionada = Object.assign({}, fichaSeleccionada, data[0]);
        
        // Mostrar mensaje de éxito
        mostrarAlerta('✅ Ficha técnica actualizada exitosamente', 'success');
        
        // Volver al modo lectura después de guardar
        setTimeout(function() {
            toggleFormFields(false);
            
            const btnEditar = document.getElementById('btnEditar');
            const btnGuardar = document.getElementById('btnGuardar');
            const btnCancelar = document.getElementById('btnCancelar');
            
            if (btnEditar) btnEditar.style.display = 'inline-flex';
            if (btnGuardar) btnGuardar.style.display = 'none';
            if (btnCancelar) btnCancelar.style.display = 'inline-flex';
            
            isEditing = false;
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error en guardarFicha:', error);
        mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
    } finally {
        // Restaurar botón
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
 * @param {string} mensaje - Texto de la alerta
 * @param {string} tipo - Tipo de alerta: 'success', 'error', 'info'
 */
function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    
    // Scroll suave hacia la alerta
    alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Ocultar después de 5 segundos
    setTimeout(function() {
        alertDiv.style.display = 'none';
    }, 5000);
}

/**
 * Configura los event listeners de los botones
 */
function configurarBotones() {
    // Botón Buscar
    const btnSearch = document.getElementById('btnSearch');
    if (btnSearch) {
        btnSearch.addEventListener('click', buscarFicha);
    }
    
    // Botón Limpiar
    const btnLimpiar = document.getElementById('btnLimpiar');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarBusqueda);
    }
    
    // Botón Editar
    const btnEditar = document.getElementById('btnEditar');
    if (btnEditar) {
        btnEditar.addEventListener('click', editarFicha);
    }
    
    // Botón Guardar
    const btnGuardar = document.getElementById('btnGuardar');
    if (btnGuardar) {
        btnGuardar.addEventListener('click', guardarFicha);
    }
    
    // Botón Cancelar
    const btnCancelar = document.getElementById('btnCancelar');
    if (btnCancelar) {
        btnCancelar.addEventListener('click', cancelarEdicion);
    }
    
    // Botón Cerrar Sesión
    configurarCerrarSesion();
}

// ============================================
// FIN DEL MÓDULO
// ============================================
console.log('✅ Módulo ficha-modificar.js cargado correctamente');
