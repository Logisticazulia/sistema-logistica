// ============================================
// MODIFICAR VEHÍCULO - TABLA VEHICULOS
// TODOS LOS CAMPOS EDITABLES + BÚSQUEDA EXACTA
// ============================================

// Configuración de Supabase
const supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_KEY
);

// Vehículo seleccionado
let vehiculoSeleccionado = null;
let isEditing = false;

// ✅ TODOS LOS CAMPOS SON EDITABLES (array vacío)
const camposNoEditables = [];

// ============================================
// FUNCIONES DE BÚSQUEDA EXACTA
// ============================================
async function buscarFicha() {
    const searchInput = document.getElementById('searchUniversal');
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
        // ✅ BÚSQUEDA EXACTA EN TABLA vehiculos CON .eq.
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
    
    // ✅ MAPEO DE CAMPOS SEGÚN TABLA vehiculos
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
        'observacion': 'observacion',
        'certificado_origen': 'certificado_origen',
        'fecha_inspeccion': 'fecha_inspeccion',
        'n_tramite': 'n_tramite',
        'ubicacion_titulo': 'ubicacion_titulo',
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
    vehiculoSeleccionado = null;
    mostrarAlerta('ℹ️ Ingrese Placa, ID, Facsímil o Serial para buscar', 'info');
}

// ============================================
// FUNCIONES DE EDICIÓN - TODOS LOS CAMPOS EDITABLES
// ============================================
function toggleFormFields(enable) {
    const fields = document.querySelectorAll('#vehicleForm input, #vehicleForm select, #vehicleForm textarea');
    
    fields.forEach(function(field) {
        // ✅ TODOS LOS CAMPOS SON EDITABLES (camposNoEditables está vacío)
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
    
    mostrarAlerta('ℹ️ Editando vehículo. TODOS los campos pueden ser modificados.', 'info');
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
// FUNCIONES DE GUARDADO - ACTUALIZA TODOS LOS CAMPOS
// ============================================
async function guardarFicha(event) {
    event.preventDefault();
    
    if (!vehiculoSeleccionado) {
        mostrarAlerta('⚠️ No hay vehículo seleccionado', 'error');
        return;
    }
    
    const btnSubmit = document.getElementById('btnSubmit');
    btnSubmit.disabled = true;
    btnSubmit.querySelector('.btn-text').style.display = 'none';
    btnSubmit.querySelector('.btn-loader').style.display = 'inline';
    
    try {
        // ✅ ACTUALIZAR TODOS LOS CAMPOS DE LA TABLA vehiculos
        const vehiculoActualizado = {
            marca: document.getElementById('marca').value.trim().toUpperCase(),
            modelo: document.getElementById('modelo').value.trim().toUpperCase(),
            tipo: document.getElementById('tipo').value.trim().toUpperCase(),
            clase: document.getElementById('clase').value.trim().toUpperCase(),
            color: document.getElementById('color').value.trim().toUpperCase(),
            ano: document.getElementById('ano').value.trim(),
            s_carroceria: document.getElementById('s_carroceria').value.trim().toUpperCase(),
            s_motor: document.getElementById('s_motor').value.trim().toUpperCase(),
            placa: document.getElementById('placa').value.trim().toUpperCase(),
            facsimil: document.getElementById('facsimil').value.trim().toUpperCase(),
            n_identificacion: document.getElementById('n_identificacion').value.trim().toUpperCase(),
            situacion: document.getElementById('situacion').value.trim().toUpperCase(),
            estatus: document.getElementById('estatus').value.trim().toUpperCase(),
            unidad_administrativa: document.getElementById('unidad_administrativa').value.trim(),
            redip: document.getElementById('redip').value.trim(),
            ccpe: document.getElementById('ccpe').value.trim(),
            epm: document.getElementById('epm').value.trim(),
            epp: document.getElementById('epp').value.trim(),
            ubicacion_fisica: document.getElementById('ubicacion_fisica').value.trim(),
            asignacion: document.getElementById('asignacion').value.trim(),
            observacion: document.getElementById('observacion').value.trim(),
            certificado_origen: document.getElementById('certificado_origen').value.trim(),
            fecha_inspeccion: document.getElementById('fecha_inspeccion').value,
            n_tramite: document.getElementById('n_tramite').value.trim(),
            ubicacion_titulo: document.getElementById('ubicacion_titulo').value.trim(),
            observacion_extra: document.getElementById('observacion_extra').value.trim(),
            updated_at: new Date().toISOString()
        };
        
        console.log('📝 Actualizando vehículo ID:', vehiculoSeleccionado.id);
        console.log('Datos actualizados:', vehiculoActualizado);
        
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

function limpiarTodoParaNuevaBusqueda() {
    console.log('🧹 Limpiando formulario para nueva búsqueda...');
    document.getElementById('searchUniversal').value = '';
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
    console.log('🚀 Inicializando modificación de vehículos...');
    
    toggleFormFields(false);
    
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
    console.log('✅ Modificación de vehículos inicializada');
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
