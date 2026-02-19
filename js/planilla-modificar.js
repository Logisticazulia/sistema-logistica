/**
 * MODIFICAR VEHÍCULOS - PLANILLA
 * Maneja la búsqueda, carga y actualización de vehículos existentes
 */
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

// Referencias al DOM
const form = document.getElementById('vehicleForm');
const btnSearch = document.getElementById('btnSearch');
const btnEdit = document.getElementById('btnEdit');
const btnCancel = document.getElementById('btnCancel');
const btnSubmit = document.getElementById('btnSubmit');
const searchId = document.getElementById('searchId');
const searchPlaca = document.getElementById('searchPlaca');
const alertSuccess = document.getElementById('alertSuccess');
const alertError = document.getElementById('alertError');
const alertInfo = document.getElementById('alertInfo');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');
const infoMessage = document.getElementById('infoMessage');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// Estado de edición
let isEditing = false;
let vehicleData = null;

// ================= FUNCIONES DE UTILIDAD =================

// Mostrar usuario autenticado
async function mostrarUsuarioAutenticado() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (session?.user?.email) {
      userEmail.textContent = session.user.email.split('@')[0];
    }
  } catch (err) {
    console.error('Error obteniendo sesión:', err);
  }
}

// Cerrar sesión
async function cerrarSesion() {
  try {
    await supabaseClient.auth.signOut();
    window.location.href = '../index.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    window.location.href = '../index.html';
  }
}

// Mostrar alertas
function showAlert(type, message) {
  // Ocultar todas las alertas
  alertSuccess.style.display = 'none';
  alertError.style.display = 'none';
  alertInfo.style.display = 'none';
  
  if (type === 'success') {
    successMessage.textContent = message;
    alertSuccess.style.display = 'flex';
    setTimeout(() => {
      alertSuccess.style.display = 'none';
    }, 5000);
  } else if (type === 'error') {
    errorMessage.textContent = message;
    alertError.style.display = 'flex';
  } else if (type === 'info') {
    infoMessage.textContent = message;
    alertInfo.style.display = 'flex';
  }
  
  // Scroll hacia la alerta
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Habilitar/deshabilitar campos del formulario
function toggleFormFields(enable) {
  const fields = form.querySelectorAll('.form-input, .form-select, .form-textarea');
  fields.forEach(field => {
    if (field.id !== 'vehicleId') { // No deshabilitar el ID oculto
      field.disabled = !enable;
    }
  });
  
  // Toggle de botones
  btnCancel.disabled = !enable;
  btnEdit.style.display = enable ? 'none' : 'flex';
  btnSubmit.style.display = enable ? 'flex' : 'none';
  
  // Toggle de clase en el formulario
  form.classList.toggle('form-disabled', !enable);
  
  isEditing = enable;
}

// Llenar formulario con datos del vehículo
function cargarDatosVehiculo(vehiculo) {
  // Mapear campos del vehículo al formulario
  const campos = [
    'placa', 'facsimil', 'n_identificacion', 'marca', 'modelo', 'tipo', 'clase',
    'ano', 'color', 's_carroceria', 's_motor', 'situacion', 'estatus',
    'unidad_administrativa', 'ubicacion_fisica', 'asignacion', 'redip', 'ccpe',
    'epm', 'epp', 'certificado_origen', 'fecha_inspeccion', 'n_tramite',
    'ubicacion_titulo', 'observacion', 'observacion_extra'
  ];
  
  campos.forEach(campo => {
    const input = document.getElementById(campo);
    if (input && vehiculo[campo] !== undefined && vehiculo[campo] !== null) {
      if (input.type === 'date' && vehiculo[campo]) {
        // Formatear fecha para input date
        const fecha = new Date(vehiculo[campo]);
        input.value = fecha.toISOString().split('T')[0];
      } else {
        input.value = vehiculo[campo];
      }
    }
  });
  
  // Guardar ID del vehículo
  document.getElementById('vehicleId').value = vehiculo.id;
  
  // Mostrar mensaje informativo
  showAlert('info', `Vehículo ${vehiculo.placa} cargado. Presione "Editar Información" para modificar.`);
}

// ================= FUNCIONES PRINCIPALES =================

// Buscar vehículo
async function buscarVehiculo() {
  const id = searchId.value.trim();
  const placa = searchPlaca.value.trim().toUpperCase();
  
  if (!id && !placa) {
    showAlert('error', 'Debe ingresar al menos el ID o la Placa para buscar');
    return;
  }
  
  // Estado de carga
  btnSearch.classList.add('searching');
  btnSearch.disabled = true;
  
  try {
    let query = supabaseClient.from('vehiculos').select('*').limit(1);
    
    if (id) {
      query = query.eq('id', parseInt(id));
    } else if (placa) {
      query = query.ilike('placa', placa);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        showAlert('error', '❌ Vehículo no encontrado. Verifique el ID o Placa.');
      } else {
        console.error('Error al buscar:', error);
        showAlert('error', 'Error al buscar: ' + error.message);
      }
      return;
    }
    
    if (!data) {
      showAlert('error', '❌ Vehículo no encontrado');
      return;
    }
    
    // Cargar datos en el formulario
    vehicleData = data;
    cargarDatosVehiculo(data);
    
    // Habilitar botón de edición
    btnEdit.disabled = false;
    btnCancel.disabled = false;
    
    showAlert('success', `✅ Vehículo ${data.placa} encontrado. Puede editar la información.`);
    
  } catch (error) {
    console.error('Error en buscarVehiculo:', error);
    showAlert('error', 'Error de conexión: ' + error.message);
  } finally {
    // Restaurar botón
    btnSearch.classList.remove('searching');
    btnSearch.disabled = false;
  }
}

