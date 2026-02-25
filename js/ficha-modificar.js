/**
 * ============================================
 * MODIFICAR FICHA TÉCNICA - VERSIÓN CORREGIDA
 * ============================================
 * CAMPOS BLOQUEADOS (NO EDITABLES):
 * - Todos los datos del vehículo (marca, modelo, tipo, etc.)
 * 
 * CAMPOS EDITABLES:
 * - Información Técnico Mecánica
 * - Fotos (4 fotos)
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

// Fotos modificadas (para saber cuáles subir)
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
// CAMPOS BLOQUEADOS VS EDITABLES
// ============================================

// 🔒 CAMPOS BLOQUEADOS - DATOS DEL VEHÍCULO (NO EDITABLES)
const CAMPOS_BLOQUEADOS = [
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

// ✏️ CAMPOS EDITABLES - INFORMACIÓN TÉCNICO MECÁNICA
const CAMPOS_EDITABLES = [
    'causa',
    'mecanica',
    'diagnostico',
    'ubicacion',
    'tapiceria',
    'cauchos',
    'luces',
    'observaciones'
];

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando modificación de fichas técnicas...');
    
    // Inicializar cliente de Supabase
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Supabase no está cargado');
        return;
    }
    
    // 🔒 BLOQUEAR CAMPOS DE DATOS DEL VEHÍCULO AL INICIAR
    bloquearCamposVehiculo();
    
    // Configurar vista previa
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    // Configurar botones
    configurarBotones();
    
    console.log('✅ Modificación de fichas inicializada');
    console.log('🔒 Campos de vehículo BLOQUEADOS (solo lectura)');
    console.log('✏️ Solo se pueden editar: Información Técnico Mecánica y Fotos');
});

// ============================================
// FUNCIONES DE BLOQUEO DE CAMPOS
// ============================================

/**
 * 🔒 Bloquea todos los campos de Datos del Vehículo
 * Estos campos NUNCA se pueden editar
 */
function bloquearCamposVehiculo() {
    CAMPOS_BLOQUEADOS.forEach(function(campo) {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
            
            // Agregar clase locked al form-group para mostrar candado
            const formGroup = element.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('locked');
            }
        }
    });
    
    console.log('🔒 Campos de vehículo bloqueados:', CAMPOS_BLOQUEADOS);
}

/**
 * ✏️ Habilita/Deshabilita campos de Información Técnico Mecánica
 * Solo estos campos se pueden editar cuando isEditing = true
 */
function toggleCamposTecnicos(enable) {
    CAMPOS_EDITABLES.forEach(function(campo) {
        const element = document.getElementById(campo);
        if (element) {
            element.disabled = !enable;
            element.style.backgroundColor = enable ? 'white' : '#f3f4f6';
            element.style.cursor = enable ? 'auto' : 'not-allowed';
        }
    });
    
    // También habilitar/deshabilitar inputs de fotos
    for (let i = 1; i <= 4; i++) {
        const input = document.getElementById('foto' + i);
        if (input) {
            input.disabled = !enable;
            input.style.cursor = enable ? 'pointer' : 'not-allowed';
        }
    }
    
    console.log(enable ? '✏️ Campos técnicos habilitados' : '🔒 Campos técnicos deshabilitados');
}

// ============================================
// FUNCIONES DE BÚSQUEDA
// ============================================
async function buscarFicha() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando ficha técnica:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    const btnSearch = document.getElementById('btnSearch');
    btnSearch.disabled = true;
    
    try {
        // Búsqueda en tabla fichas_tecnicas por 4 campos
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
        
        mostrarAlerta('✅ Ficha técnica encontrada: ' + 
            fichaSeleccionada.marca + ' ' + 
            fichaSeleccionada.modelo + ' - Placa: ' + fichaSeleccionada.placa, 'success');
        
        actualizarVistaPrevia();
        
        // Mostrar botones de editar/cancelar
        document.getElementById('btnEditar').style.display = 'inline-flex';
        document.getElementById('btnCancelar').style.display = 'inline-flex';
        
    } catch (error) {
        console.error('❌ Error en buscarFicha:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        btnSearch.disabled = false;
    }
}

