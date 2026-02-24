// ============================================
// MODIFICAR VEHÍCULO - TABLA VEHICULOS
// BÚSQUEDA EXACTA
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

// Vehículo seleccionado
let vehiculoSeleccionado = null;
let isEditing = false;

// ✅ CAMPOS QUE NO SE PUEDEN MODIFICAR (siempre disabled)
const camposNoEditables = [
    'placa',
    'facsimil',
    's_carroceria',
    's_motor',
    'marca',
    'modelo',
    'tipo',
    'clase',
    'color',
    'estatus',
    'situacion'
];

// ============================================
// FUNCIONES DE BÚSQUEDA EXACTA
// ============================================
async function buscarFicha() {
    const searchInput = document.getElementById('searchInput');
    const searchAlert = document.getElementById('searchAlert');
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando vehículo en tabla vehiculos (BÚSQUEDA EXACTA):', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    const btnSearch = document.getElementById('btnSearch');
    btnSearch.disabled = true;
    btnSearch.classList.add('searching');
    
    try {
        // ✅ BÚSQUEDA EXACTA EN TABLA vehiculos
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .select('*')
            .or(`
                placa.eq.${searchTerm},
                facsimil.eq.${searchTerm},
                s_carroceria.eq.${searchTerm},
                s_motor.eq.${searchTerm},
                n_identificacion.eq.${searchTerm}
            `.replace(/\s/g, ''))
            .limit(1);
        
        if (error) {
            console.error('❌ Error en la búsqueda:', error);
            mostrarAlerta('❌ Error al buscar: ' + error.message, 'error');
            return;
        }
        
        console.log('📊 Resultado:', data ? data.length : 0, 'vehículo(s) encontrado(s)');
        
        if (!data || data.length === 0) {
            mostrarAlerta(
                '❌ No se encontró ningún vehículo con búsqueda EXACTA para: ' + searchTerm + 
                '\n💡 Verifique que los datos coincidan exactamente con la base de datos', 
                'error'
            );
            vehiculoSeleccionado = null;
            resetearFormulario();
            return;
        }
        
        vehiculoSeleccionado = data[0];
        console.log('✅ Vehículo encontrado:', vehiculoSeleccionado);
        llenarFormulario(vehiculoSeleccionado);
        mostrarAlerta(
            '✅ Vehículo encontrado: ' + vehiculoSeleccionado.marca + ' ' + 
            vehiculoSeleccionado.modelo + ' - Placa: ' + vehiculoSeleccionado.placa, 
            'success'
        );
        actualizarVistaPrevia();
        
    } catch (error) {
        console.error('❌ Error en buscarFicha:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        btnSearch.disabled = false;
        btnSearch.classList.remove('searching');
    }
}

// ============================================
// FUNCIONES DE LLENADO DE FORMULARIO
// ============================================
function llenarFormulario(vehiculo) {
    console.log('📝 Llenando formulario con vehículo:', vehiculo);
    
    const mapeoCampos = {
        'marca': 'marca',
        'modelo': 'modelo',
        'tipo': 'tipo',
        'clase': 'clase',
        'color': 'color',
        'ano': 'ano',
        's_carroceria': 's_carroceria',
        's_motor': 's_motor',
        'placa': 'placa',
        'facsimil': 'facsimil',
        'n_identificacion': 'n_identificacion',
        'situacion': 'situacion',
        'estatus': 'estatus',
        'unidad_administrativa': 'unidad_administrativa',
        'redip': 'redip',
        'ccpe': 'ccpe',
        'epm': 'epm',
        'epp': 'epp',
        'ubicacion_fisica': 'ubicacion_fisica',
        'asignacion': 'asignacion',
        'certificado_origen': 'certificado_origen',
        'fecha_inspeccion': 'fecha_inspeccion',
        'n_tramite': 'n_tramite',
        'ubicacion_titulo': 'ubicacion_titulo',
        'observacion': 'observacion',
        'observacion_extra': 'observacion_extra'
    };
    
    Object.entries(mapeoCampos).forEach(function(pair) {
        const dbField = pair[0];
        const formField = pair[1];
        const element = document.getElementById(formField);
        
        if (element && vehiculo[dbField] !== undefined && vehiculo[dbField] !== null) {
            if (element.tagName === 'SELECT') {
                const options = Array.from(element.options);
                const dbValue = String(vehiculo[dbField]).toUpperCase().trim();
                
                // Búsqueda flexible para selects (con/sin espacios)
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
            } else if (element.type === 'date' && vehiculo[dbField]) {
                // Manejo especial para fechas
                const fecha = new Date(vehiculo[dbField]);
                if (!isNaN(fecha.getTime())) {
                    element.value = fecha.toISOString().split('T')[0];
                }
            } else {
                element.value = vehiculo[dbField];
            }
        }
    });
    
    document.getElementById('vehicleId').value = vehiculo.id;
    actualizarVistaPrevia();
    console.log('✅ Formulario llenado correctamente');
}

function resetearFormulario() {
    const form = document.getElementById('vehicleForm');
    if (form) form.reset();
    
    const vehicleId = document.getElementById('vehicleId');
    if (vehicleId) vehicleId.value = '';
    
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('previewFoto' + i);
        const container = document.getElementById('previewFoto' + i + 'Container');
        if (container) {
            const placeholder = container.querySelector('.placeholder');
            const btnRemove = container.parentElement.querySelector('.btn-remove');
            if (img) {
                img.src = '';
                img.style.display = 'none';
            }
            if (placeholder) placeholder.style.display = 'flex';
            if (btnRemove) btnRemove.style.display = 'none';
        }
        const input = document.getElementById('foto' + i);
        if (input) input.value = '';
        
        fotosData['foto' + i] = null;
        fotosUrlsExistentes['foto' + i] = null;
        fotosModificadas['foto' + i] = false;
    }
    
    actualizarVistaPrevia();
    actualizarFotosPreview();
    toggleFormFields(false);
}