// Validar formulario antes de actualizar
function validarFormulario() {
  const camposObligatorios = ['placa', 'marca', 'modelo', 'tipo', 'clase'];
  let isValid = true;
  let mensajeError = '';
  
  camposObligatorios.forEach(campo => {
    const input = document.getElementById(campo);
    if (!input.value.trim()) {
      isValid = false;
      input.style.borderColor = '#dc2626';
      mensajeError = `El campo "${input.previousElementSibling.textContent.replace('*', '')}" es obligatorio`;
    } else {
      input.style.borderColor = '#ddd';
    }
  });
  
  if (!isValid) {
    showAlert('error', mensajeError);
  }
  
  return isValid;
}

// Actualizar vehículo
async function actualizarVehiculo(event) {
  event.preventDefault();
  
  if (!validarFormulario()) {
    return;
  }
  
  const vehicleId = document.getElementById('vehicleId').value;
  if (!vehicleId) {
    showAlert('error', 'Error: No se encontró el ID del vehículo');
    return;
  }
  
  // Estado de carga
  btnSubmit.classList.add('loading');
  btnSubmit.disabled = true;
  
  try {
    // Recopilar datos del formulario
    const vehiculoActualizado = {
      placa: document.getElementById('placa').value.trim().toUpperCase(),
      facsimil: document.getElementById('facsimil').value.trim().toUpperCase(),
      n_identificacion: document.getElementById('n_identificacion').value.trim().toUpperCase(),
      marca: document.getElementById('marca').value.trim().toUpperCase(),
      modelo: document.getElementById('modelo').value.trim().toUpperCase(),
      tipo: document.getElementById('tipo').value.trim().toUpperCase(),
      clase: document.getElementById('clase').value.trim().toUpperCase(),
      ano: document.getElementById('ano').value ? parseInt(document.getElementById('ano').value) : null,
      color: document.getElementById('color').value.trim().toUpperCase(),
      s_carroceria: document.getElementById('s_carroceria').value.trim().toUpperCase(),
      s_motor: document.getElementById('s_motor').value.trim().toUpperCase(),
      situacion: document.getElementById('situacion').value.trim().toUpperCase(),
      estatus: document.getElementById('estatus').value.trim().toUpperCase(),
      unidad_administrativa: document.getElementById('unidad_administrativa').value.trim().toUpperCase(),
      ubicacion_fisica: document.getElementById('ubicacion_fisica').value.trim().toUpperCase(),
      asignacion: document.getElementById('asignacion').value.trim().toUpperCase(),
      redip: document.getElementById('redip').value.trim().toUpperCase(),
      ccpe: document.getElementById('ccpe').value.trim().toUpperCase(),
      epm: document.getElementById('epm').value.trim().toUpperCase(),
      epp: document.getElementById('epp').value.trim().toUpperCase(),
      certificado_origen: document.getElementById('certificado_origen').value.trim().toUpperCase(),
      fecha_inspeccion: document.getElementById('fecha_inspeccion').value || null,
      n_tramite: document.getElementById('n_tramite').value.trim().toUpperCase(),
      ubicacion_titulo: document.getElementById('ubicacion_titulo').value.trim().toUpperCase(),
      observacion: document.getElementById('observacion').value.trim(),
      observacion_extra: document.getElementById('observacion_extra').value.trim()
    };
    
    console.log('Actualizando vehículo ID:', vehicleId);
    
    // Actualizar en Supabase
    const { data, error } = await supabaseClient
      .from('vehiculos')
      .update(vehiculoActualizado)
      .eq('id', parseInt(vehicleId))
      .select();
    
    if (error) {
      console.error('Error al actualizar:', error);
      throw error;
    }
    
    console.log('Vehículo actualizado:', data);
    showAlert('success', '✅ Vehículo ' + vehiculoActualizado.placa + ' actualizado exitosamente');
    
    // Deshabilitar edición después de guardar
    toggleFormFields(false);
    
    // Opcional: Redirigir a consultar después de 2 segundos
    // setTimeout(() => {
    //   window.location.href = 'planilla.html';
    // }, 2000);
    
  } catch (error) {
    console.error('Error en actualizarVehiculo:', error);
    showAlert('error', '❌ Error al actualizar: ' + (error.message || 'Verifique su conexión'));
  } finally {
    // Restaurar botón
    btnSubmit.classList.remove('loading');
    btnSubmit.disabled = false;
  }
}

// Cancelar edición
function cancelarEdicion() {
  if (vehicleData) {
    // Recargar datos originales
    cargarDatosVehiculo(vehicleData);
  }
  toggleFormFields(false);
  showAlert('info', 'Edición cancelada. Los cambios no fueron guardados.');
}

// ================= EVENT LISTENERS =================
document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicializando modificación de vehículos...');
  
  mostrarUsuarioAutenticado();
  
  // Búsqueda
  btnSearch.addEventListener('click', buscarVehiculo);
  searchId.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarVehiculo();
  });
  searchPlaca.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarVehiculo();
  });
  
  // Edición
  btnEdit.addEventListener('click', () => toggleFormFields(true));
  btnCancel.addEventListener('click', cancelarEdicion);
  
  // Guardar cambios
  form.addEventListener('submit', actualizarVehiculo);
  
  // Logout
  if (logoutBtn) {
    logoutBtn.addEventListener('click', cerrarSesion);
  }
  
  // Mostrar mensaje inicial
  showAlert('info', 'Ingrese el ID o Placa del vehículo que desea modificar');
});