// ============================================
// FUNCIONES DE LLENADO DE FORMULARIO
// ============================================
function llenarFormulario(ficha) {
    console.log('📝 Llenando formulario con ficha:', ficha);
    
    // 🔒 LLENAR CAMPOS BLOQUEADOS (Datos del Vehículo)
    const mapeoCamposBloqueados = {
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
    
    Object.entries(mapeoCamposBloqueados).forEach(function(pair) {
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
            
            // 🔒 MANTENER BLOQUEADO
            element.disabled = true;
            element.style.backgroundColor = '#f3f4f6';
            element.style.cursor = 'not-allowed';
        }
    });
    
    // ✏️ LLENAR CAMPOS EDITABLES (Información Técnico Mecánica)
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
            // Estos campos se habilitan/deshabilitan según modo edición
            element.disabled = true; // Inicialmente disabled
        }
    });
    
    // Establecer ID de la ficha
    document.getElementById('fichaId').value = ficha.id;
    
    // Cargar fotos existentes
    cargarFotosExistentes(ficha);
    
    actualizarVistaPrevia();
    
    console.log('✅ Formulario llenado correctamente');
}

function cargarFotosExistentes(ficha) {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewFoto' + i);
        const container = document.getElementById('previewFoto' + i + 'Container');
        const placeholder = container.querySelector('.placeholder');
        const btnRemove = container.parentElement.querySelector('.btn-remove');
        
        if (ficha['foto' + i + '_url']) {
            fotosUrlsExistentes['foto' + i] = ficha['foto' + i + '_url'];
            fotosData['foto' + i] = ficha['foto' + i + '_url'];
            fotosModificadas['foto' + i] = false;
            
            img.src = ficha['foto' + i + '_url'];
            img.style.display = 'block';
            placeholder.style.display = 'none';
            if (btnRemove) btnRemove.style.display = 'flex';
        } else {
            fotosUrlsExistentes['foto' + i] = null;
            fotosData['foto' + i] = null;
            fotosModificadas['foto' + i] = false;
            
            img.src = '';
            img.style.display = 'none';
            placeholder.style.display = 'flex';
            if (btnRemove) btnRemove.style.display = 'none';
        }
    }
    actualizarFotosPreview();
}

function resetearFormulario() {
    document.getElementById('fichaForm').reset();
    document.getElementById('fichaId').value = '';
    
    // 🔒 Re-bloquear campos de vehículo
    bloquearCamposVehiculo();
    
    // 🔒 Deshabilitar campos técnicos
    toggleCamposTecnicos(false);
    
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewFoto' + i);
        const container = document.getElementById('previewFoto' + i + 'Container');
        const placeholder = container.querySelector('.placeholder');
        const btnRemove = container.parentElement.querySelector('.btn-remove');
        const input = document.getElementById('foto' + i);
        
        img.src = '';
        img.style.display = 'none';
        placeholder.style.display = 'flex';
        if (btnRemove) btnRemove.style.display = 'none';
        input.value = '';
        
        fotosData['foto' + i] = null;
        fotosUrlsExistentes['foto' + i] = null;
        fotosModificadas['foto' + i] = false;
    }
    
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    fichaSeleccionada = null;
    isEditing = false;
    
    document.getElementById('btnEditar').style.display = 'none';
    document.getElementById('btnCancelar').style.display = 'none';
}

function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchAlert').style.display = 'none';
    resetearFormulario();
    fichaSeleccionada = null;
    document.getElementById('btnEditar').style.display = 'none';
    document.getElementById('btnCancelar').style.display = 'none';
}

// ============================================
// FUNCIONES DE EDICIÓN
// ============================================

/**
 * ✏️ Activa el modo de edición
 * Solo habilita campos de Información Técnico Mecánica y fotos
 * Los datos del vehículo PERMANECEN BLOQUEADOS
 */
