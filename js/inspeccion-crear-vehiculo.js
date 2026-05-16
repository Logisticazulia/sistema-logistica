document.addEventListener('DOMContentLoaded', async () => {
  // ==========================================
  // 1️⃣ INICIALIZACIÓN SEGURA DE SUPABASE
  // ==========================================
  async function initSupabase() {
    let attempts = 0;
    while (!window.supabase && attempts < 50) { await new Promise(res => setTimeout(res, 100)); attempts++; }
    if (!window.supabase) { mostrarAlerta('error', '❌ No se cargó Supabase. Recargue la página.'); return null; }
    if (window.supabase.auth) return window.supabase;

    const createFn = window.supabase.createClient || window.createClient;
    if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try {
        window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log('✅ Cliente Supabase inicializado');
        return window.supabase;
      } catch (err) { console.error('❌ Error init Supabase:', err); return null; }
    }
    return null;
  }

  const supabase = await initSupabase();
  if (!supabase) return;

  // ==========================================
  // 2️⃣ AUTENTICACIÓN & UI
  // ==========================================
  let usuarioActual = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      usuarioActual = user;
      const el = document.getElementById('userEmail');
      if (el) el.textContent = user.email || 'Usuario';
    }
  } catch (err) { console.warn('Sesión no verificada'); }

  // ==========================================
  // 3️⃣ REFERENCIAS DOM
  // ==========================================
  const searchInput = document.getElementById('searchVehicle');
  const btnSearch = document.getElementById('btnSearch');
  const btnSearchText = btnSearch?.querySelector('.btn-search-text');
  const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
  const inspectionForm = document.getElementById('inspectionForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnClear = document.getElementById('btnClear');
  const vehicleIdInput = document.getElementById('vehicleId');

  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');

  // Auto-fill fields
  const autoFields = {
    n_inspeccion: document.getElementById('n_inspeccion'),
    fecha_inspeccion: document.getElementById('fecha_inspeccion'),
    hora: document.getElementById('hora'),
    motivo_inspeccion: document.getElementById('motivo_inspeccion'),
    lugar: document.getElementById('lugar'),
    asignacion: document.getElementById('asignacion'),
    supervision: document.getElementById('supervision'),
    placa: document.getElementById('placa'),
    marca: document.getElementById('marca'),
    modelo: document.getElementById('modelo'),
    ano: document.getElementById('ano'),
    tipo: document.getElementById('tipo'),
    color: document.getElementById('color'),
    n_identificacion: document.getElementById('n_identificacion'),
    s_carroceria: document.getElementById('s_carroceria'),
    kms: document.getElementById('kms')
  };

  function mostrarAlerta(tipo, mensaje) {
    [alertSuccess, alertError, alertInfo].forEach(el => { if (el) el.style.display = 'none'; });
    const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
    if (target) {
      target.querySelector('span:last-child').textContent = mensaje;
      target.style.display = 'flex';
    }
  }

  function toggleFormState(activo) {
    inspectionForm.style.opacity = activo ? '1' : '0.6';
    inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
    btnSubmit.disabled = !activo || !usuarioActual;
    if (!usuarioActual && btnSubmit) btnSubmit.title = '🔐 Requiere iniciar sesión';
  }

  function generarNInspeccion() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `PVR-${yyyy}${mm}${dd}-${rand}`;
  }

  function setDefaults() {
    const now = new Date();
    if (autoFields.fecha_inspeccion) autoFields.fecha_inspeccion.value = now.toISOString().split('T')[0];
    if (autoFields.hora) autoFields.hora.value = now.toTimeString().slice(0, 5);
    if (autoFields.n_inspeccion) autoFields.n_inspeccion.value = generarNInspeccion();
  }

  // ==========================================
  // 4️⃣ BÚSQUEDA EXACTA
  // ==========================================
  async function buscarVehiculo() {
    const query = searchInput?.value.trim();
    if (!query) { mostrarAlerta('info', 'Ingrese datos para búsqueda exacta'); return; }

    if (btnSearch) {
      btnSearch.disabled = true;
      btnSearchText.style.display = 'none';
      btnSearchLoader.style.display = 'inline';
    }
    mostrarAlerta('info', '🔍 Buscando...');

    try {
      // Búsqueda EXACTA usando .eq.
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .or(`placa.eq.${query},facsimil.eq.${query},s_carroceria.eq.${query},s_motor.eq.${query}`)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        mostrarAlerta('error', '❌ Vehículo no encontrado. Verifique los datos.');
        toggleFormState(false);
        return;
      }

      // Auto-llenar campos del vehículo
      autoFields.placa.value = data.placa || '';
      autoFields.marca.value = data.marca?.toUpperCase() || '';
      autoFields.modelo.value = data.modelo?.toUpperCase() || '';
      autoFields.ano.value = data.ano || '';
      autoFields.tipo.value = data.tipo || '';
      autoFields.color.value = data.color || '';
      autoFields.n_identificacion.value = data.n_identificacion || '';
      autoFields.s_carroceria.value = data.s_carroceria || '';
      vehicleIdInput.value = data.id;

      setDefaults();
      toggleFormState(true);
      mostrarAlerta('success', '✅ Vehículo encontrado. Complete motivo, lugar y KMS.');

    } catch (err) {
      console.error('Error búsqueda:', err);
      mostrarAlerta('error', `Error: ${err.message}`);
    } finally {
      if (btnSearch) {
        btnSearch.disabled = false;
        btnSearchText.style.display = 'inline';
        btnSearchLoader.style.display = 'none';
      }
    }
  }

  function limpiarFormulario() {
    searchInput.value = '';
    toggleFormState(false);
    inspectionForm.reset();
    vehicleIdInput.value = '';
    mostrarAlerta('info', 'Ingrese datos para buscar un vehículo');
  }

  // ==========================================
  // 5️⃣ GUARDADO EN SUPABASE
  // ==========================================
  async function guardarInspeccion(e) {
    e.preventDefault();
    if (!usuarioActual) { mostrarAlerta('error', '🔐 Inicie sesión para guardar'); return; }
    if (!vehicleIdInput.value) { mostrarAlerta('error', 'Busque un vehículo primero'); return; }

    btnSubmit.disabled = true;
    btnSubmit.querySelector('.btn-text').style.display = 'none';
    btnSubmit.querySelector('.btn-loader').style.display = 'inline';

    try {
      // Recolectar datos del formulario
      const payload = {
        vehiculo_id: vehicleIdInput.value,
        n_inspeccion: autoFields.n_inspeccion.value,
        fecha_inspeccion: autoFields.fecha_inspeccion.value,
        hora: autoFields.hora.value,
        motivo: autoFields.motivo_inspeccion.value,
        lugar: autoFields.lugar.value,
        asignacion: autoFields.asignacion.value,
        supervision: autoFields.supervision.value,
        placa: autoFields.placa.value,
        marca: autoFields.marca.value,
        modelo: autoFields.modelo.value,
        ano: autoFields.ano.value,
        tipo: autoFields.tipo.value,
        color: autoFields.color.value,
        n_identificacion: autoFields.n_identificacion.value,
        s_carroceria: autoFields.s_carroceria.value,
        kms: parseFloat(autoFields.kms.value) || 0,
        inspector: usuarioActual.email || 'sistema',
        created_at: new Date().toISOString()
      };

      // ⚠️ Asegúrate que la tabla y columnas coincidan con tu BD
      const { error } = await supabase.from('inspecciones_pvr').insert([payload]);
      if (error) throw error;

      mostrarAlerta('success', '✅ Inspección PVR registrada correctamente');
      limpiarFormulario();

    } catch (err) {
      console.error('Error al guardar:', err);
      mostrarAlerta('error', `No se pudo guardar: ${err.message}`);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.querySelector('.btn-text').style.display = 'inline';
      btnSubmit.querySelector('.btn-loader').style.display = 'none';
    }
  }

  // ==========================================
  // 6️⃣ EVENT LISTENERS
  // ==========================================
  btnSearch?.addEventListener('click', buscarVehiculo);
  searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarVehiculo(); });
  btnClear?.addEventListener('click', limpiarFormulario);
  inspectionForm?.addEventListener('submit', guardarInspeccion);

  // Init
  setDefaults(); // Pre-generar número y fecha/hora por si acaso
  mostrarAlerta('info', '🔍 Busque un vehículo para habilitar el formulario');
});