function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    const searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    resetearFormulario();
    vehiculoSeleccionado = null;
    mostrarAlerta('ℹ️ Ingrese Placa, ID, Facsímil o Serial para buscar', 'info');
}

// ============================================
// FUNCIONES DE EDICIÓN
// ============================================
function toggleFormFields(enable) {
    const fields = document.querySelectorAll('#vehicleForm input, #vehicleForm select, #vehicleForm textarea');
    
    fields.forEach(function(field) {
        // ✅ NUNCA HABILITAR CAMPOS DE IDENTIFICACIÓN ÚNICA
        if (camposNoEditables.includes(field.id)) {
            field.disabled = true;
            const formGroup = field.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('locked');
            }
        } else if (field.id !== 'vehicleId') {
            field.disabled = !enable;
            const formGroup = field.closest('.form-group');
            if (formGroup) {
                formGroup.classList.toggle('locked', !enable);
            }
        }
    });
    
    const form = document.getElementById('vehicleForm');
    if (form) {
        form.classList.toggle('form-disabled', !enable);
    }
    isEditing = enable;
}

function editarFicha() {
    if (!vehiculoSeleccionado) {
        mostrarAlerta('⚠️ Primero debe buscar un vehículo', 'error');
        return;
    }
    
    toggleFormFields(true);
    document.getElementById('btnEdit').style.display = 'none';
    document.getElementById('btnSubmit').style.display = 'inline-flex';
    document.getElementById('btnCancel').disabled = false;
    
    mostrarAlerta('ℹ️ Editando vehículo. Los campos marcados con 🔒 NO se pueden modificar.', 'info');
}