function editarFicha() {
    if (!fichaSeleccionada) {
        mostrarAlerta('⚠️ Primero debe buscar una ficha técnica', 'error');
        return;
    }
    
    console.log('✏️ Activando modo edición...');
    isEditing = true;
    
    // 🔒 MANTENER BLOQUEADOS LOS CAMPOS DE VEHÍCULO
    bloquearCamposVehiculo();
    
    // ✏️ HABILITAR SOLO CAMPOS TÉCNICOS Y FOTOS
    toggleCamposTecnicos(true);
    
    // Cambiar visibilidad de botones
    document.getElementById('btnEditar').style.display = 'none';
    document.getElementById('btnGuardar').style.display = 'inline-flex';
    document.getElementById('btnCancelar').style.display = 'inline-flex';
    
    mostrarAlerta('ℹ️ Editando ficha. Solo puede modificar: Información Técnico Mecánica y Fotos.', 'info');
}

/**
 * ❌ Cancela la edición
 * Restaura datos originales y bloquea campos técnicos
 */
function cancelarEdicion() {
    if (fichaSeleccionada) {
        llenarFormulario(fichaSeleccionada);
    }
    
    // 🔒 DESHABILITAR CAMPOS TÉCNICOS
    toggleCamposTecnicos(false);
    
    // Cambiar visibilidad de botones
    document.getElementById('btnEditar').style.display = 'inline-flex';
    document.getElementById('btnGuardar').style.display = 'none';
    document.getElementById('btnCancelar').style.display = 'inline-flex';
    
    isEditing = false;
    
    mostrarAlerta('ℹ️ Edición cancelada. Se restauraron los datos originales.', 'info');
}

// ============================================
// FUNCIONES DE VISTA PREVIA
// ============================================
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
            const placeholder = container.querySelector('.placeholder');
            const btnRemove = container.parentElement.querySelector('.btn-remove');
            
            img.src = e.target.result;
            img.style.display = 'block';
            placeholder.style.display = 'none';
            if (btnRemove) btnRemove.style.display = 'flex';
            
            const fotoNum = previewId.replace('previewFoto', 'foto');
            fotosData[fotoNum] = e.target.result;
            fotosModificadas[fotoNum] = true;
            
            actualizarFotosPreview();
        };
        reader.readAsDataURL(file);
    }
}

function removeFoto(numero) {
    const img = document.getElementById('previewFoto' + numero);
    const container = document.getElementById('previewFoto' + numero + 'Container');
    const placeholder = container.querySelector('.placeholder');
    const btnRemove = container.parentElement.querySelector('.btn-remove');
    const input = document.getElementById('foto' + numero);
    
    img.src = '';
    img.style.display = 'none';
    placeholder.style.display = 'flex';
    if (btnRemove) btnRemove.style.display = 'none';
    input.value = '';
    
    fotosData['foto' + numero] = null;
    fotosUrlsExistentes['foto' + numero] = null;
    fotosModificadas['foto' + numero] = true;
    
    actualizarFotosPreview();
}

function actualizarFotosPreview() {
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewImg' + i);
        const box = document.getElementById('previewBox' + i);
        const span = box.querySelector('span');
        
        if (fotosData['foto' + i]) {
            img.src = fotosData['foto' + i];
            img.style.display = 'block';
            span.style.display = 'none';
        } else {
            img.style.display = 'none';
            span.style.display = 'block';
        }
    }
}

