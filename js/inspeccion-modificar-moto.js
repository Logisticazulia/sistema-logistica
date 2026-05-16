document.addEventListener('DOMContentLoaded', async () => {
  async function initSupabase() {
    let attempts = 0;
    while (!window.supabase && attempts < 50) { await new Promise(res => setTimeout(res, 100)); attempts++; }
    if (!window.supabase) { mostrarAlerta('error', '❌ No se cargó Supabase'); return null; }
    if (window.supabase.auth) return window.supabase;
    const createFn = window.supabase.createClient || window.createClient;
    if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try { window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY); return window.supabase; }
      catch (err) { console.error('❌ Error init:', err); return null; }
    }
    return null;
  }

  const supabase = await initSupabase();
  if (!supabase) return;

  let usuarioActual = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) { const el = document.getElementById('userEmail'); if(el) el.textContent = user.email || 'Usuario'; usuarioActual = user; }
  } catch (err) { console.warn('Sesión no verificada'); }

  const searchInput = document.getElementById('searchInspection');
  const btnSearch = document.getElementById('btnSearch');
  const btnSearchText = btnSearch?.querySelector('.btn-search-text');
  const btnSearchLoader = btnSearch?.querySelector('.btn-search-loader');
  const motoForm = document.getElementById('motoForm');
  const btnSubmit = document.getElementById('btnSubmit');
  const btnClear = document.getElementById('btnClear');
  const recordIdInput = document.getElementById('recordId');
  const alertSuccess = document.getElementById('alertSuccess');
  const alertError = document.getElementById('alertError');
  const alertInfo = document.getElementById('alertInfo');

  function mostrarAlerta(tipo, mensaje) {
    [alertSuccess, alertError, alertInfo].forEach(el => { if(el) el.style.display = 'none'; });
    const target = tipo === 'success' ? alertSuccess : tipo === 'error' ? alertError : alertInfo;
    if(target) { target.querySelector('span:last-child').textContent = mensaje; target.style.display = 'flex'; }
  }

  function toggleFormState(activo) {
    motoForm.style.opacity = activo ? '1' : '0.6';
    motoForm.style.pointerEvents = activo ? 'auto' : 'none';
    btnSubmit.disabled = !activo || !usuarioActual;
  }

  async function buscarInspeccion() {
    const q = searchInput?.value.trim();
    if(!q) { mostrarAlerta('info', 'Ingrese N° Inspección o Placa'); return; }
    if(btnSearch) { btnSearch.disabled=true; btnSearchText.style.display='none'; btnSearchLoader.style.display='inline'; }
    mostrarAlerta('info', '🔍 Buscando...');
    try {
      const cleanQ = q.replace(/\s+/g, '').toUpperCase();
      const { data, error } = await supabase.from('inspecciones_pvr').select('*')
        .or(`n_inspeccion.ilike.${cleanQ},placa.ilike.${cleanQ}`).limit(1).maybeSingle();
      if(error) throw error;
      if(!data) { mostrarAlerta('error', '❌ Inspección no encontrada'); toggleFormState(false); return; }

      recordIdInput.value = data.id;
      document.getElementById('n_inspeccion').value = data.n_inspeccion || '';
      document.getElementById('fecha_inspeccion').value = data.fecha_inspeccion || '';
      document.getElementById('hora').value = data.hora || '';
      document.getElementById('motivo_inspeccion').value = data.motivo || '';
      document.getElementById('lugar').value = data.lugar || '';
      document.getElementById('asignacion').value = data.asignacion || '';
      document.getElementById('supervision').value = data.supervision || '';
      document.getElementById('placa').value = data.placa || '';
      document.getElementById('marca').value = data.marca || '';
      document.getElementById('modelo').value = data.modelo || '';
      document.getElementById('ano').value = data.ano || '';
      document.getElementById('color').value = data.color || '';
      document.getElementById('s_carroceria').value = data.s_carroceria || '';
      document.getElementById('s_motor').value = data.s_motor || '';
      document.getElementById('n_identificacion').value = data.n_identificacion || '';
      document.getElementById('observaciones').value = data.observaciones || '';
      document.getElementById('coord_nombre').value = data.coord_nombre || '';
      document.getElementById('coord_rango').value = data.coord_rango || '';
      document.getElementById('coord_cedula').value = data.coord_cedula || '';
      document.getElementById('coord_telefono').value = data.coord_telefono || '';
      document.getElementById('insp_nombre').value = data.insp_nombre || '';
      document.getElementById('insp_rango').value = data.insp_rango || '';
      document.getElementById('insp_cedula').value = data.insp_cedula || '';
      document.getElementById('insp_telefono').value = data.insp_telefono || '';

      // 🔹 Cargar componentes desde JSONB
      const comps = data.componentes_moto || {};
      document.querySelectorAll('.inspection-item input[type="radio"]').forEach(r => {
        r.checked = (comps[r.name] === r.value);
      });

      toggleFormState(true);
      updatePreview();
      mostrarAlerta('success', '✅ Inspección cargada. Edite y actualice.');
    } catch(err) { console.error(err); mostrarAlerta('error', `Error: ${err.message}`); }
    finally { if(btnSearch) { btnSearch.disabled=false; btnSearchText.style.display='inline'; btnSearchLoader.style.display='none'; } }
  }

  function limpiarFormulario() {
    searchInput.value = ''; motoForm.reset(); recordIdInput.value = ''; toggleFormState(false); updatePreview();
    mostrarAlerta('info', 'Ingrese N° Inspección o Placa para buscar');
  }

  function updatePreview() {
    const v = id => document.getElementById(id)?.value || '-';
    const vs = id => { const el = document.getElementById(id); return el?.options[el.selectedIndex]?.text || '-'; }
    
    document.getElementById('pv_n_inspeccion').textContent = v('n_inspeccion');
    document.getElementById('pv_fecha').textContent = v('fecha_inspeccion');
    document.getElementById('pv_hora').textContent = v('hora');
    document.getElementById('pv_motivo').textContent = v('motivo_inspeccion');
    document.getElementById('pv_lugar').textContent = `${v('lugar')} / ${v('asignacion')}`;
    document.getElementById('pv_placa').textContent = v('placa');
    document.getElementById('pv_marca_modelo').textContent = `${v('marca')} ${v('modelo')}`;
    document.getElementById('pv_ano_tipo').textContent = `${v('ano')} - MOTO`;
    document.getElementById('pv_color').textContent = v('color');
    document.getElementById('pv_s_carroceria').textContent = v('s_carroceria');
    document.getElementById('pv_s_motor').textContent = v('s_motor');
    document.getElementById('pv_n_id').textContent = v('n_identificacion');
    document.getElementById('pv_observaciones').textContent = v('observaciones') || 'Sin observaciones.';
    document.getElementById('pv_coord_nombre').textContent = v('coord_nombre');
    document.getElementById('pv_coord_rango').textContent = vs('coord_rango');
    document.getElementById('pv_coord_cedula').textContent = v('coord_cedula');
    document.getElementById('pv_insp_nombre').textContent = v('insp_nombre');
    document.getElementById('pv_insp_rango').textContent = vs('insp_rango');
    document.getElementById('pv_insp_cedula').textContent = v('insp_cedula');

    const compGrid = document.getElementById('pv_comps_grid');
    if(compGrid) {
      compGrid.innerHTML = '';
      document.querySelectorAll('.inspection-item').forEach(item => {
        const label = item.querySelector('.item-label')?.textContent || '';
        const radio = item.querySelector('input:checked');
        const val = radio?.value || 'NT';
        const cls = val === 'B' ? 'status-B' : val === 'M' ? 'status-M' : 'status-NT';
        const div = document.createElement('div');
        div.className = 'pv-comp';
        div.innerHTML = `<div class="pv-comp-label">${label}</div><div class="pv-comp-status ${cls}">${val}</div>`;
        compGrid.appendChild(div);
      });
    }
  }

  function getComponentesMotoValues() {
    const componentes = {};
    document.querySelectorAll('.inspection-item input[type="radio"]').forEach(r => { 
      if (!componentes[r.name]) componentes[r.name] = 'NT'; 
      if (r.checked) componentes[r.name] = r.value; 
    });
    return componentes;
  }

  btnSearch?.addEventListener('click', buscarInspeccion);
  searchInput?.addEventListener('keypress', e => { if(e.key==='Enter') buscarInspeccion(); });
  btnClear?.addEventListener('click', limpiarFormulario);
  motoForm?.addEventListener('input', updatePreview);
  motoForm?.addEventListener('change', updatePreview);

  motoForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if(!usuarioActual) { mostrarAlerta('error','🔐 Inicie sesión'); return; }
    if(!recordIdInput.value) { mostrarAlerta('error','Busque una inspección primero'); return; }
    
    btnSubmit.disabled = true;
    try {
      const toIntOrNull = val => { const num = parseInt(val, 10); return isNaN(num) || val === '' ? null : num; };
      const payload = {
        fecha_inspeccion: document.getElementById('fecha_inspeccion').value || null,
        hora: document.getElementById('hora').value || null,
        motivo: document.getElementById('motivo_inspeccion').value || null,
        lugar: document.getElementById('lugar').value || null,
        asignacion: document.getElementById('asignacion').value || null,
        supervision: document.getElementById('supervision').value || null,
        observaciones: document.getElementById('observaciones').value || null,
        coord_nombre: document.getElementById('coord_nombre').value || null,
        coord_rango: document.getElementById('coord_rango').value || null,
        coord_cedula: document.getElementById('coord_cedula').value || null,
        coord_telefono: document.getElementById('coord_telefono').value || null,
        insp_nombre: document.getElementById('insp_nombre').value || null,
        insp_rango: document.getElementById('insp_rango').value || null,
        insp_cedula: document.getElementById('insp_cedula').value || null,
        insp_telefono: document.getElementById('insp_telefono').value || null,
        componentes_moto: getComponentesMotoValues()
      };
      Object.keys(payload).forEach(key => { if (payload[key] === null) delete payload[key]; });

      const { error } = await supabase.from('inspecciones_pvr').update(payload).eq('id', recordIdInput.value);
      if(error) throw error;
      mostrarAlerta('success', '✅ Inspección de Moto actualizada');
      alertSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { limpiarFormulario(); }, 2000);
    } catch(err) { console.error('Error:', err); mostrarAlerta('error', `Error: ${err.message}`); }
    finally { btnSubmit.disabled = false; }
  });

  updatePreview();
  mostrarAlerta('info', '🔍 Busque una inspección para habilitar la edición');
});