function cancelarEdicion() {
    if (vehiculoSeleccionado) {
        llenarFormulario(vehiculoSeleccionado);
    }
    toggleFormFields(false);
    document.getElementById('btnEdit').style.display = 'inline-flex';
    document.getElementById('btnSubmit').style.display = 'none';
    document.getElementById('btnCancel').disabled = true;
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
        's_carroceria': 'previewSerialCarroceria',
        'color': 'previewColor',
        'placa': 'previewPlaca',
        'facsimil': 'previewFacsimilar',
        's_motor': 'previewSerialMotor',
        'unidad_administrativa': 'previewDependencia',
        'estatus': 'previewEstatus',
        'causa': 'previewCausa',
        'mecanica': 'previewMecanica',
        'diagnostico': 'previewDiagnostico',
        'ubicacion_fisica': 'previewUbicacion',
        'observacion': 'previewObservaciones'
    };
    
    Object.keys(campos).forEach(function(formField) {
        const previewField = campos[formField];
        const element = document.getElementById(formField);
        const preview = document.getElementById(previewField);
        
        if (element && preview) {
            preview.textContent = element.value || '';
            if (formField === 'observacion') {
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
    
    if (!vehiculoSeleccionado) {
        mostrarAlerta('⚠️ No hay vehículo seleccionado', 'error');
        return;
    }
    
    const form = document.getElementById('vehicleForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        mostrarAlerta('⚠️ Complete todos los campos requeridos', 'error');
        return;
    }
    
    const btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.disabled = true;
    btnSubmit.querySelector('.btn-text').style.display = 'none';
    btnSubmit.querySelector('.btn-loader').style.display = 'inline';
    
    try {
        // ✅ PREPARAR DATOS PARA ACTUALIZAR (solo campos editables)
        const vehiculoActualizado = {
            unidad_administrativa: document.getElementById('unidad_administrativa').value.trim(),
            redip: document.getElementById('redip').value.trim(),
            ccpe: document.getElementById('ccpe').value.trim(),
            epm: document.getElementById('epm').value.trim(),
            epp: document.getElementById('epp').value.trim(),
            ubicacion_fisica: document.getElementById('ubicacion_fisica').value.trim(),
            asignacion: document.getElementById('asignacion').value.trim(),
            certificado_origen: document.getElementById('certificado_origen').value.trim(),
            fecha_inspeccion: document.getElementById('fecha_inspeccion').value,
            n_tramite: document.getElementById('n_tramite').value.trim(),
            ubicacion_titulo: document.getElementById('ubicacion_titulo').value.trim(),
            observacion: document.getElementById('observacion').value.trim(),
            observacion_extra: document.getElementById('observacion_extra').value.trim(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Actualizando vehículo ID:', vehiculoSeleccionado.id);
        console.log('Datos a actualizar:', vehiculoActualizado);
        
        const { data, error } = await supabaseClient
            .from('vehiculos')
            .update(vehiculoActualizado)
            .eq('id', vehiculoSeleccionado.id)
            .select();
        
        if (error) {
            console.error('❌ Error al actualizar:', error);
            mostrarAlerta('❌ Error al guardar: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Vehículo actualizado:', data);
        mostrarAlerta('✅ Vehículo actualizado exitosamente', 'success');
        vehiculoSeleccionado = Object.assign({}, vehiculoSeleccionado, data[0]);
        
        setTimeout(function() {
            limpiarTodoParaNuevaBusqueda();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error en guardarFicha:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.querySelector('.btn-text').style.display = 'inline';
        btnSubmit.querySelector('.btn-loader').style.display = 'none';
    }
}

// NUEVA FUNCIÓN: LIMPIAR TODO PARA NUEVA BÚSQUEDA
function limpiarTodoParaNuevaBusqueda() {
    console.log('🧹 Limpiando formulario para nueva búsqueda...');
    document.getElementById('searchInput').value = '';
    document.getElementById('vehicleForm').reset();
    document.getElementById('vehicleId').value = '';
    toggleFormFields(false);
    document.getElementById('btnEdit').style.display = 'inline-flex';
    document.getElementById('btnSubmit').style.display = 'none';
    document.getElementById('btnCancel').disabled = true;
    vehiculoSeleccionado = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarAlerta('ℹ️ Ingrese placa, facsímil o serial para buscar un vehículo', 'info');
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
    console.log('🚀 Inicializando modificación de vehículos...');
    
    actualizarVistaPrevia();
    actualizarFotosPreview();
    
    const inputs = document.querySelectorAll('#vehicleForm input, #vehicleForm select, #vehicleForm textarea');
    inputs.forEach(function(input) {
        input.addEventListener('input', actualizarVistaPrevia);
    });
    
    const btnEdit = document.getElementById('btnEdit');
    const btnSubmit = document.getElementById('btnSubmit');
    const btnCancel = document.getElementById('btnCancel');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (btnEdit) {
        btnEdit.addEventListener('click', editarFicha);
    }
    
    if (btnSubmit) {
        btnSubmit.addEventListener('click', guardarFicha);
    }
    
    if (btnCancel) {
        btnCancel.addEventListener('click', cancelarEdicion);
    }
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
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
    console.log('✅ Modificación de vehículos inicializada');
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
