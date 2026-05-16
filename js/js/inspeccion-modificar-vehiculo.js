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

  const searchInput = document.getElementById('searchInspection');
  const btnSearch = document.getElementById('btnSearch');
  const btnSearchText = btnSearch?.querySelector('.btn-search-text');
  const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
  const inspectionForm = document.getElementById('inspectionForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnClear = document.getElementById('btnClear');
  const recordIdInput = document.getElementById('recordId');
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

  function setInput(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }
  function setSelect(id, val) { const el = document.getElementById(id); if (el) el.value = val || ''; }
  function setRadio(name, val) { 
    document.querySelectorAll(`input[name="${name}"]`).forEach(r => r.checked = (r.value === val));
  }

  function updatePreview() {
    const v = id => document.getElementById(id)?.value || '-';
    const vr = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '-';
    const vs = id => { const el = document.getElementById(id); return el?.options[el.selectedIndex]?.text || '-'; }
    
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

  async function buscarInspeccion() {
    const rawQuery = searchInput?.value.trim();
    if (!rawQuery) { mostrarAlerta('info', 'Ingrese N° Inspección o Placa para buscar'); return; }
    
    if (btnSearch) { btnSearch.disabled = true; btnSearchText.style.display = 'none'; btnSearchLoader.style.display = 'inline'; }
    mostrarAlerta('info', '🔍 Cargando inspección...');

    try {
      const q = rawQuery.replace(/\s+/g, '').toUpperCase();
      const { data, error } = await supabase.from('inspecciones_pvr').select('*')
        .or(`n_inspeccion.ilike.${q},placa.ilike.${q}`)
        .limit(1).maybeSingle();

      if (error) throw error;
      if (!data) { mostrarAlerta('error', '❌ Inspección no encontrada.'); toggleFormState(false); return; }

      recordIdInput.value = data.id;
      setInput('n_inspeccion', data.n_inspeccion);
      setInput('fecha_inspeccion', data.fecha_inspeccion);
      setInput('hora', data.hora);
      setInput('motivo_inspeccion', data.motivo);
      setInput('lugar', data.lugar);
      setInput('asignacion', data.asignacion);
      setInput('supervision', data.supervision);
      setInput('placa', data.placa);
      setInput('marca', data.marca);
      setInput('modelo', data.modelo);
      setInput('ano', data.ano);
      setInput('tipo', data.tipo);
      setInput('color', data.color);
      setInput('n_identificacion', data.n_identificacion);
      setInput('s_carroceria', data.s_carroceria);
      setInput('kms', data.kms);
      setInput('rin_numero', data.rin_numero);
      setInput('observaciones', data.observaciones);
      setInput('coord_nombre', data.coord_nombre);
      setSelect('coord_rango', data.coord_rango);
      setInput('coord_cedula', data.coord_cedula);
      setInput('coord_telefono', data.coord_telefono);
      setInput('insp_nombre', data.insp_nombre);
      setSelect('insp_rango', data.insp_rango);
      setInput('insp_cedula', data.insp_cedula);
      setInput('insp_telefono', data.insp_telefono);
      
      // Accesorios
      setSelect('bateria', data.bateria); setSelect('estacion_base', data.estacion_base);
      setSelect('coctelera', data.coctelera); setSelect('triangulo', data.triangulo);
      setSelect('placas', data.placas); setSelect('herramientas', data.herramientas);
      setSelect('gato', data.gato); setSelect('sestacion_luces', data.sestacion_luces);
      
      // Cauchos
      setRadio('caucho_del_izq', data.caucho_del_izq); setRadio('caucho_del_der', data.caucho_del_der);
      setRadio('caucho_tra_izq', data.caucho_tra_izq); setRadio('caucho_tra_der', data.caucho_tra_der);
      setRadio('caucho_repuesto', data.caucho_repuesto); setRadio('tapa_cauchos', data.tapa_cauchos);
      
      // Componentes (Todos los ~76 radios)
      const compNames = [
        'guardafango_del_izq','guardafango_del_der','guardafango_tra_izq','guardafango_tra_der',
        'puerta_del_izq','puerta_del_der','puerta_tra_izq','puerta_tra_der','parachoque_trasero','parachoque_delantero',
        'capot','puerta_cabina','parabrisas_trasero','parabrisas_delantero','espejo_der','espejo_izq','cables_bateria',
        'tapa_gasolina','caja_velocidades','asientos_delanteros','vidrio_lat_del_izq','vidrio_lat_del_der','vidrio_lat_tra_izq',
        'vidrio_lat_tra_der','antena_gps','limpia_parabrisas','tablero_instrum','tablero_aa','stop_tras_der','stop_tras_izq',
        'faro_del_der','faro_del_izq','buche_del_der','buche_del_izq','buche_tras_der','buche_tras_izq','coctelera_comp',
        'tapa_radiador','tapa_distribuidor','asientos_traseros','volante','corneta','reproductor','luces_der','luces_izq',
        'faros_neblina_der','faros_neblina_izq','cerradura_der','cerradura_izq','bombonas_gas','cinturones','camara_motor',
        'electroventilador','alternador','compresor_aa','radiador_comp','aspa_radiador','varilla_aceite','tapa_bomba_hidr',
        'espoilder_del','radiador_aa','arranque','computadora','bomba_freno','bomba_direccion','fan_cooler','cajetin_direccion',
        'diferencial_trans','disco_freno_d_der','disco_freno_d_izq','tambor_freno_t_der','tambor_freno_t_izq','cuerpo_aceleracion',
        'parrilla_delantera','llave_cruz','cuña_inmovilizacion','extintor','cenicero','cardan_del','cardan_tras'
      ];
      compNames.forEach(name => setRadio(name, data[name]));

      toggleFormState(true);
      updatePreview();
      mostrarAlerta('success', '✅ Inspección cargada. Puede modificar y actualizar.');
    } catch (err) {
      console.error('❌ Error búsqueda:', err); 
      mostrarAlerta('error', `Error: ${err.message}`);
    } finally {
      if (btnSearch) { btnSearch.disabled = false; btnSearchText.style.display = 'inline'; btnSearchLoader.style.display = 'none'; }
    }
  }

  function limpiarFormulario() {
    searchInput.value = ''; recordIdInput.value = ''; toggleFormState(false);
    inspectionForm.reset(); updatePreview();
    mostrarAlerta('info', 'Ingrese N° Inspección o Placa para buscar');
  }

  function getComponentesValues() {
    const componentes = {};
    document.querySelectorAll('.inspection-item input[type="radio"]').forEach(r => { 
      if (!componentes[r.name]) componentes[r.name] = 'NT'; 
      if (r.checked) componentes[r.name] = r.value; 
    });
    return componentes;
  }

  // 🎧 Event Listeners
  btnSearch?.addEventListener('click', buscarInspeccion);
  searchInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') buscarInspeccion(); });
  btnClear?.addEventListener('click', limpiarFormulario);
  
  inspectionForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!usuarioActual) { mostrarAlerta('error', '🔐 Inicie sesión para guardar'); return; }
    if (!recordIdInput.value) { mostrarAlerta('error', 'Debe cargar una inspección primero'); return; }
    
    const rinVal = document.getElementById('rin_numero')?.value;
    if (rinVal && !/^\d{2}$/.test(rinVal)) { mostrarAlerta('error', 'El Nº de Rin debe contener exactamente 2 dígitos.'); return; }
    
    btnSubmit.disabled = true; btnSubmit.querySelector('.btn-text').style.display = 'none'; btnSubmit.querySelector('.btn-loader').style.display = 'inline';
    try {
      const payload = {
        fecha_inspeccion: document.getElementById('fecha_inspeccion')?.value,
        hora: document.getElementById('hora')?.value,
        motivo: document.getElementById('motivo_inspeccion')?.value,
        lugar: document.getElementById('lugar')?.value, asignacion: document.getElementById('asignacion')?.value,
        supervision: document.getElementById('supervision')?.value, kms: parseFloat(document.getElementById('kms')?.value) || 0,
        inspector: usuarioActual.email || 'sistema',
        bateria: document.getElementById('bateria')?.value || 'NO', estacion_base: document.getElementById('estacion_base')?.value || 'NO',
        coctelera: document.getElementById('coctelera')?.value || 'NO', triangulo: document.getElementById('triangulo')?.value || 'NO',
        placas: document.getElementById('placas')?.value || 'NO', herramientas: document.getElementById('herramientas')?.value || 'NO',
        gato: document.getElementById('gato')?.value || 'NO', sestacion_luces: document.getElementById('sestacion_luces')?.value || 'NO',
        caucho_del_izq: document.querySelector('input[name="caucho_del_izq"]:checked')?.value || 'M',
        caucho_del_der: document.querySelector('input[name="caucho_del_der"]:checked')?.value || 'M',
        caucho_tra_izq: document.querySelector('input[name="caucho_tra_izq"]:checked')?.value || 'M',
        caucho_tra_der: document.querySelector('input[name="caucho_tra_der"]:checked')?.value || 'M',
        caucho_repuesto: document.querySelector('input[name="caucho_repuesto"]:checked')?.value || 'M',
        tapa_cauchos: document.querySelector('input[name="tapa_cauchos"]:checked')?.value || 'NO',
        rin_numero: rinVal || '', observaciones: document.getElementById('observaciones')?.value || '',
        coord_nombre: document.getElementById('coord_nombre')?.value, coord_rango: document.getElementById('coord_rango')?.value,
        coord_cedula: document.getElementById('coord_cedula')?.value, coord_telefono: document.getElementById('coord_telefono')?.value,
        insp_nombre: document.getElementById('insp_nombre')?.value, insp_rango: document.getElementById('insp_rango')?.value,
        insp_cedula: document.getElementById('insp_cedula')?.value, insp_telefono: document.getElementById('insp_telefono')?.value,
        ...getComponentesValues()
      };

      const { error } = await supabase.from('inspecciones_pvr').update(payload).eq('id', recordIdInput.value);
      if (error) throw error; 
      
      mostrarAlerta('success', '✅ Inspección actualizada correctamente');
      alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { limpiarFormulario(); }, 3000);
    } catch (err) { 
      console.error('Error al actualizar:', err); 
      mostrarAlerta('error', `No se pudo actualizar: ${err.message}`); 
    } finally { 
      btnSubmit.disabled = false; btnSubmit.querySelector('.btn-text').style.display = 'inline'; btnSubmit.querySelector('.btn-loader').style.display = 'none'; 
    }
  });

  inspectionForm?.addEventListener('input', updatePreview);
  inspectionForm?.addEventListener('change', updatePreview);

  updatePreview();
  mostrarAlerta('info', '🔍 Busque una inspección para habilitar la edición');
});
