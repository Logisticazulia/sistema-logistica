// ============================================
// MODIFICAR FICHA TÉCNICA - PLANILLA
// BÚSQUEDA EXACTA + SIN ERRORES DE FOTOS
// ============================================

// Configuración de Supabase
const supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_KEY
);

// Ficha seleccionada
let fichaSeleccionada = null;
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
    'estatus'
];

// ============================================
// FUNCIONES DE BÚSQUEDA EXACTA
// ============================================

// ✅ FUNCIÓN PARA LIMPIAR TEXTO DE BÚSQUEDA
function limpiarTextoBusqueda(texto) {
    if (!texto) return '';
    return texto.toString().trim().toUpperCase();
}

// ✅ BUSCAR FICHA CON BÚSQUEDA EXACTA
async function buscarFicha() {
    const searchInput = document.getElementById('searchUniversal');
    const searchAlert = document.getElementById('alertInfo');
    
    if (!searchInput) {
        mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
        return;
    }
    
    // ✅ LIMPIAR TEXTO DE BÚSQUEDA
    const searchTerm = limpiarTextoBusqueda(searchInput.value);
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando ficha técnica (BÚSQUEDA EXACTA):', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    const btnSearch = document.getElementById('btnSearch');
    btnSearch.disabled = true;
    btnSearch.classList.add('searching');
    
    try {
        // ✅ BÚSQUEDA EXACTA CON .eq. (NO PARCIAL)
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
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
        
        console.log('📊 Resultado de búsqueda:', data ? data.length : 0, 'registro(s)');
        
        if (!data || data.length === 0) {
            mostrarAlerta(
                '❌ No se encontró ninguna ficha con búsqueda EXACTA para: ' + searchTerm + 
                '\n💡 Verifique que los datos coincidan exactamente con la base de datos', 
                'error'
            );
            fichaSeleccionada = null;
            resetearFormulario();
            return;
        }
        
        fichaSeleccionada = data[0];
        console.log('✅ Ficha encontrada:', fichaSeleccionada);
        llenarFormulario(fichaSeleccionada);
        
        mostrarAlerta(
            '✅ Ficha encontrada: ' + fichaSeleccionada.marca + ' ' + 
            fichaSeleccionada.modelo + ' - Placa: ' + fichaSeleccionada.placa, 
            'success'
        );
        
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
function llenarFormulario(ficha) {
    console.log('📝 Llenando formulario con ficha:', ficha);
    
    const mapeoCampos = {
        'marca': 'marca',
        'modelo': 'modelo',
        'tipo': 'tipo',
        'clase': 'clase',
        'color': 'color',
        's_carroceria': 's_carroceria',
        's_motor': 's_motor',
        'placa': 'placa',
        'facsimil': 'facsimil',
        'n_identificacion': 'n_identificacion',
        'estatus_ficha': 'estatus',
        'situacion': 'situacion',
        'dependencia': 'unidad_administrativa',
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
        
        if (element && ficha[dbField]) {
            if (element.tagName === 'SELECT') {
                const options = Array.from(element.options);
                const dbValue = ficha[dbField].toUpperCase().trim();
                
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
    
    document.getElementById('vehicleId').value = ficha.id;
    console.log('✅ Formulario llenado correctamente');
}

function resetearFormulario() {
    const form = document.getElementById('vehicleForm');
    if (form) form.reset();
    
    const vehicleId = document.getElementById('vehicleId');
    if (vehicleId) vehicleId.value = '';
    
    toggleFormFields(false);
}

function limpiarBusqueda() {
    const searchInput = document.getElementById('searchUniversal');
    if (searchInput) searchInput.value = '';
    
    resetearFormulario();
    fichaSeleccionada = null;
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
    if (!fichaSeleccionada) {
        mostrarAlerta('⚠️ Primero debe buscar una ficha técnica', 'error');
        return;
    }
    
    toggleFormFields(true);
    document.getElementById('btnEdit').style.display = 'none';
    document.getElementById('btnSubmit').style.display = 'inline-flex';
    document.getElementById('btnCancel').disabled = false;
    
    mostrarAlerta('ℹ️ Editando ficha. Los campos marcados con 🔒 NO se pueden modificar.', 'info');
}

function cancelarEdicion() {
    if (fichaSeleccionada) {
        llenarFormulario(fichaSeleccionada);
    }
    toggleFormFields(false);
    document.getElementById('btnEdit').style.display = 'inline-flex';
    document.getElementById('btnSubmit').style.display = 'none';
    document.getElementById('btnCancel').disabled = true;
    mostrarAlerta('ℹ️ Edición cancelada. Los cambios no fueron guardados.', 'info');
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
    
    const btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.disabled = true;
    btnSubmit.querySelector('.btn-text').style.display = 'none';
    btnSubmit.querySelector('.btn-loader').style.display = 'inline';
    
    try {
        const fichaActualizada = {
            marca: document.getElementById('marca').value.trim().toUpperCase(),
            modelo: document.getElementById('modelo').value.trim().toUpperCase(),
            tipo: document.getElementById('tipo').value.trim().toUpperCase(),
            clase: document.getElementById('clase').value.trim().toUpperCase(),
            color: document.getElementById('color').value.trim().toUpperCase(),
            s_carroceria: document.getElementById('s_carroceria').value.trim().toUpperCase(),
            s_motor: document.getElementById('s_motor').value.trim().toUpperCase(),
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            facsimil: document.getElementById('facsimil').value.trim().toUpperCase(),
            estatus_ficha: document.getElementById('estatus').value.trim().toUpperCase(),
            situacion: document.getElementById('situacion').value.trim().toUpperCase(),
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

function limpiarTodoParaNuevaBusqueda() {
    console.log('🧹 Limpiando formulario para nueva búsqueda...');
    const searchInput = document.getElementById('searchUniversal');
    if (searchInput) searchInput.value = '';
    
    resetearFormulario();
    fichaSeleccionada = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    mostrarAlerta('ℹ️ Ingrese placa, facsímil o serial para buscar una ficha', 'info');
    console.log('✅ Formulario limpiado, listo para nueva búsqueda');
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('alert' + tipo.charAt(0).toUpperCase() + tipo.slice(1));
    if (!alertDiv) return;
    
    const messageSpan = alertDiv.querySelector('span:last-child');
    if (messageSpan) {
        messageSpan.textContent = mensaje;
    }
    
    // Ocultar todas las alertas primero
    document.querySelectorAll('.alert').forEach(function(alert) {
        alert.style.display = 'none';
    });
    
    alertDiv.style.display = 'flex';
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
    
    // ✅ NO LLAMAR actualizarFotosPreview() - NO EXISTEN ESOS ELEMENTOS EN ESTE HTML
    
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
    
    const searchInput = document.getElementById('searchUniversal');
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
    console.log('✅ Modificación de fichas inicializada');
});

async function cargarUsuario() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user && session.user.email) {
            const userEmail = document.getElementById('userEmail');
            if (userEmail) {
                userEmail.textContent = session.user.email;
            }
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}
