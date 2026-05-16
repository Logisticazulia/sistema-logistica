document.addEventListener('DOMContentLoaded', async () => {
  // ==========================================
  // 1️⃣ REFERENCIAS DOM (Se declaran primero para evitar TDZ)
  // ==========================================
  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');
  
  const searchInput = document.getElementById('searchVehicle');
  const btnSearch = document.getElementById('btnSearch');
  const btnSearchText = btnSearch?.querySelector('.btn-search-text');
  const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
  const vehicleDisplay = document.getElementById('vehicleDisplay');
  const inspectionForm = document.getElementById('inspectionForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnCancel = document.getElementById('btnCancel');
  const btnClearVehicle = document.getElementById('btnClearVehicle');
  
  const disp = {
    placa: document.getElementById('dispPlaca'),
    marca: document.getElementById('dispMarca'),
    modelo: document.getElementById('dispModelo'),
    ano: document.getElementById('dispAno'),
    tipo: document.getElementById('dispTipo'),
    color: document.getElementById('dispColor'),
    nId: document.getElementById('dispNId'),
    adscrita: document.getElementById('dispAdscrita')
  };
  const vehicleIdInput = document.getElementById('vehicleId');

  // ==========================================
  // 2️⃣ UTILIDADES DE UI
  // ==========================================
  function mostrarAlerta(tipo, mensaje) {
    [alertSuccess, alertError, alertInfo].forEach(el => { if (el) el.style.display = 'none'; });
    if (tipo === 'success' && alertSuccess) {
      alertSuccess.querySelector('span:last-child').textContent = mensaje;
      alertSuccess.style.display = 'flex';
    } else if (tipo === 'error' && alertError) {
      alertError.querySelector('span:last-child').textContent = mensaje;
      alertError.style.display = 'flex';
    } else if (alertInfo) {
      alertInfo.querySelector('span:last-child').textContent = mensaje;
      alertInfo.style.display = 'flex';
    }
  }

  function toggleFormState(activo) {
    if (!inspectionForm) return;
    inspectionForm.style.opacity = activo ? '1' : '0.6';
    inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
    if (btnSubmit) btnSubmit.disabled = !activo;
    if (vehicleDisplay) vehicleDisplay.style.display = activo ? 'block' : 'none';
  }

  // ==========================================
  // 3️⃣ INICIALIZACIÓN DE SUPABASE (Robusta)
  // ==========================================
  async function initSupabase() {
    // Esperar a que el CDN cargue (máx 5 seg)
    let attempts = 0;
    while (!window.supabase && attempts < 50) {
      await new Promise(res => setTimeout(res, 100));
      attempts++;
    }

    if (!window.supabase) {
      mostrarAlerta('error', '❌ No se cargó la librería de Supabase. Recargue la página.');
      return null;
    }

    // Si ya está inicializado, lo retornamos
    if (window.supabase.auth) {
      return window.supabase;
    }

    // Inicializar con credenciales de config.js
    const createFn = window.supabase.createClient || window.createClient;
    if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try {
        window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log('✅ Cliente Supabase inicializado desde config.js');
        return window.supabase;
      } catch (err) {
        console.error('❌ Error init Supabase:', err);
        mostrarAlerta('error', '❌ Error al crear el cliente Supabase');
        return null;
      }
    }

    mostrarAlerta('error', '⚠️ Faltan credenciales o función de creación');
    return null;
  }

  const supabase = await initSupabase();
  if (!supabase) return; // Detener ejecución si falla init

  // ==========================================
  // 4️⃣ AUTENTICACIÓN (No bloqueante)
  // ==========================================
  let usuarioActual = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      usuarioActual = user;
      const userEmailEl = document.getElementById('userEmail');
      if (userEmailEl) userEmailEl.textContent = user.email || 'Usuario';
    }
  } catch (err) {
    console.warn('⚠️ Sesión no verificada, pero se permite buscar vehículos');
  }

  // Deshabilitar guardar si no hay sesión
  if (!usuarioActual && btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.title = '🔐 Requiere iniciar sesión';
  }

  // ==========================================
  // 5️⃣ LÓGICA DE NEGOCIO
  // ==========================================
  async function buscarVehiculo() {
    const query = searchInput?.value.trim();
    if (!query) { mostrarAlerta('info', 'Ingrese Placa, Facsímil, S/Carrocería o S/Motor'); return; }

    if (btnSearch) {
      btnSearch.disabled = true;
      if (btnSearchText) btnSearchText.style.display = 'none';
      if (btnSearchLoader) btnSearchLoader.style.display = 'inline';
    }
    mostrarAlerta('info', '🔍 Buscando...');

    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .or(`placa.eq.${query},facsimil.eq.${query},s_carroceria.eq.${query},s_motor.eq.${query}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        mostrarAlerta('error', '❌ No se encontró vehículo con esos datos.');
        toggleFormState(false);
        return;
      }

      // Rellenar UI
      disp.placa.textContent = data.placa || 'N/A';
      disp.marca.textContent = data.marca?.toUpperCase() || 'N/A';
      disp.modelo.textContent = data.modelo?.toUpperCase() || 'N/A';
      disp.ano.textContent = data.ano || 'N/A';
      disp.tipo.textContent = data.tipo || 'N/A';
      disp.color.textContent = data.color || 'N/A';
      disp.nId.textContent = data.n_identificacion || 'N/A';
      disp.adscrita.textContent = data.unidad_administrativa || data.epp || data.epm || 'No asignada';

      if (vehicleIdInput) vehicleIdInput.value = data.id;
      toggleFormState(true);
      mostrarAlerta('success', '✅ Vehículo encontrado. Complete la inspección.');

    } catch (err) {
      console.error('Error búsqueda:', err);
      mostrarAlerta('error', `Error: ${err.message || 'Consulta fallida'}`);
    } finally {
      if (btnSearch) {
        btnSearch.disabled = false;
        if (btnSearchText) btnSearchText.style.display = 'inline';
        if (btnSearchLoader) btnSearchLoader.style.display = 'none';
      }
    }
  }

  function limpiarBusqueda() {
    if (searchInput) searchInput.value = '';
    toggleFormState(false);
    if (vehicleIdInput) vehicleIdInput.value = '';
    if (inspectionForm) inspectionForm.reset();
    mostrarAlerta('info', 'Ingrese datos para buscar un vehículo');
  }

  async function guardarInspeccion(e) {
    e?.preventDefault();
    
    if (!usuarioActual) {
      mostrarAlerta('error', '🔐 Debe iniciar sesión para guardar');
      return;
    }
    if (!vehicleIdInput?.value) {
      mostrarAlerta('error', 'Primero seleccione un vehículo');
      return;
    }

    if (btnSubmit) {
      btnSubmit.disabled = true;
      const btnText = btnSubmit.querySelector('.btn-text');
      const btnLoader = btnSubmit.querySelector('.btn-loader');
      if (btnText) btnText.style.display = 'none';
      if (btnLoader) btnLoader.style.display = 'inline';
    }

    try {
      const payload = {
        vehiculo_id: vehicleIdInput.value,
        inspector: usuarioActual.email || 'sistema',
        fecha_creacion: new Date().toISOString()
        // ⬇️ Aquí se agregarán los ítems que me indiques
      };

      const { error } = await supabase.from('inspecciones_pvr').insert([payload]);
      if (error) throw error;

      mostrarAlerta('success', '✅ Inspección registrada correctamente');
      limpiarBusqueda();

    } catch (err) {
      console.error('Error al guardar:', err);
      mostrarAlerta('error', `No se pudo guardar: ${err.message || 'Error'}`);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        const btnText = btnSubmit.querySelector('.btn-text');
        const btnLoader = btnSubmit.querySelector('.btn-loader');
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
      }
    }
  }

  // ==========================================
  // 6️⃣ EVENT LISTENERS
  // ==========================================
  if (btnSearch) btnSearch.addEventListener('click', buscarVehiculo);
  if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarVehiculo(); });
  if (btnClearVehicle) btnClearVehicle.addEventListener('click', limpiarBusqueda);
  if (btnCancel) btnCancel.addEventListener('click', limpiarBusqueda);
  if (inspectionForm) inspectionForm.addEventListener('submit', guardarInspeccion);

  // Init
  mostrarAlerta('info', '🔍 Busque un vehículo por Placa, Facsímil, S/Carrocería o S/Motor');
});
