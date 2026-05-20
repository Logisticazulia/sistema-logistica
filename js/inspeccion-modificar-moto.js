// Función de búsqueda mejorada
async function buscarInspeccion() {
  const rawQuery = searchInput?.value.trim();
  if (!rawQuery) { 
    mostrarAlerta('info', 'Ingrese N° Inspección o Placa para buscar'); 
    return; 
  }
  
  if (btnSearch) { 
    btnSearch.disabled = true; 
    btnSearchText.style.display = 'none'; 
    btnSearchLoader.style.display = 'inline'; 
  }
  
  mostrarAlerta('info', '🔍 Buscando inspección...');
  
  try {
    const q = rawQuery.replace(/\s+/g, '').toUpperCase();
    const { data, error } = await supabase.from('inspecciones_pvr').select('*')
      .or(`n_inspeccion.ilike.${q},placa.ilike.${q}`)
      .eq('tipo', 'MOTO') // Filtrar solo motos
      .limit(1).maybeSingle();
      
    if (error) throw error;
    if (!data) { 
      mostrarAlerta('error', '❌ Inspección de moto no encontrada.'); 
      toggleFormState(false); 
      return; 
    }
    
    // Cargar datos en el formulario
    recordIdInput.value = data.id;
    cargarDatosInspeccion(data);
    
    toggleFormState(true);
    updatePreview();
    mostrarAlerta('success', '✅ Inspección de moto cargada. Puede modificar y actualizar.');
    
  } catch (err) {
    console.error('❌ Error búsqueda:', err);
    mostrarAlerta('error', `Error: ${err.message}`);
  } finally {
    if (btnSearch) { 
      btnSearch.disabled = false; 
      btnSearchText.style.display = 'inline'; 
      btnSearchLoader.style.display = 'none'; 
    }
  }
}

// Función para cargar datos
function cargarDatosInspeccion(data) {
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
  setInput('color', data.color);
  setInput('s_carroceria', data.s_carroceria);
  setInput('s_motor', data.s_motor);
  setInput('n_identificacion', data.n_identificacion);
  setInput('observaciones', data.observaciones);
  
  // Cargar responsables
  setInput('coord_nombre', data.coord_nombre);
  setSelect('coord_rango', data.coord_rango);
  setInput('coord_cedula', data.coord_cedula);
  setInput('coord_telefono', data.coord_telefono);
  setInput('insp_nombre', data.insp_nombre);
  setSelect('insp_rango', data.insp_rango);
  setInput('insp_cedula', data.insp_cedula);
  setInput('insp_telefono', data.insp_telefono);
  
  // Cargar componentes desde JSONB
  const comps = data.componentes_moto || {};
  document.querySelectorAll('.inspection-item input[type="radio"]').forEach(r => {
    r.checked = (comps[r.name] === r.value);
  });
}

// Función para limpiar
function limpiarFormulario() {
  searchInput.value = ''; 
  recordIdInput.value = ''; 
  toggleFormState(false);
  document.getElementById('motoForm').reset(); 
  updatePreview();
  mostrarAlerta('info', 'Ingrese N° Inspección o Placa para buscar');
}
