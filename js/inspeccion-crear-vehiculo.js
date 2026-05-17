// inspeccion-crear-vehiculo.js
document.addEventListener('DOMContentLoaded', async () => {
  // 🔹 1. INICIALIZACIÓN DE SUPABASE
  async function initSupabase() {
    let attempts = 0;
    while (!window.supabase && attempts < 50) { await new Promise(res => setTimeout(res, 100)); attempts++; }
    if (!window.supabase) { console.error('❌ Supabase no cargado'); return null; }
    if (window.supabase.auth) return window.supabase;
    if (window.SUPABASE_URL && window.SUPABASE_KEY) {
      try { window.supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY); return window.supabase; }
      catch (err) { console.error('❌ Error init:', err); return null; }
    }
    return null;
  }
  const supabase = await initSupabase();
  if (!supabase) return;

  let usuarioActual = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      usuarioActual = session.user;
      document.getElementById('userEmail').textContent = session.user.email;
    }
  } catch (err) { console.warn('Sesión no verificada'); }

  // 🔹 2. REFERENCIAS DOM (✅ ACTUALIZADO A searchUniversal)
  const searchInput = document.getElementById('searchUniversal'); // <-- CAMBIO AQUÍ
  const btnSearch = document.getElementById('btnSearch');
  const inspectionForm = document.getElementById('inspectionForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnClear = document.getElementById('btnClear');
  const vehicleIdInput = document.getElementById('vehicleId');
  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');

  // 🔹 3. FUNCIONES AUXILIARES
  function mostrarAlerta(tipo, mensaje) {
    [alertSuccess, alertError, alertInfo].forEach(el => { if (el) el.style.display = 'none'; });
    const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
    if (target) { target.querySelector('span:last-child').textContent = mensaje; target.style.display = 'flex'; }
  }
  function toggleFormState(activo) {
    inspectionForm.style.opacity = activo ? '1' : '0.6';
    inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
    btnSubmit.disabled = !activo || !usuarioActual;
  }

  // 🔢 4. GENERAR N° INSPECCIÓN
  async function generarNInspeccion() {
    try {
      const { data, error } = await supabase.from('inspecciones_pvr').select('n_inspeccion').order('created_at', { ascending: false }).limit(1);
      let nextSeq = 1;
      if (data && data.length > 0 && data[0].n_inspeccion) {
        const parts = data[0].n_inspeccion.split('-');
        if (parts.length >= 3) {
          const currentSeq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(currentSeq)) nextSeq = currentSeq + 1;
        }
      }
      return `PVR-${new Date().getFullYear()}-${String(nextSeq).padStart(7, '0')}`;
    } catch { return `PVR-${new Date().getFullYear()}-0000001`; }
  }
  async function setDefaults() {
    const now = new Date();
    if (document.getElementById('fecha_inspeccion')) document.getElementById('fecha_inspeccion').value = now.toISOString().split('T')[0];
    if (document.getElementById('hora')) document.getElementById('hora').value = now.toTimeString().slice(0, 5);
    if (document.getElementById('n_inspeccion')) document.getElementById('n_inspeccion').value = await generarNInspeccion();
    updatePreview();
  }

  // 🔍 5. BÚSQUEDA ROBUSTA (Usando el spinner del botón)
  async function buscarVehiculo() {
    const rawQuery = searchInput?.value.trim();
    if (!rawQuery) { mostrarAlerta('info', 'Ingrese Placa, ID, Facsímil o Serial para buscar'); return; }
    
    // Mostrar Loader en el botón
    if (btnSearch) btnSearch.classList.add('searching');
    mostrarAlerta('info', '🔍 Buscando en base de datos...');
    
    try {
      const q = rawQuery.toUpperCase();
      // Buscamos por Placa, Facsímil, Seriales o N° Identificación
      const { data, error } = await supabase.from('vehiculos').select('*')
        .or(`placa.eq.${q},facsimil.eq.${q},s_carroceria.eq.${q},s_motor.eq.${q},n_identificacion.eq.${q}`)
        .limit(1);
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        mostrarAlerta('error', '❌ No se encontró ningún vehículo con: ' + rawQuery);
        toggleFormState(false);
        return;
      }
      
      const vehiculo = data[0];
      console.log('✅ Vehículo encontrado:', vehiculo);
      
      // Llenar datos automáticos
      document.getElementById('placa').value = vehiculo.placa || '';
      document.getElementById('marca').value = vehiculo.marca?.toUpperCase() || '';
      document.getElementById('modelo').value = vehiculo.modelo?.toUpperCase() || '';
      document.getElementById('ano').value = vehiculo.ano || '';
      document.getElementById('tipo').value = vehiculo.tipo || '';
      document.getElementById('color').value = vehiculo.color || '';
      document.getElementById('n_identificacion').value = vehiculo.n_identificacion || '';
      document.getElementById('s_carroceria').value = vehiculo.s_carroceria || '';
      vehicleIdInput.value = vehiculo.id;
      
      setDefaults();
      toggleFormState(true);
      mostrarAlerta('success', '✅ Vehículo encontrado: ' + vehiculo.marca + ' ' + vehiculo.modelo);
      
    } catch (err) {
      console.error('❌ Error búsqueda:', err);
      mostrarAlerta('error', `Error: ${err.message}`);
    } finally {
      if (btnSearch) btnSearch.classList.remove('searching'); // Quitar Loader
    }
  }

  // 🗑️ 6. LIMPIAR FORMULARIO
  function limpiarFormulario() {
    if (searchInput) searchInput.value = '';
    toggleFormState(false);
    if (inspectionForm) inspectionForm.reset();
    if (vehicleIdInput) vehicleIdInput.value = '';
    mostrarAlerta('info', '🔍 Busque un vehículo para habilitar el formulario');
    setDefaults();
  }

  // 👁️ 7. VISTA PREVIA (Resumida para el ejemplo)
  function updatePreview() {
    const v = id => document.getElementById(id)?.value || '-';
    document.getElementById('pv_n_inspeccion').textContent = v('n_inspeccion');
    document.getElementById('pv_fecha').textContent = v('fecha_inspeccion');
    document.getElementById('pv_hora').textContent = v('hora');
    document.getElementById('pv_placa').textContent = v('placa');
    document.getElementById('pv_marca_modelo').textContent = `${v('marca')} ${v('modelo')}`;
    document.getElementById('pv_ano_tipo').textContent = `${v('ano')} - ${v('tipo')}`;
    document.getElementById('pv_color').textContent = v('color');
    // ... [Mantén el resto de tu lógica updatePreview igual] ...
  }

  // 🎧 8. EVENT LISTENERS
  btnSearch?.addEventListener('click', buscarVehiculo);
  searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarVehiculo(); });
  btnClear?.addEventListener('click', limpiarFormulario);
  
  // Submit Form
  inspectionForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!usuarioActual) return mostrarAlerta('error', '🔐 Inicie sesión');
    if (!vehicleIdInput.value) return mostrarAlerta('error', 'Busque un vehículo primero');
    
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
        // ... [Agrega el resto de campos igual que antes] ...
        placa: document.getElementById('placa')?.value,
        marca: document.getElementById('marca')?.value,
        modelo: document.getElementById('modelo')?.value,
        ano: document.getElementById('ano')?.value,
        tipo: document.getElementById('tipo')?.value,
        color: document.getElementById('color')?.value,
        n_identificacion: document.getElementById('n_identificacion')?.value,
        s_carroceria: document.getElementById('s_carroceria')?.value
      };
      const { error } = await supabase.from('inspecciones_pvr').insert([payload]);
      if (error) throw error;
      mostrarAlerta('success', '✅ Inspección registrada');
      setTimeout(() => limpiarFormulario(), 2000);
    } catch (err) {
      console.error(err);
      mostrarAlerta('error', `Error al guardar: ${err.message}`);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.querySelector('.btn-text').style.display = 'inline';
      btnSubmit.querySelector('.btn-loader').style.display = 'none';
    }
  });
  
  inspectionForm?.addEventListener('input', updatePreview);
  
  setDefaults();
  mostrarAlerta('info', '🔍 Busque un vehículo para habilitar el formulario');
});
