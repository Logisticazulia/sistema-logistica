document.addEventListener('DOMContentLoaded', async () => {
  // 🔧 INICIALIZACIÓN DE SUPABASE
  async function initSupabase() {
    let attempts = 0;
    while (!window.supabase && attempts < 50) {
      await new Promise(res => setTimeout(res, 100));
      attempts++;
    }
    if (!window.supabase) {
      mostrarAlerta('error', '❌ No se cargó Supabase. Recargue la página.');
      return null;
    }
    if (window.supabase.auth) return window.supabase;
    const createFn = window.supabase.createClient || window.createClient;
    if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try {
        window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY);
        return window.supabase;
      } catch (err) {
        console.error('❌ Error init Supabase:', err);
        return null;
      }
    }
    return null;
  }

  const supabase = await initSupabase();
  if (!supabase) return;

  // 👤 VERIFICACIÓN DE SESIÓN
  let usuarioActual = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      usuarioActual = user;
      const el = document.getElementById('userEmail');
      if (el) el.textContent = user.email || 'Usuario';
    }
  } catch (err) {
    console.warn('Sesión no verificada');
  }

  // 🎯 REFERENCIAS DEL DOM
  const searchInput = document.getElementById('searchVehicle');
  const btnSearch = document.getElementById('btnSearch');
  const btnSearchText = btnSearch?.querySelector('.btn-search-text');
  const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
  const inspectionForm = document.getElementById('inspectionForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnClear = document.getElementById('btnClearSearch') || document.getElementById('btnClear');
  const vehicleIdInput = document.getElementById('vehicleId');
  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');

  // 🔔 FUNCIONES DE ALERTAS
  function mostrarAlerta(tipo, mensaje) {
    [alertSuccess, alertError, alertInfo].forEach(el => {
      if (el) el.style.display = 'none';
    });
    const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
    if (target) {
      target.querySelector('span:last-child').textContent = mensaje;
      target.style.display = 'flex';
      if (tipo !== 'error') {
        setTimeout(() => { target.style.display = 'none'; }, 5000);
      }
    }
  }

  // 🔐 CONTROL DE ESTADO DEL FORMULARIO
  function toggleFormState(activo) {
    inspectionForm.style.opacity = activo ? '1' : '0.6';
    inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
    btnSubmit.disabled = !activo || !usuarioActual;
    if (!usuarioActual && btnSubmit) {
      btnSubmit.title = '🔐 Requiere iniciar sesión';
    }
  }

  // 🆕 GENERAR NÚMERO DE INSPECCIÓN SECUENCIAL
  async function generarNInspeccion() {
    const now = new Date();
    const y = now.getFullYear();
    try {
      const { data, error } = await supabase
        .from('inspecciones_pvr')
        .select('n_inspeccion')
        .like('n_inspeccion', `PVR-${y}%`)
        .order('n_inspeccion', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;

      let nextSeq = 1;
      if (data && data.n_inspeccion) {
        const match = data.n_inspeccion.match(/(\d+)$/);
        if (match) {
          nextSeq = parseInt(match[1], 10) + 1;
        }
      }
      return `PVR-${y}-${String(nextSeq).padStart(7, '0')}`;
    } catch (err) {
      console.error('Error generando número:', err);
      return `PVR-${y}-${String(Math.floor(Math.random() * 10000000)).padStart(7, '0')}`;
    }
  }

  // 📝 ESTABLECER VALORES POR DEFECTO
  function setDefaults() {
    const now = new Date();
    const f = document.getElementById('fecha_inspeccion');
    if (f) f.value = now.toISOString().split('T')[0];
    const h = document.getElementById('hora');
    if (h) h.value = now.toTimeString().slice(0, 5);
    
    const n = document.getElementById('n_inspeccion');
    if (n) {
      n.value = 'Generando...';
      generarNInspeccion().then(num => { n.value = num; });
    }
    updatePreview();
  }

  // 📋 HELPERS PARA LLENAR FORMULARIO
  function setInput(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  }
  function setSelect(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
  }
  function setRadio(name, val) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
      r.checked = (r.value === val);
    });
  }

  // 👁️ ACTUALIZAR VISTA PREVIA
  function updatePreview() {
    const v = id => document.getElementById(id)?.value || '-';
    const vr = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '-';
    const vs = id => {
      const el = document.getElementById(id);
      return el?.options[el.selectedIndex]?.text || '-';
    };

    document.getElementById('pv_n_inspeccion').textContent = v('n_inspeccion');
    document.getElementById('pv_fecha').textContent = v('fecha_inspeccion');
    document.getElementById('pv_hora').textContent = v('hora');
    document.getElementById('pv_motivo').textContent = v('motivo_inspeccion');
    document.getElementById('pv_lugar').textContent = `${v('lugar')} / ${v('asignacion')}`;
    document.getElementById('pv_placa').textContent = v('placa');
    document.getElementById('pv_marca_modelo').textContent = `${v('marca')} ${v('modelo')}`;
    document.getElementById('pv_ano_tipo').textContent = `${v('ano')} - ${v('tipo')}`;
    document.getElementById('pv_color').textContent = v('color');
    document.getElementById('pv_s_carroceria').textContent = v('s_carroceria');
    document.getElementById('pv_n_id').textContent = v('n_identificacion');
    document.getElementById('pv_kms').textContent = v('kms');
    document.getElementById('pv_rin').textContent = v('rin_numero');
    document.getElementById('pv_bateria').textContent = vs('bateria');
    document.getElementById('pv_est_base').textContent = vs('estacion_base');
    document.getElementById('pv_coctelera').textContent = vs('coctelera');
    document.getElementById('pv_triangulo').textContent = vs('triangulo');
    document.getElementById('pv_placas').textContent = vs('placas');
    document.getElementById('pv_herramientas').textContent = vs('herramientas');
    document.getElementById('pv_gato').textContent = vs('gato');
    document.getElementById('pv_luces').textContent = vs('sestacion_luces');
    document.getElementById('pv_ca_d_izq').textContent = vr('caucho_del_izq');
    document.getElementById('pv_ca_d_der').textContent = vr('caucho_del_der');
    document.getElementById('pv_ca_t_izq').textContent = vr('caucho_tra_izq');
    document.getElementById('pv_ca_t_der').textContent = vr('caucho_tra_der');
    document.getElementById('pv_ca_rep').textContent = vr('caucho_repuesto');
    document.getElementById('pv_tapa').textContent = vr('tapa_cauchos');
    document.getElementById('pv_observaciones').textContent = v('observaciones') || 'Sin observaciones.';
    document.getElementById('pv_coord_nombre').textContent = v('coord_nombre');
    document.getElementById('pv_coord_rango').textContent = vs('coord_rango');
    document.getElementById('pv_coord_cedula').textContent = v('coord_cedula');
    document.getElementById('pv_insp_nombre').textContent = v('insp_nombre');
    document.getElementById('pv_insp_rango').textContent = vs('insp_rango');
    document.getElementById('pv_insp_cedula').textContent = v('insp_cedula');

    const compGrid = document.getElementById('pv_comps_grid');
    if (compGrid) {
      compGrid.innerHTML = '';
      document.querySelectorAll('.inspection-item').forEach(item => {
        const label = item.querySelector('.item-label')?.textContent || '';
        const radio = item.querySelector('input:checked');
        const val = radio?.value || '-';
        const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : val === 'NT' ? 'status-NT' : '';
        const div = document.createElement('div');
        div.className = 'pv-comp';
        div.innerHTML = `<div class="pv-comp-label">${label}</div><div class="pv-comp-status ${cls}">${val}</div>`;
        compGrid.appendChild(div);
      });
    }
  }

  // 🔍 BUSCAR VEHÍCULO EN BASE DE DATOS
  async function buscarVehiculo() {
    const rawQuery = searchInput?.value.trim();
    if (!rawQuery) {
      mostrarAlerta('info', 'Ingrese Placa, Facsímil, S/Carrocería o S/Motor para buscar');
      return;
    }

    // 🔄 Estado de carga
    if (btnSearch) {
      btnSearch.disabled = true;
      if (btnSearchText) btnSearchText.style.display = 'none';
      if (btnSearchLoader) btnSearchLoader.style.display = 'inline';
    }

    mostrarAlerta('info', '🔍 Buscando vehículo...');

    try {
      const q = rawQuery.replace(/\s+/g, '').toUpperCase();
      
      // 🔵 Buscar en tabla vehiculos con filtro para excluir motos
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .or(`placa.ilike.%${q}%,facsimil.ilike.%${q}%,s_carroceria.ilike.%${q}%,s_motor.ilike.%${q}%`)
        .not('tipo', 'ilike', '%moto%')
        .not('clase', 'ilike', '%moto%')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        mostrarAlerta('error', '❌ Vehículo no encontrado. Verifique los datos e intente nuevamente.');
        toggleFormState(false);
        return;
      }

      // Validar que no sea moto
      const tipo = (data.tipo || '').toLowerCase();
      const clase = (data.clase || '').toLowerCase();
      if (tipo.includes('moto') || clase.includes('moto')) {
        mostrarAlerta('error', '⚠️ Este es un vehículo tipo MOTO. Use la sección "Crear Inspección para Motos".');
        toggleFormState(false);
        return;
      }

      // 🎯 Llenar formulario con datos del vehículo
      vehicleIdInput.value = data.id;
      setInput('placa', data.placa);
      setInput('marca', data.marca);
      setInput('modelo', data.modelo);
      setInput('ano', data.ano);
      setInput('tipo', data.tipo);
      setInput('color', data.color);
      setInput('s_carroceria', data.s_carroceria);
      setInput('n_identificacion', data.n_identificacion);

      // Generar número de inspección y fechas por defecto
      setDefaults();

      // Activar formulario
      toggleFormState(true);
      updatePreview();
      mostrarAlerta('success', `✅ Vehículo ${data.placa || data.marca} encontrado. Complete la inspección.`);
      
      // Scroll hacia el formulario
      inspectionForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('❌ Error búsqueda:', err);
      mostrarAlerta('error', `Error: ${err.message}`);
    } finally {
      // Restaurar estado del botón
      if (btnSearch) {
        btnSearch.disabled = false;
        if (btnSearchText) btnSearchText.style.display = 'inline';
        if (btnSearchLoader) btnSearchLoader.style.display = 'none';
      }
    }
  }

  // 🧹 LIMPIAR FORMULARIO
  function limpiarFormulario() {
    searchInput.value = '';
    inspectionForm.reset();
    vehicleIdInput.value = '';
    toggleFormState(false);
    updatePreview();
    setDefaults();
    mostrarAlerta('info', 'Ingrese Placa, Facsímil, S/Carrocería o S/Motor para buscar');
    searchInput?.focus();
  }

  // 📦 EXTRAER VALORES DE COMPONENTES
  function getComponentesValues() {
    const componentes = {};
    document.querySelectorAll('.inspection-item input[type="radio"]').forEach(r => {
      if (!componentes[r.name]) componentes[r.name] = 'NT';
      if (r.checked) componentes[r.name] = r.value;
    });
    return componentes;
  }

  // 🎧 EVENT LISTENERS
  btnSearch?.addEventListener('click', buscarVehiculo);
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarVehiculo();
    }
  });
  btnClear?.addEventListener('click', limpiarFormulario);

  // 📥 EVENTO DE SUBMIT (GUARDAR INSPECCIÓN)
  inspectionForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!usuarioActual) {
      mostrarAlerta('error', '🔐 Inicie sesión para guardar una inspección');
      return;
    }
    if (!vehicleIdInput.value) {
      mostrarAlerta('error', 'Busque un vehículo primero');
      return;
    }

    // Validar Nº de Rin
    const rinVal = document.getElementById('rin_numero')?.value;
    if (rinVal && !/^\d{2}$/.test(rinVal)) {
      mostrarAlerta('error', 'El Nº de Rin debe contener exactamente 2 dígitos.');
      return;
    }

    // 🔄 Estado de guardando
    btnSubmit.disabled = true;
    const btnText = btnSubmit.querySelector('.btn-text');
    const btnLoader = btnSubmit.querySelector('.btn-loader');
    if (btnText) btnText.style.display = 'none';
    if (btnLoader) btnLoader.style.display = 'inline';

    try {
      const payload = {
        vehiculo_id: parseInt(vehicleIdInput.value) || null,
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
        ano: parseInt(document.getElementById('ano')?.value) || null,
        tipo: document.getElementById('tipo')?.value,
        color: document.getElementById('color')?.value,
        s_carroceria: document.getElementById('s_carroceria')?.value,
        n_identificacion: document.getElementById('n_identificacion')?.value,
        kms: parseFloat(document.getElementById('kms')?.value) || 0,
        inspector: usuarioActual.email || 'sistema',
        // Accesorios
        bateria: document.getElementById('bateria')?.value || 'NO',
        estacion_base: document.getElementById('estacion_base')?.value || 'NO',
        coctelera: document.getElementById('coctelera')?.value || 'NO',
        triangulo: document.getElementById('triangulo')?.value || 'NO',
        placas: document.getElementById('placas')?.value || 'NO',
        herramientas: document.getElementById('herramientas')?.value || 'NO',
        gato: document.getElementById('gato')?.value || 'NO',
        sestacion_luces: document.getElementById('sestacion_luces')?.value || 'NO',
        // Cauchos
        caucho_del_izq: document.querySelector('input[name="caucho_del_izq"]:checked')?.value || 'M',
        caucho_del_der: document.querySelector('input[name="caucho_del_der"]:checked')?.value || 'M',
        caucho_tra_izq: document.querySelector('input[name="caucho_tra_izq"]:checked')?.value || 'M',
        caucho_tra_der: document.querySelector('input[name="caucho_tra_der"]:checked')?.value || 'M',
        caucho_repuesto: document.querySelector('input[name="caucho_repuesto"]:checked')?.value || 'M',
        tapa_cauchos: document.querySelector('input[name="tapa_cauchos"]:checked')?.value || 'NO',
        rin_numero: rinVal || '',
        // Observaciones y responsables
        observaciones: document.getElementById('observaciones')?.value || '',
        coord_nombre: document.getElementById('coord_nombre')?.value,
        coord_rango: document.getElementById('coord_rango')?.value,
        coord_cedula: document.getElementById('coord_cedula')?.value,
        coord_telefono: document.getElementById('coord_telefono')?.value,
        insp_nombre: document.getElementById('insp_nombre')?.value,
        insp_rango: document.getElementById('insp_rango')?.value,
        insp_cedula: document.getElementById('insp_cedula')?.value,
        insp_telefono: document.getElementById('insp_telefono')?.value,
        created_at: new Date().toISOString(),
        ...getComponentesValues()
      };

      // Limpiar campos vacíos
      Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === '' || payload[key] === undefined) {
          delete payload[key];
        }
      });

      const { error } = await supabase
        .from('inspecciones_pvr')
        .insert([payload]);

      if (error) throw error;

      mostrarAlerta('success', '✅ Inspección guardada exitosamente');
      alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setTimeout(() => {
        limpiarFormulario();
      }, 2000);

    } catch (err) {
      console.error('Error al guardar:', err);
      mostrarAlerta('error', `No se pudo guardar: ${err.message}`);
    } finally {
      btnSubmit.disabled = false;
      const btnText = btnSubmit.querySelector('.btn-text');
      const btnLoader = btnSubmit.querySelector('.btn-loader');
      if (btnText) btnText.style.display = 'inline';
      if (btnLoader) btnLoader.style.display = 'none';
    }
  });

  // 🔄 Actualizar vista previa en tiempo real
  inspectionForm?.addEventListener('input', updatePreview);
  inspectionForm?.addEventListener('change', updatePreview);

  // 🚀 INICIALIZACIÓN
  setDefaults();
  updatePreview();
  mostrarAlerta('info', '🔍 Busque un vehículo para habilitar el formulario');
});
