document.addEventListener('DOMContentLoaded', async () => {
  async function initSupabase() {
    let attempts = 0;
    while (!window.supabase && attempts < 50) { await new Promise(res => setTimeout(res, 100)); attempts++; }
    if (!window.supabase) { mostrarAlerta('error', '❌ No se cargó Supabase. Recargue la página.'); return null; }
    if (window.supabase.auth) return window.supabase;
    const createFn = window.supabase.createClient || window.createClient;
    if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try { window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY); return window.supabase; } 
      catch (err) { console.error('❌ Error init Supabase:', err); return null; }
    }
    return null;
  }

  const supabase = await initSupabase();
  if (!supabase) return;

  let usuarioActual = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) { usuarioActual = user; const el = document.getElementById('userEmail'); if (el) el.textContent = user.email || 'Usuario'; }
  } catch (err) { console.warn('Sesión no verificada'); }

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

  function mostrarAlerta(tipo, mensaje) {
    [alertSuccess, alertError, alertInfo].forEach(el => { if (el) el.style.display = 'none'; });
    const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
    if (target) { target.querySelector('span:last-child').textContent = mensaje; target.style.display = 'flex'; }
  }

  function toggleFormState(activo) {
    inspectionForm.style.opacity = activo ? '1' : '0.6';
    inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
    btnSubmit.disabled = !activo || !usuarioActual;
    if (!usuarioActual && btnSubmit) btnSubmit.title = '🔐 Requiere iniciar sesión';
  }

  function generarNInspeccion() {
    const now = new Date();
    const yyyy = now.getFullYear(); const mm = String(now.getMonth() + 1).padStart(2, '0'); const dd = String(now.getDate()).padStart(2, '0');
    const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
    return `PVR-${yyyy}${mm}${dd}-${rand}`;
  }

  function setDefaults() {
    const now = new Date();
    const f = document.getElementById('fecha_inspeccion'); if (f) f.value = now.toISOString().split('T')[0];
    const h = document.getElementById('hora'); if (h) h.value = now.toTimeString().slice(0, 5);
    const n = document.getElementById('n_inspeccion'); if (n) n.value = generarNInspeccion();
  }

  async function buscarVehiculo() {
    const query = searchInput?.value.trim();
    if (!query) { mostrarAlerta('info', 'Ingrese datos para búsqueda exacta'); return; }
    if (btnSearch) { btnSearch.disabled = true; btnSearchText.style.display = 'none'; btnSearchLoader.style.display = 'inline'; }
    mostrarAlerta('info', '🔍 Buscando...');

    try {
      const { data, error } = await supabase.from('vehiculos').select('*')
        .or(`placa.eq.${query},facsimil.eq.${query},s_carroceria.eq.${query},s_motor.eq.${query}`).maybeSingle();
      if (error) throw error;
      if (!data) { mostrarAlerta('error', '❌ Vehículo no encontrado. Verifique los datos.'); toggleFormState(false); return; }

      document.getElementById('placa').value = data.placa || '';
      document.getElementById('marca').value = data.marca?.toUpperCase() || '';
      document.getElementById('modelo').value = data.modelo?.toUpperCase() || '';
      document.getElementById('ano').value = data.ano || '';
      document.getElementById('tipo').value = data.tipo || '';
      document.getElementById('color').value = data.color || '';
      document.getElementById('n_identificacion').value = data.n_identificacion || '';
      document.getElementById('s_carroceria').value = data.s_carroceria || '';
      vehicleIdInput.value = data.id;

      setDefaults();
      toggleFormState(true);
      mostrarAlerta('success', '✅ Vehículo encontrado. Complete motivo, KMS, cauchos y responsables.');
    } catch (err) {
      console.error('Error búsqueda:', err); mostrarAlerta('error', `Error: ${err.message}`);
    } finally {
      if (btnSearch) { btnSearch.disabled = false; btnSearchText.style.display = 'inline'; btnSearchLoader.style.display = 'none'; }
    }
  }

  function limpiarFormulario() {
    searchInput.value = ''; toggleFormState(false); inspectionForm.reset(); vehicleIdInput.value = '';
    mostrarAlerta('info', 'Ingrese datos para buscar un vehículo');
  }

  function getComponentesValues() {
    const componentes = {};
    document.querySelectorAll('.inspection-item input[type="radio"]').forEach(r => {
      if (!componentes[r.name]) componentes[r.name] = 'NT';
      if (r.checked) componentes[r.name] = r.value;
    });
    return componentes;
  }

  async function guardarInspeccion(e) {
    e.preventDefault();
    if (!usuarioActual) { mostrarAlerta('error', '🔐 Inicie sesión para guardar'); return; }
    if (!vehicleIdInput.value) { mostrarAlerta('error', 'Busque un vehículo primero'); return; }

    // Validar Rin (2 dígitos exactos)
    const rinVal = document.getElementById('rin_numero')?.value;
    if (rinVal && !/^\d{2}$/.test(rinVal)) {
      mostrarAlerta('error', 'El Nº de Rin debe contener exactamente 2 dígitos numéricos.');
      document.getElementById('rin_numero').focus();
      return;
    }

    btnSubmit.disabled = true;
    btnSubmit.querySelector('.btn-text').style.display = 'none';
    btnSubmit.querySelector('.btn-loader').style.display = 'inline';

    try {
      const payload = {
        vehiculo_id: vehicleIdInput.value,
        n_inspeccion: document.getElementById('n_inspeccion')?.value,
        fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value,
        hora: document.getElementById('hora')?.value,
        motivo: document.getElementById('motivo_inspeccion')?.value,
        lugar: document.getElementById('lugar')?.value,
        asignacion: document.getElementById('asignacion')?.value,
        supervision: document.getElementById('supervision')?.value,
        placa: document.getElementById('placa')?.value,
        marca: document.getElementById('marca')?.value,
        modelo: document.getElementById('modelo')?.value,
        ano: document.getElementById('ano')?.value,
        tipo: document.getElementById('tipo')?.value,
        color: document.getElementById('color')?.value,
        n_identificacion: document.getElementById('n_identificacion')?.value,
        s_carroceria: document.getElementById('s_carroceria')?.value,
        kms: parseFloat(document.getElementById('kms')?.value) || 0,
        inspector: usuarioActual.email || 'sistema',
        created_at: new Date().toISOString(),
        bateria: document.getElementById('bateria')?.value || 'NO',
        estacion_base: document.getElementById('estacion_base')?.value || 'NO',
        coctelera: document.getElementById('coctelera')?.value || 'NO',
        triangulo: document.getElementById('triangulo')?.value || 'NO',
        placas: document.getElementById('placas')?.value || 'NO',
        herramientas: document.getElementById('herramientas')?.value || 'NO',
        gato: document.getElementById('gato')?.value || 'NO',
        sestacion_luces: document.getElementById('sestacion_luces')?.value || 'NO',
        ...getComponentesValues(),
        // 🛞 Cauchos y Rines
        caucho_del_izq: document.querySelector('input[name="caucho_del_izq"]:checked')?.value || 'M',
        caucho_del_der: document.querySelector('input[name="caucho_del_der"]:checked')?.value || 'M',
        caucho_tra_izq: document.querySelector('input[name="caucho_tra_izq"]:checked')?.value || 'M',
        caucho_tra_der: document.querySelector('input[name="caucho_tra_der"]:checked')?.value || 'M',
        caucho_repuesto: document.querySelector('input[name="caucho_repuesto"]:checked')?.value || 'M',
        tapa_cauchos: document.querySelector('input[name="tapa_cauchos"]:checked')?.value || 'NO',
        rin_numero: rinVal || '',
        observaciones: document.getElementById('observaciones')?.value || '',
        // 👥 Responsables
        coord_nombre: document.getElementById('coord_nombre')?.value || '',
        coord_rango: document.getElementById('coord_rango')?.value || '',
        coord_cedula: document.getElementById('coord_cedula')?.value || '',
        coord_telefono: document.getElementById('coord_telefono')?.value || '',
        insp_nombre: document.getElementById('insp_nombre')?.value || '',
        insp_rango: document.getElementById('insp_rango')?.value || '',
        insp_cedula: document.getElementById('insp_cedula')?.value || '',
        insp_telefono: document.getElementById('insp_telefono')?.value || ''
      };

      const { error } = await supabase.from('inspecciones_pvr').insert([payload]);
      if (error) throw error;
      mostrarAlerta('success', '✅ Inspección PVR registrada correctamente');
      limpiarFormulario();
    } catch (err) {
      console.error('Error al guardar:', err); mostrarAlerta('error', `No se pudo guardar: ${err.message}`);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.querySelector('.btn-text').style.display = 'inline';
      btnSubmit.querySelector('.btn-loader').style.display = 'none';
    }
  }

  btnSearch?.addEventListener('click', buscarVehiculo);
  searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarVehiculo(); });
  btnClear?.addEventListener('click', limpiarFormulario);
  inspectionForm?.addEventListener('submit', guardarInspeccion);

  setDefaults();
  mostrarAlerta('info', '🔍 Busque un vehículo para habilitar el formulario');
});
