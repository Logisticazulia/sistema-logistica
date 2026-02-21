// ============================================
// MODIFICAR FICHA TÉCNICA - LÓGICA COMPLETA
// ============================================

// Configuración de Supabase
const supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_KEY
);

// Array para almacenar las imágenes en base64
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

// ✅ CAMPOS QUE NO SE PUEDEN MODIFICAR (siempre disabled)
const camposNoEditables = ['placa', 'facsimilar', 'serialCarroceria', 'serialMotor', 'marca', 'modelo'];

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
        
        llenarFormulario(fichaSeleccionada);
        
        mostrarAlerta('✅ Ficha técnica encontrada: ' + fichaSeleccionada.marca + ' ' + fichaSeleccionada.modelo + ' - Placa: ' + fichaSeleccionada.placa, 'success');
        
        actualizarVistaPrevia();
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
    
    Object.entries(mapeoCampos).forEach(function(pair) {
        const dbField = pair[0];
        const formField = pair[1];
        const element = document.getElementById(formField);
        if (element && ficha[dbField]) {
            if (element.tagName === 'SELECT') {
                const options = Array.from(element.options);
                const dbValue = ficha[dbField].toUpperCase().trim();
                
                // Búsqueda flexible para Clase (con/sin espacios)
                let matchingOption = options.find(function(opt) {
                    const optValue = opt.value.toUpperCase().trim();
                    if (optValue === dbValue) return true;
                    if (optValue.replace(/\s/g, '') === dbValue.replace(/\s/g, '')) return true;
                    return false;
                });
                
                if (matchingOption) {
                    element.value = matchingOption.value;
                    console.log('✅ Select asignado:', formField, '=', matchingOption.value);
                } else {
                    // Si no encuentra, agregar la opción dinámicamente
                    const newOption = document.createElement('option');
                    newOption.value = dbValue;
                    newOption.textContent = dbValue;
                    newOption.selected = true;
                    element.appendChild(newOption);
                    console.log('⚠️ Opción agregada dinámicamente:', formField, '=', dbValue);
                }
            } else {
                element.value = ficha[dbField];
            }
        }
    });
    
    document.getElementById('fichaId').value = ficha.id;
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
    toggleFormFields(false);
}

function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchAlert').style.display = 'none';
    resetearFormulario();
    fichaSeleccionada = null;
}

// ============================================
// FUNCIONES DE EDICIÓN
// ============================================

// ✅ CAMBIO 4: TOGGLE FORM FIELDS EXCLUYE CAMPOS NO EDITABLES
function toggleFormFields(enable) {
    const fields = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    fields.forEach(function(field) {
        // ✅ NUNCA HABILITAR CAMPOS DE IDENTIFICACIÓN ÚNICA
        if (camposNoEditables.includes(field.id)) {
            field.disabled = true;
        } else if (field.id !== 'fichaId') {
            field.disabled = !enable;
        }
    });
    
    const form = document.getElementById('fichaForm');
    form.classList.toggle('form-disabled', !enable);
    isEditing = enable;
}

function editarFicha() {
    if (!fichaSeleccionada) {
        mostrarAlerta('⚠️ Primero debe buscar una ficha técnica', 'error');
        return;
    }
    
    toggleFormFields(true);
    
    document.getElementById('btnEditar').style.display = 'none';
    document.getElementById('btnGuardar').style.display = 'inline-flex';
    document.getElementById('btnCancelar').disabled = false;
    
    mostrarAlerta('ℹ️ Editando ficha. Los campos Placa, Facsímil, Serial Carrocería y Serial Motor NO se pueden modificar.', 'info');
}

function cancelarEdicion() {
    if (fichaSeleccionada) {
        llenarFormulario(fichaSeleccionada);
    }
    toggleFormFields(false);
    
    document.getElementById('btnEditar').style.display = 'inline-flex';
    document.getElementById('btnGuardar').style.display = 'none';
    document.getElementById('btnCancelar').disabled = true;
    
    mostrarAlerta('ℹ️ Edición cancelada. Los cambios no fueron guardados.', 'info');
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
            preview.textContent = element.value || '';
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
    
    const form = document.getElementById('fichaForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }
    
    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = '⏳ Guardando...';
    
    try {
        const fotoUrls = {
            foto1_url: fotosUrlsExistentes.foto1,
            foto2_url: fotosUrlsExistentes.foto2,
            foto3_url: fotosUrlsExistentes.foto3,
            foto4_url: fotosUrlsExistentes.foto4
        };
        
        const bucketName = 'fichas-tecnicas';
        
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
        
        const fichaActualizada = {
            marca: document.getElementById('marca').value.trim().toUpperCase(),
            modelo: document.getElementById('modelo').value.trim().toUpperCase(),
            tipo: document.getElementById('tipo').value.trim().toUpperCase(),
            clase: document.getElementById('clase').value.trim().toUpperCase(),
            color: document.getElementById('color').value.trim().toUpperCase(),
            s_carroceria: document.getElementById('serialCarroceria').value.trim().toUpperCase(),
            s_motor: document.getElementById('serialMotor').value.trim().toUpperCase(),
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            facsimil: document.getElementById('facsimilar').value.trim().toUpperCase(),
            estatus_ficha: document.getElementById('estatus').value.trim().toUpperCase(),
            dependencia: document.getElementById('dependencia').value.trim(),
            causa: document.getElementById('causa').value.trim() || null,
            mecanica: document.getElementById('mecanica').value.trim() || null,
            diagnostico: document.getElementById('diagnostico').value.trim() || null,
            ubicacion: document.getElementById('ubicacion').value.trim() || null,
            tapiceria: document.getElementById('tapiceria').value.trim() || null,
            cauchos: document.getElementById('cauchos').value.trim() || null,
            luces: document.getElementById('luces').value.trim() || null,
            observaciones: document.getElementById('observaciones').value.trim() || null,
            foto1_url: fotoUrls.foto1_url,
            foto2_url: fotoUrls.foto2_url,
            foto3_url: fotoUrls.foto3_url,
            foto4_url: fotoUrls.foto4_url,
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Actualizando ficha ID:', fichaSeleccionada.id);
        
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
        mostrarAlerta('✅ Ficha técnica actualizada exitosamente', 'success');
        
        fichaSeleccionada = Object.assign({}, fichaSeleccionada, data[0]);
        
        // ✅ CAMBIO 5: LIMPIAR FORMULARIO DESPUÉS DE GUARDAR
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

// ✅ NUEVA FUNCIÓN: LIMPIAR TODO PARA NUEVA BÚSQUEDA
function limpiarTodoParaNuevaBusqueda() {
    console.log('🧹 Limpiando formulario para nueva búsqueda...');
    
    document.getElementById('searchInput').value = '';
    document.getElementById('fichaForm').reset();
    document.getElementById('fichaId').value = '';
    
    toggleFormFields(false);
    
    document.getElementById('btnEditar').style.display = 'inline-flex';
    document.getElementById('btnGuardar').style.display = 'none';
    document.getElementById('btnCancelar').disabled = true;
    
    fichaSeleccionada = null;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    mostrarAlerta('ℹ️ Ingrese placa, facsímil o serial para buscar una ficha', 'info');
    
    console.log('✅ Formulario limpiado, listo para nueva búsqueda');
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

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

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando modificación de fichas técnicas...');
    
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    const inputs = document.querySelectorAll('#fichaForm input, #fichaForm select, #fichaForm textarea');
    inputs.forEach(function(input) {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
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
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarFicha();
            }
        });
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
    
    console.log('✅ Modificación de fichas inicializada');
});

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
