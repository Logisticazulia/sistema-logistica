document.addEventListener('DOMContentLoaded', async () => {
  
  // 🔧 INICIALIZAR SUPABASE SI NO EXISTE (usando tus credenciales de config.js)
  async function initSupabase() {
    if (typeof window.supabase !== 'undefined' && window.supabase?.auth) {
      return window.supabase;
    }
    
    // Esperar a que createClient esté disponible desde el CDN
    let attempts = 0;
    while (typeof createClient === 'undefined' && attempts < 50) {
      await new Promise(res => setTimeout(res, 100));
      attempts++;
    }
    
    if (typeof createClient === 'undefined') {
      console.error('❌ No se pudo cargar createClient desde el CDN de Supabase');
      mostrarAlerta('error', 'Error de carga. Recarga con Ctrl+F5');
      return null;
    }
    
    // Crear cliente con tus credenciales de config.js
    if (window.SUPABASE_URL && window.SUPABASE_KEY) {
      try {
        window.supabase = createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log('✅ Cliente Supabase inicializado desde config.js');
        return window.supabase;
      } catch (err) {
        console.error('❌ Error al crear cliente Supabase:', err);
        return null;
      }
    }
    
    console.error('❌ Faltan credenciales en config.js (SUPABASE_URL o SUPABASE_KEY)');
    return null;
  }

  const supabase = await initSupabase();
  if (!supabase) return;

  // 🔐 Rutas (ajusta según tu estructura real en GitHub Pages)
  const RUTAS = {
    login: '/sistema-logistica/login.html',
    dashboard: '/sistema-logistica/dashboard.html',
    transporte: '/sistema-logistica/transporte.html',
    inspeccion: '/sistema-logistica/inspeccion/inspeccion.html'
  };

  // 🔒 Verificar autenticación (NO bloqueante - sin redirección agresiva)
  let usuarioActual = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('⚠️ Auth warning:', error.message);
    } else if (user) {
      usuarioActual = user;
      const userEmailEl = document.getElementById('userEmail');
      if (userEmailEl) userEmailEl.textContent = user.email || 'Usuario';
    }
  } catch (err) {
    console.error('❌ Error en auth:', err);
  }

  // 🎯 Referencias DOM
  const searchInput = document.getElementById('searchVehicle');
  const btnSearch = document.getElementById('btnSearch');
  const btnSearchText = btnSearch?.querySelector('.btn-search-text');
  const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
  const vehicleDisplay = document.getElementById('vehicleDisplay');
  const inspectionForm = document.getElementById('inspectionForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnCancel = document.getElementById('btnCancel');
  const btnClearVehicle = document.getElementById('btnClearVehicle');
  
  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');

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

  // 🔍 Mostrar alerta
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

  // 🔄 Habilitar/deshabilitar formulario
  function toggleFormState(activo) {
    if (!inspectionForm) return;
    inspectionForm.style.opacity = activo ? '1' : '0.6';
    inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
    if (btnSubmit) {
      btnSubmit.disabled = !activo || !usuarioActual;
      if (!usuarioActual && btnSubmit) {
        btnSubmit.title = '🔐 Requiere iniciar sesión para guardar';
      }
    }
    if (vehicleDisplay) vehicleDisplay.style.display = activo ? 'block' : 'none';
  }

  // 🚗 Buscar vehículo
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

      // Rellenar datos encontrados
      disp.placa.textContent = data.placa || 'N/A';
      disp.marca.textContent = data.marca?.toUpperCase() || 'N/A';
      disp.modelo.textContent = data.modelo?.toUpperCase() || 'N/A';
      disp.ano.textContent = data.ano || 'N/A';
      disp.tipo.textContent = data.tipo || 'N/A';
      disp.color.textContent = data.color || 'N/A';
      disp.nId.textContent = data.n_identificacion || 'N/A';
      const adscrita = data.unidad_administrativa || data.epp || data.epm || 'No asignada';
      disp.adscrita.textContent = adscrita;

      if (vehicleIdInput) vehicleIdInput.value = data.id;
      toggleFormState(true);
      mostrarAlerta('success', '✅ Vehículo encontrado');

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

  // 🗑️ Limpiar búsqueda
  function limpiarBusqueda() {
    if (searchInput) searchInput.value = '';
    toggleFormState(false);
    if (vehicleIdInput) vehicleIdInput.value = '';
    if (inspectionForm) inspectionForm.reset();
    mostrarAlerta('info', 'Ingrese datos para buscar un vehículo');
  }

  // 💾 Guardar inspección
  async function guardarInspeccion(e) {
    e?.preventDefault();
    
    if (!usuarioActual) {
      mostrarAlerta('error', '🔐 Debes iniciar sesión para guardar inspecciones');
      return;
    }
    if (!vehicleIdInput?.value) {
      mostrarAlerta('error', 'Primero busca y selecciona un vehículo');
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
        // 👇 Aquí agregarás los ítems de inspección que me indiques
      };

      // ⚠️ Cambia 'inspecciones_pvr' por el nombre real de tu tabla
      const { error } = await supabase.from('inspecciones_pvr').insert([payload]);
      if (error) throw error;

      mostrarAlerta('success', '✅ Inspección PVR registrada correctamente');
      limpiarBusqueda();

    } catch (err) {
      console.error('Error al guardar:', err);
      mostrarAlerta('error', `No se pudo guardar: ${err.message || 'Error desconocido'}`);
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

  // 🎧 Event Listeners
  if (btnSearch) btnSearch.addEventListener('click', buscarVehiculo);
  if (searchInput) searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarVehiculo(); });
  if (btnClearVehicle) btnClearVehicle.addEventListener('click', limpiarBusqueda);
  if (btnCancel) btnCancel.addEventListener('click', limpiarBusqueda);
  if (inspectionForm) inspectionForm.addEventListener('submit', guardarInspeccion);

  // Init
  mostrarAlerta('info', '🔍 Busque un vehículo por Placa, Facsímil, S/Carrocería o S/Motor');
});
