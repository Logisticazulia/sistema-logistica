// ============================================
// MODIFICAR VEHÍCULO - LÓGICA COMPLETA (TABLA VEHICULOS)
// ============================================

// Configuración de Supabase
const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_KEY
);

// Estado global
let vehiculoSeleccionado = null;
let isEditing = false;

// ============================================
// FUNCIONES DE BÚSQUEDA
// ============================================
async function buscarVehiculo() {
  const searchInput = document.getElementById('searchUniversal');
  const searchTerm = searchInput.value.trim().toUpperCase();
  
  // Limpiar alertas previas
  ocultarTodasLasAlertas();
  
  if (!searchTerm) {
    mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
    return;
  }
  
  console.log('🔍 Buscando vehículo:', searchTerm);
  mostrarAlerta('⏳ Buscando en base de datos...', 'info');
  
  const btnSearch = document.getElementById('btnSearch');
  btnSearch.disabled = true;
  btnSearch.classList.add('searching');
  
  try {
    // ✅ BÚSQUEDA EXACTA POR 5 CAMPOS (incluye facsimil)
    const { data, error } = await supabaseClient
      .from('vehiculos')
      .select('*')
      .or(`placa.eq.${searchTerm},facsimil.eq.${searchTerm},s_carroceria.eq.${searchTerm},s_motor.eq.${searchTerm},n_identificacion.eq.${searchTerm}`)
      .limit(1);
    
    if (error) {
      console.error('❌ Error en la búsqueda:', error);
      mostrarAlerta('❌ Error al buscar: ' + error.message, 'error');
      return;
    }
    
    if (!data || data.length === 0) {
      mostrarAlerta('❌ No se encontró ningún vehículo con: ' + searchTerm, 'error');
      vehiculoSeleccionado = null;
      resetearFormulario();
      return;
    }
    
    vehiculoSeleccionado = data[0];
    console.log('✅ Vehículo encontrado:', vehiculoSeleccionado);
    
    llenarFormulario(vehiculoSeleccionado);
    mostrarAlerta(
      `✅ Vehículo encontrado: ${vehiculoSeleccionado.marca} ${vehiculoSeleccionado.modelo} - Placa: ${vehiculoSeleccionado.placa}`, 
      'success'
    );
    
    // Habilitar botones de edición
    document.getElementById('btnEdit').style.display = 'inline-flex';
    document.getElementById('btnCancel').disabled = false;
    
  } catch (error) {
    console.error('❌ Error en buscarVehiculo:', error);
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
  
  // Mapeo completo de campos de BD a formulario (incluye facsimil)
  const mapeoCampos = {
    'marca': 'marca',
    'modelo': 'modelo',
    'tipo': 'tipo',
    'clase': 'clase',
    'ano': 'ano',
    'color': 'color',
    's_carroceria': 's_carroceria',
    's_motor': 's_motor',
    'placa': 'placa',
    'facsimil': 'facsimil',  // ✅ Campo agregado
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
    'observacion_extra': 'observacion_extra',
    'certificado_origen': 'certificado_origen',
    'fecha_inspeccion': 'fecha_inspeccion',
    'n_tramite': 'n_tramite',
    'ubicacion_titulo': 'ubicacion_titulo'
  };
  
  Object.entries(mapeoCampos).forEach(([dbField, formField]) => {
    const element = document.getElementById(formField);
    if (!element) return;
    
    const value = vehiculo[dbField];
    if (value === undefined || value === null) {
      element.value = '';
      return;
    }
    
    if (element.tagName === 'SELECT') {
      const dbValue = String(value).toUpperCase().trim();
      const options = Array.from(element.options);
      
      // Búsqueda flexible para selects (con/sin espacios)
      let matchingOption = options.find(opt => {
        const optValue = opt.value.toUpperCase().trim();
        return optValue === dbValue || optValue.replace(/\s/g, '') === dbValue.replace(/\s/g, '');
      });
      
      if (matchingOption) {
        element.value = matchingOption.value;
      } else {
        // Agregar opción dinámica si no existe
        const newOption = document.createElement('option');
        newOption.value = dbValue;
        newOption.textContent = dbValue;
        newOption.selected = true;
        element.appendChild(newOption);
        console.log(`⚠️ Opción agregada dinámicamente: ${formField} = ${dbValue}`);
      }
    } else {
      element.value = value;
    }
  });
  
  // ID oculto para actualización
  document.getElementById('vehicleId').value = vehiculo.id;
  console.log('✅ Formulario llenado correctamente');
}

function resetearFormulario() {
  document.getElementById('vehicleForm').reset();
  document.getElementById('vehicleId').value = '';
  toggleFormFields(false);
}

function limpiarBusqueda() {
  document.getElementById('searchUniversal').value = '';
  ocultarTodasLasAlertas();
  mostrarAlerta('ℹ️ Ingrese placa, facsímil, serial o N° identificación para buscar', 'info');
  
  resetearFormulario();
  vehiculoSeleccionado = null;
  
  document.getElementById('btnEdit').style.display = 'none';
  document.getElementById('btnCancel').disabled = true;
}

// ============================================
// FUNCIONES DE EDICIÓN
// ============================================
function toggleFormFields(enable) {
  const fields = document.querySelectorAll('#vehicleForm input, #vehicleForm select, #vehicleForm textarea');
  fields.forEach(field => {
    if (field.id !== 'vehicleId') {
      field.disabled = !enable;
    }
  });
  
  const form = document.getElementById('vehicleForm');
  form.classList.toggle('form-disabled', !enable);
  isEditing = enable;
}

function editarVehiculo() {
  if (!vehiculoSeleccionado) {
    mostrarAlerta('⚠️ Primero debe buscar un vehículo', 'error');
    return;
  }
  
  toggleFormFields(true);
  document.getElementById('btnEdit').style.display = 'none';
  document.getElementById('btnSubmit').style.display = 'inline-flex';
  document.getElementById('btnCancel').disabled = false;
  
  mostrarAlerta('ℹ️ Editando vehículo. TODOS los campos son modificables.', 'info');
}

function cancelarEdicion() {
  if (vehiculoSeleccionado) {
    llenarFormulario(vehiculoSeleccionado);
  }
  toggleFormFields(false);
  document.getElementById('btnEdit').style.display = 'inline-flex';
  document.getElementById('btnSubmit').style.display = 'none';
  document.getElementById('btnCancel').disabled = false;
  
  mostrarAlerta('ℹ️ Edición cancelada. Los cambios no fueron guardados.', 'info');
}

// ============================================
// FUNCIONES DE GUARDADO (UPDATE)
// ============================================
async function guardarVehiculo(event) {
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
  btnSubmit.classList.add('loading');
  
  try {
    // ✅ ACTUALIZAR TODOS LOS CAMPOS (incluye facsimil)
    const vehiculoActualizado = {
      marca: document.getElementById('marca').value.trim().toUpperCase(),
      modelo: document.getElementById('modelo').value.trim().toUpperCase(),
      tipo: document.getElementById('tipo').value.trim().toUpperCase(),
      clase: document.getElementById('clase').value.trim().toUpperCase(),
      ano: document.getElementById('ano').value.trim() || null,
      color: document.getElementById('color').value.trim().toUpperCase(),
      s_carroceria: document.getElementById('s_carroceria').value.trim(),
      s_motor: document.getElementById('s_motor').value.trim() || null,
      placa: document.getElementById('placa').value.trim().toUpperCase(),
      facsimil: document.getElementById('facsimil').value.trim() || null,  // ✅ Campo agregado
      n_identificacion: document.getElementById('n_identificacion').value.trim() || null,
      situacion: document.getElementById('situacion').value.trim().toUpperCase(),
      estatus: document.getElementById('estatus').value.trim().toUpperCase(),
      unidad_administrativa: document.getElementById('unidad_administrativa').value.trim(),
      redip: document.getElementById('redip').value.trim() || null,
      ccpe: document.getElementById('ccpe').value.trim() || null,
      epm: document.getElementById('epm').value.trim() || null,
      epp: document.getElementById('epp').value.trim() || null,
      ubicacion_fisica: document.getElementById('ubicacion_fisica').value.trim() || null,
      asignacion: document.getElementById('asignacion').value.trim() || null,
      observacion: document.getElementById('observacion').value.trim() || null,
      observacion_extra: document.getElementById('observacion_extra').value.trim() || null,
      certificado_origen: document.getElementById('certificado_origen').value.trim() || null,
      fecha_inspeccion: document.getElementById('fecha_inspeccion').value || null,
      n_tramite: document.getElementById('n_tramite').value.trim() || null,
      ubicacion_titulo: document.getElementById('ubicacion_titulo').value.trim() || null,
    };
    
    console.log('📝 Actualizando vehículo ID:', vehiculoSeleccionado.id);
    
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
    
    // Actualizar estado local
    vehiculoSeleccionado = { ...vehiculoSeleccionado, ...data[0] };
    
    // Limpiar después de éxito
    setTimeout(limpiarTodoParaNuevaBusqueda, 2000);
    
  } catch (error) {
    console.error('❌ Error en guardarVehiculo:', error);
    mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.classList.remove('loading');
  }
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function ocultarTodasLasAlertas() {
  ['alertInfo', 'alertError', 'alertSuccess'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
}

function mostrarAlerta(mensaje, tipo) {
  ocultarTodasLasAlertas();
  
  const config = {
    success: { id: 'alertSuccess', msgId: 'successMessage' },
    error: { id: 'alertError', msgId: 'errorMessage' },
    info: { id: 'alertInfo', msgId: 'infoMessage' }
  };
  
  const { id, msgId } = config[tipo] || config.info;
  const alertEl = document.getElementById(id);
  const msgEl = document.getElementById(msgId);
  
  if (alertEl && msgEl) {
    msgEl.textContent = mensaje;
    alertEl.style.display = 'flex';
  }
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  // Auto-ocultar (excepto info inicial)
  if (tipo !== 'info') {
    setTimeout(() => {
      if (alertEl) alertEl.style.display = 'none';
    }, 5000);
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
  
  mostrarAlerta('ℹ️ Ingrese placa, facsímil, serial o N° identificación para buscar un vehículo', 'info');
}

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando modificación de vehículos...');
  
  // Bind de eventos
  const btnEdit = document.getElementById('btnEdit');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnCancel = document.getElementById('btnCancel');
  const btnSearch = document.getElementById('btnSearch');
  const btnClear = document.getElementById('btnClearSearch');
  const searchInput = document.getElementById('searchUniversal');
  const logoutBtn = document.getElementById('logoutBtn');
  
  if (btnEdit) btnEdit.addEventListener('click', editarVehiculo);
  if (btnSubmit) btnSubmit.addEventListener('click', guardarVehiculo);
  if (btnCancel) btnCancel.addEventListener('click', cancelarEdicion);
  if (btnSearch) btnSearch.addEventListener('click', buscarVehiculo);
  if (btnClear) btnClear.addEventListener('click', limpiarBusqueda);
  
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') buscarVehiculo();
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('¿Está seguro de cerrar sesión?')) {
        await supabaseClient.auth.signOut();
        window.location.href = '../index.html';
      }
    });
  }
  
  // Cargar usuario y estado inicial
  cargarUsuario();
  mostrarAlerta('ℹ️ Ingrese placa, facsímil, serial o N° identificación para buscar un vehículo', 'info');
  
  console.log('✅ Modificación de vehículos inicializada');
});

async function cargarUsuario() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userEmail = document.getElementById('userEmail');
    if (userEmail && session?.user?.email) {
      userEmail.textContent = session.user.email;
    }
  } catch (error) {
    console.error('Error al cargar usuario:', error);
  }
}
