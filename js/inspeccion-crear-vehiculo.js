document.addEventListener('DOMContentLoaded', async () => {
  // 🔍 Verificar que Supabase esté disponible
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase no está disponible. Verifica que config.js se cargue antes.');
    mostrarAlerta('error', 'Error de configuración. Recarga la página.');
    return;
  }

  // 🔐 Configuración de rutas (AJUSTA ESTO SEGÚN TU ESTRUCTURA REAL)
  const RUTAS = {
    login: '../../login.html', // ← Cambia esto si tu login está en otra ubicación
    dashboard: '../dashboard.html',
    transporte: 'transporte.html',
    inspeccion: 'inspeccion.html'
  };

  // 🔒 Verificar autenticación de forma segura
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('⚠️ Error verificando sesión:', error.message);
      // No redirigir inmediatamente, permitir que el usuario intente buscar
      mostrarAlerta('info', '⚠️ Sesión no verificada. Algunas funciones pueden estar limitadas.');
    } else if (!user) {
      console.warn('⚠️ Usuario no autenticado');
      mostrarAlerta('info', '🔐 Inicia sesión para guardar inspecciones.');
      // Opcional: deshabilitar botón de guardar
      const btnSubmit = document.getElementById('btnSubmit');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.title = 'Requiere autenticación';
      }
    }
    // Si hay usuario, actualizar navbar
    else if (user?.email) {
      const userEmailEl = document.getElementById('userEmail');
      if (userEmailEl) userEmailEl.textContent = user.email;
    }
  } catch (err) {
    console.error('❌ Error crítico en auth:', err);
    mostrarAlerta('error', 'No se pudo verificar la sesión.');
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
  
  // Alertas
  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');

  // 📊 Visualización de vehículo
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

  // 🔍 Mostrar alerta (reutilizable)
  function mostrarAlerta(tipo, mensaje) {
    [alertSuccess, alertError, alertInfo].forEach(el => {
      if (el) el.style.display = 'none';
    });
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
    if (btnSubmit) btnSubmit.disabled = !activo;
    if (vehicleDisplay) vehicleDisplay.style.display = activo ? 'block' : 'none';
  }

  // 🚗 Buscar vehículo en Supabase
  async function buscarVehiculo() {
    const query = searchInput?.value.trim();
    if (!query) {
      mostrarAlerta('info', 'Ingrese Placa, Facsímil, S/Carrocería o S/Motor');
      return;
    }

    // UI loading
    if (btnSearch) {
      btnSearch.disabled = true;
      if (btnSearchText) btnSearchText.style.display = 'none';
      if (btnSearchLoader) btnSearchLoader.style.display = 'inline';
    }
    mostrarAlerta('info', '🔍 Buscando...');

    try {
      // ⚠️ Asegúrate que 'vehiculos' es el nombre exacto de tu tabla
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
      
      // Lógica para ADSCRITA A (prioridad: unidad_administrativa > epp > epm)
      const adscrita = data.unidad_administrativa || data.epp || data.epm || 'No asignada';
      disp.adscrita.textContent = adscrita;

      if (vehicleIdInput) vehicleIdInput.value = data.id;
      
      toggleFormState(true);
      mostrarAlerta('success', '✅ Vehículo encontrado. Complete la inspección.');

    } catch (err) {
      console.error('Error búsqueda:', err);
      mostrarAlerta('error', `Error: ${err.message || 'Consulta fallida'}`);
    } finally {
      // Restaurar UI
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

  // 💾 Guardar inspección (placeholder - espera tus ítems)
  async function guardarInspeccion(e) {
    e?.preventDefault();
    
    if (!vehicleIdInput?.value) {
      mostrarAlerta('error', 'Primero busca y selecciona un vehículo');
      return;
    }

    // UI loading
    if (btnSubmit) {
      btnSubmit.disabled = true;
      const btnText = btnSubmit.querySelector('.btn-text');
      const btnLoader = btnSubmit.querySelector('.btn-loader');
      if (btnText) btnText.style.display = 'none';
      if (btnLoader) btnLoader.style.display = 'inline';
    }

    try {
      // Obtener usuario actual (para registrar quién hizo la inspección)
      const { data: { user } } = await supabase.auth.getUser();
      
      // 📦 Payload base - AQUÍ AGREGARÉS LOS ÍTEMS QUE ME INDIQUES
      const payload = {
        vehiculo_id: vehicleIdInput.value,
        inspector: user?.email || 'sistema',
        fecha_creacion: new Date().toISOString(),
        // Ejemplo: estado_llantas: document.getElementById('estado_llantas')?.value,
        // Ejemplo: nivel_combustible: document.getElementById('nivel_combustible')?.value,
      };

      // ⚠️ Cambia 'inspecciones_pvr' por el nombre real de tu tabla destino
      const { error } = await supabase
        .from('inspecciones_pvr')
        .insert([payload]);
      
      if (error) throw error;

      mostrarAlerta('success', '✅ Inspección PVR registrada correctamente');
      limpiarBusqueda();

    } catch (err) {
      console.error('Error al guardar:', err);
      mostrarAlerta('error', `No se pudo guardar: ${err.message || 'Error desconocido'}`);
    } finally {
      // Restaurar botón
      if (btnSubmit) {
        btnSubmit.disabled = false;
        const btnText = btnSubmit.querySelector('.btn-text');
        const btnLoader = btnSubmit.querySelector('.btn-loader');
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
      }
    }
  }

  // 🎧 Event Listeners (con verificación de existencia)
  if (btnSearch) btnSearch.addEventListener('click', buscarVehiculo);
  if (searchInput) searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buscarVehiculo();
  });
  if (btnClearVehicle) btnClearVehicle.addEventListener('click', limpiarBusqueda);
  if (btnCancel) btnCancel.addEventListener('click', limpiarBusqueda);
  if (inspectionForm) inspectionForm.addEventListener('submit', guardarInspeccion);

  // Inicialización: mostrar mensaje de bienvenida
  mostrarAlerta('info', '🔍 Busque un vehículo por Placa, Facsímil, S/Carrocería o S/Motor');
});