// ============================================
// FUNCIONES DE GUARDADO
// ============================================
async function guardarFicha(event) {
    event.preventDefault();
    
    if (!fichaSeleccionada) {
        mostrarAlerta('⚠️ No hay ficha seleccionada', 'error');
        return;
    }
    
    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<span>⏳</span><span>Guardando...</span>';
    
    try {
        const fotoUrls = {
            foto1_url: fotosUrlsExistentes.foto1,
            foto2_url: fotosUrlsExistentes.foto2,
            foto3_url: fotosUrlsExistentes.foto3,
            foto4_url: fotosUrlsExistentes.foto4
        };
        
        const bucketName = 'fichas-tecnicas';
        
        // Subir fotos modificadas
        for (let i = 1; i <= 4; i++) {
            if (fotosModificadas['foto' + i] && fotosData['foto' + i]) {
                const base64Data = fotosData['foto' + i];
                let blob;
                
                if (base64Data.startsWith('http')) {
                    const response = await fetch(base64Data);
                    blob = await response.blob();
                } else {
                    blob = await fetch(base64Data).then(function(r) { return r.blob(); });
                }
                
                const fileName = 'ficha_' + Date.now() + '_foto' + i + '_' + fichaSeleccionada.placa + '.jpg';
                
                const { data: uploadData, error: uploadError } = await supabaseClient
                    .storage
                    .from(bucketName)
                    .upload(fileName, blob, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (uploadError) {
                    console.error('Error subiendo foto ' + i + ':', uploadError);
                    throw uploadError;
                }
                
                const { data: urlData } = supabaseClient
                    .storage
                    .from(bucketName)
                    .getPublicUrl(fileName);
                
                fotoUrls['foto' + i + '_url'] = urlData.publicUrl;
                console.log('✅ Foto ' + i + ' subida:', urlData.publicUrl);
            }
        }
        
        // ✅ ACTUALIZAR SOLO CAMPOS EDITABLES (NO datos del vehículo)
        const fichaActualizada = {
            // Información Técnico Mecánica
            causa: document.getElementById('causa').value.trim() || null,
            mecanica: document.getElementById('mecanica').value.trim() || null,
            diagnostico: document.getElementById('diagnostico').value.trim() || null,
            ubicacion: document.getElementById('ubicacion').value.trim() || null,
            tapiceria: document.getElementById('tapiceria').value.trim() || null,
            cauchos: document.getElementById('cauchos').value.trim() || null,
            luces: document.getElementById('luces').value.trim() || null,
            observaciones: document.getElementById('observaciones').value.trim() || null,
            
            // URLs de fotos
            foto1_url: fotoUrls.foto1_url,
            foto2_url: fotoUrls.foto2_url,
            foto3_url: fotoUrls.foto3_url,
            foto4_url: fotoUrls.foto4_url,
            
            // Metadatos
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Actualizando ficha ID:', fichaSeleccionada.id);
        console.log('📝 Campos actualizados:', Object.keys(fichaActualizada));
        
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
        
        // Actualizar ficha seleccionada con nuevos datos
        fichaSeleccionada = Object.assign({}, fichaSeleccionada, data[0]);
        
        mostrarAlerta('✅ Ficha técnica actualizada exitosamente', 'success');
        
        // Limpiar formulario después de guardar
        setTimeout(function() {
            limpiarTodoParaNuevaBusqueda();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error en guardarFicha:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '<span>💾</span><span>Guardar Cambios</span>';
    }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function limpiarTodoParaNuevaBusqueda() {
    console.log('🧹 Limpiando formulario para nueva búsqueda...');
    
    document.getElementById('searchInput').value = '';
    document.getElementById('fichaForm').reset();
    document.getElementById('fichaId').value = '';
    
    // 🔒 Re-bloquear todos los campos
    bloquearCamposVehiculo();
    toggleCamposTecnicos(false);
    
    document.getElementById('btnEditar').style.display = 'none';
    document.getElementById('btnGuardar').style.display = 'none';
    document.getElementById('btnCancelar').style.display = 'none';
    
    fichaSeleccionada = null;
    isEditing = false;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    mostrarAlerta('ℹ️ Ingrese placa, facsímil, serial o N° identificación para buscar una ficha', 'info');
    
    console.log('✅ Formulario limpiado, listo para nueva búsqueda');
}

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

function configurarBotones() {
    const btnEditar = document.getElementById('btnEditar');
    const btnGuardar = document.getElementById('btnGuardar');
    const btnCancelar = document.getElementById('btnCancelar');
    const logoutBtn = document.getElementById('logoutBtn');
    
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
    
    cargarUsuario();
}

async function cargarUsuario() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user && session.user.email) {
            document.getElementById('userEmail').textContent = session.user.email;
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}

// ============================================
// FIN DEL MÓDULO
// ============================================
console.log('✅ Módulo ficha-modificar.js cargado correctamente');
console.log('🔒 Campos de vehículo BLOQUEADOS (NO EDITABLES)');
console.log('✏️ Campos editables: Información Técnico Mecánica + Fotos');
