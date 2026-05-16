document.addEventListener('DOMContentLoaded', async () => {
  // 🔍 Verificar que Supabase esté disponible en el ámbito global
  if (typeof supabase === 'undefined') {
    console.error('❌ Error crítico: Supabase no se cargó. Verifica config.js o tu conexión a internet.');
    alert('Error de configuración. Por favor, recargue la página.');
    return;
  }

  // 🔒 Verificar autenticación correctamente (async/await)
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      window.location.href = '../login.html';
      return;
    }
    // Actualizar email en navbar si existe el elemento
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = user.email || 'Usuario';
  } catch (err) {
    console.error('Error al verificar sesión:', err);
    window.location.href = '../login.html';
    return;
  }

  // 🎯 Elementos del DOM
  const searchInput = document.getElementById('searchVehicle');
  const btnSearch = document.getElementById('btnSearch');
  const btnSearchText = btnSearch.querySelector('.btn-search-text');
  const btnSearchLoader = btnSearch.querySelector('.btn-search-loader');
  const vehicleDisplay = document.getElementById('vehicleDisplay');
  const inspectionForm = document.getElementById('inspectionForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnCancel = document.getElementById('btnCancel');
  const btnClearVehicle = document.getElementById('btnClearVehicle');
  
  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');
  const successMsg = document.getElementById('successMessage');
  const errorMsg = document.getElementById('errorMessage');
  const infoMsg = document.getElementById('infoMessage');

  // 📊 Elementos de visualización
  const dispPlaca = document.getElementById('dispPlaca');
  const dispMarca = document.getElementById('dispMarca');
  const dispModelo = document.getElementById('dispModelo');
  const dispAno = document.getElementById('dispAno');
  const dispTipo = document.getElementById('dispTipo');
  const dispColor = document.getElementById('dispColor');
  const dispNId = document.getElementById('dispNId');
  const dispAdscrita = document.getElementById('dispAdscrita');
  const vehicleIdInput = document.getElementById('vehicleId');

  // 🔍 Mostrar alerta
  function showAlert(type, message) {
    [alertSuccess, alertError, alertInfo].forEach(el => el.style.display = 'none');
    if (type === 'success') { successMsg.textContent = message; alertSuccess.style.display = 'flex'; }
    else if (type === 'error') { errorMsg.textContent = message; alertError.style.display = 'flex'; }
    else { infoMsg.textContent = message; alertInfo.style.display = 'flex'; }
  }

  // 🔄 Activar/Desactivar formulario
  function toggleFormState(active) {
    inspectionForm.style.opacity = active ? '1' : '0.6';
    inspectionForm.style.pointerEvents = active ? 'auto' : 'none';
    btnSubmit.disabled = !active;
    if (active) vehicleDisplay.style.display = 'block';
  }

  // 🚗 Buscar vehículo
  async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) {
      showAlert('info', 'Ingrese Placa, Facsímil, S/Carrocería o S/Motor para buscar');
      return;
    }

    btnSearch.disabled = true;
    btnSearchText.style.display = 'none';
    btnSearchLoader.style.display = 'inline';
    showAlert('info', 'Buscando vehículo...');

    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .or(`placa.eq.${query},facsimil.eq.${query},s_carroceria.eq.${query},s_motor.eq.${query}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        showAlert('error', 'No se encontró ningún vehículo con esos datos.');
        toggleFormState(false);
        vehicleDisplay.style.display = 'none';
        return;
      }

      // Rellenar datos encontrados
      dispPlaca.textContent = data.placa || 'N/A';
      dispMarca.textContent = data.marca?.toUpperCase() || 'N/A';
      dispModelo.textContent = data.modelo?.toUpperCase() || 'N/A';
      dispAno.textContent = data.ano || 'N/A';
      dispTipo.textContent = data.tipo || 'N/A';
      dispColor.textContent = data.color || 'N/A';
      dispNId.textContent = data.n_identificacion || 'N/A';
      
      const adscrita = data.unidad_administrativa || data.epp || data.epm || 'No asignada';
      dispAdscrita.textContent = adscrita;

      vehicleIdInput.value = data.id;
      toggleFormState(true);
      showAlert('success', 'Vehículo encontrado. Complete los ítems de inspección.');
      
    } catch (err) {
      console.error('Error en búsqueda:', err);
      showAlert('error', `Error al buscar: ${err.message}`);
    } finally {
      btnSearch.disabled = false;
      btnSearchText.style.display = 'inline';
      btnSearchLoader.style.display = 'none';
    }
  }

  // 🗑️ Limpiar búsqueda
  function clearSearch() {
    searchInput.value = '';
    vehicleDisplay.style.display = 'none';
    toggleFormState(false);
    vehicleIdInput.value = '';
    inspectionForm.reset();
    showAlert('info', 'Ingrese Placa, Facsímil, S/Carrocería o S/Motor para comenzar');
  }

  // 💾 Guardar inspección
  async function handleSubmit(e) {
    e.preventDefault();
    btnSubmit.disabled = true;
    btnSubmit.querySelector('.btn-text').style.display = 'none';
    btnSubmit.querySelector('.btn-loader').style.display = 'inline';

    try {
      const formData = new FormData(inspectionForm);
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        vehiculo_id: vehicleIdInput.value,
        inspector: user?.email || 'sistema',
        // ⚠️ Aquí se agregarán automáticamente los ítems que me indiques
        created_at: new Date().toISOString()
      };

      // ⚠️ Cambia 'inspecciones_pvr' por el nombre real de tu tabla
      const { error } = await supabase.from('inspecciones_pvr').insert([payload]);
      if (error) throw error;

      showAlert('success', 'Inspección PVR registrada correctamente.');
      clearSearch();
    } catch (err) {
      console.error('Error al guardar:', err);
      showAlert('error', `Error al guardar: ${err.message}`);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.querySelector('.btn-text').style.display = 'inline';
      btnSubmit.querySelector('.btn-loader').style.display = 'none';
    }
  }

  // 🎧 Event Listeners
  btnSearch.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSearch(); });
  btnClearVehicle.addEventListener('click', clearSearch);
  btnCancel.addEventListener('click', clearSearch);
  inspectionForm.addEventListener('submit', handleSubmit);
});
