/**
 * inspeccion-crear-vehiculo.js
 * Lógica para crear inspecciones PVR de vehículos (patrullas, camionetas, automóviles)
 * Sistema de Gestión Administrativa - CCPE ZULIA
 */

document.addEventListener('DOMContentLoaded', async () => {
  // ============================================
  // 🔧 INICIALIZACIÓN DE SUPABASE
  // ============================================
  async function initSupabase() {
    let attempts = 0;
    // Esperar a que Supabase esté disponible
    while (!window.supabase && attempts < 50) {
      await new Promise(res => setTimeout(res, 100));
      attempts++;
    }
    
    if (!window.supabase) {
      mostrarAlerta('error', '❌ No se cargó Supabase. Recargue la página.');
      return null;
    }
    
    // Si ya está autenticado, retornar
    if (window.supabase.auth) return window.supabase;
    
    // Intentar crear cliente con configuración global
    const createFn = window.supabase.createClient || window.createClient;
    if (createFn && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try {
        window.supabase = createFn(window.SUPABASE_URL, window.SUPABASE_KEY);
        return window.supabase;
      } catch (err) {
        console.error('❌ Error inicializando Supabase:', err);
        return null;
      }
    }
    return null;
  }

  const supabase = await initSupabase();
  if (!supabase) return;

  // ============================================
  // 👤 VERIFICACIÓN DE SESIÓN
  // ============================================
  let usuarioActual = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user) {
      usuarioActual = user;
      const el = document.getElementById('userEmail');
      if (el) el.textContent = user.email || 'Usuario';
    }
  } catch (err) {
    console.warn('⚠️ Sesión no verificada:', err.message);
  }

  // ============================================
  // 🎯 REFERENCIAS DEL DOM
  // ============================================
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

  // ============================================
  // 🔔 FUNCIONES DE ALERTAS
  // ============================================
  function mostrarAlerta(tipo, mensaje) {
    // Ocultar todas las alertas primero
    [alertSuccess, alertError, alertInfo].forEach(el => {
      if (el) el.style.display = 'none';
    });
    
    // Mostrar la alert correspondiente
    const target = tipo === 'success' ? alertSuccess 
                    : tipo === 'error' ? alertError 
                    : alertInfo;
    
    if (target) {
      target.querySelector('span:last-child').textContent = mensaje;
      target.style.display = 'flex';
      
      // Auto-ocultar después de 5 segundos (excepto errores)
      if (tipo !== 'error') {
        setTimeout(() => {
          target.style.display = 'none';
        }, 5000);
      }
    }
  }

  // ============================================
  // 🔐 CONTROL DE ESTADO DEL FORMULARIO
  // ============================================
  function toggleFormState(activo) {
    inspectionForm.style.opacity = activo ? '1' : '0.6';
    inspectionForm.style.pointerEvents = activo ? 'auto' : 'none';
    
    // Habilitar/deshabilitar botón de guardar
    if (btnSubmit) {
      btnSubmit.disabled = !activo || !usuarioActual;
      if (!usuarioActual && btnSubmit) {
        btnSubmit.title = '🔐 Requiere iniciar sesión para guardar';
      }
    }
  }

  // ============================================
  // ⚙️ FUNCIONES AUXILIARES DE FORMULARIO
  // ============================================
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

  // ============================================
  // 👁️ ACTUALIZACIÓN DE VISTA PREVIA
  // ============================================
  function updatePreview() {
    // Helpers para obtener valores
    const v = id => document.getElementById(id)?.value || '-';
    const vr = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '-';
    const vs = id => {
      const el = document.getElementById(id);
      return el?.options[el.selectedIndex]?.text || '-';
    };

    // Datos básicos de inspección
    document.getElementById('pv_n_inspeccion').textContent = v('n_inspeccion') || 'Pendiente';
    document.getElementById('pv_fecha').textContent = v('fecha_inspeccion') || '-';
    document.getElementById('pv_hora').textContent = v('hora') || '-';
    document.getElementById('pv_motivo').textContent = v('motivo_inspeccion') || '-';
    document.getElementById('pv_lugar').textContent = `${v('lugar')} / ${v('asignacion')}`.trim() || '-';

    // Datos del vehículo
    document.getElementById('pv_placa').textContent = v('placa') || '-';
    document.getElementById('pv_marca_modelo').textContent = `${v('marca')} ${v('modelo')}`.trim() || '-';
    document.getElementById('pv_ano_tipo').textContent = `${v('ano')} - ${v('tipo')}`.trim() || '-';
    document.getElementById('pv_color').textContent = v('color') || '-';
    document.getElementById('pv_s_carroceria').textContent = v('s_carroceria') || '-';
    document.getElementById('pv_n_id').textContent = v('n_identificacion') || '-';
    document.getElementById('pv_kms').textContent = v('kms') || '-';
    document.getElementById('pv_rin').textContent = v('rin_numero') || '-';

    // Accesorios
    document.getElementById('pv_bateria').textContent = vs('bateria');
    document.getElementById('pv_est_base').textContent = vs('estacion_base');
    document.getElementById('pv_coctelera').textContent = vs('coctelera');
    document.getElementById('pv_triangulo').textContent = vs('triangulo');
    document.getElementById('pv_placas').textContent = vs('placas');
    document.getElementById('pv_herramientas').textContent = vs('herramientas');
    document.getElementById('pv_gato').textContent = vs('gato');
    document.getElementById('pv_luces').textContent = vs('sestacion_luces');

    // Estado de cauchos
    document.getElementById('pv_ca_d_izq').textContent = vr('caucho_del_izq');
    document.getElementById('pv_ca_d_der').textContent = vr('caucho_del_der');
    document.getElementById('pv_ca_t_izq').textContent = vr('caucho_tra_izq');
    document.getElementById('pv_ca_t_der').textContent = vr('caucho_tra_der');
    document.getElementById('pv_ca_rep').textContent = vr('caucho_repuesto');
    document.getElementById('pv_tapa').textContent = vr('tapa_cauchos');

    // Observaciones
    document.getElementById('pv_observaciones').textContent = v('observaciones') || 'Sin observaciones.';

    // Firmas y responsables
    document.getElementById('pv_coord_nombre').textContent = v('coord_nombre') || '-';
    document.getElementById('pv_coord_rango').textContent = vs('coord_rango');
    document.getElementById('pv_coord_cedula').textContent = v('coord_cedula') || '-';
    document.getElementById('pv_insp_nombre').textContent = v('insp_nombre') || '-';
    document.getElementById('pv_insp_rango').textContent = vs('insp_rango');
    document.getElementById('pv_insp_cedula').textContent = v('insp_cedula') || '-';

    // 🔧 Componentes inspeccionados (grid dinámico)
    const compGrid = document.getElementById('pv_comps_grid');
    if (compGrid) {
      compGrid.innerHTML = '';
      document.querySelectorAll('.inspection-item').forEach(item => {
        const label = item.querySelector('.item-label')?.textContent || '';
        const radio = item.querySelector('input:checked');
        const val = radio?.value || '-';
        
        // Clase para estilo según estado
        const cls = val === 'B' ? 'status-B' 
                : val === 'M' ? 'status-M' 
                : val === 'NT' ? 'status-NT' 
                : '';
        
        const div = document.createElement('div');
        div.className = 'pv-comp';
        div.innerHTML = `
          <span class="pv-comp-label">${label}</span>
          <span class="pv-comp-status ${cls}">${val}</span>
        `;
        compGrid.appendChild(div);
      });
    }
  }

  // ============================================
  // 🔍 FUNCIÓN DE BÚSQUEDA DE VEHÍCULO
  // ============================================
  async function buscarVehiculo() {
    const rawQuery = searchInput?.value.trim();
    
    if (!rawQuery) {
      mostrarAlerta('info', 'Ingrese Placa, Facsímil, Serial de Carrocería o Serial de Motor');
      searchInput?.focus();
      return;
    }

    // UI: Estado de carga
    if (btnSearch) {
      btnSearch.disabled = true;
      if (btnSearchText) btnSearchText.style.display = 'none';
      if (btnSearchLoader) btnSearchLoader.style.display = 'inline';
    }
    
    mostrarAlerta('info', '🔍 Buscando vehículo en base de datos...');

    try {
      // Normalizar consulta: quitar espacios y mayúsculas
      const q = rawQuery.replace(/\s+/g, '').toUpperCase();
      
      // Consulta a Supabase: buscar en tabla 'vehiculos'
      const { data, error } = await supabase
        .from('vehiculos')
        .select('*')
        .or(`placa.ilike.${q},facsimil.ilike.${q},s_carroceria.ilike.${q},s_motor.ilike.${q}`)
        .eq('tipo', 'MOTO') // ⚠️ FILTRO: Solo motos
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        mostrarAlerta('error', '❌ Moto no encontrada. Verifique los datos e intente nuevamente.');
        toggleFormState(false);
        return;
      }

      // ✅ Validar que sea realmente una moto
      const esMoto = (data.tipo || '').toLowerCase().includes('moto') || 
                     (data.clase || '').toLowerCase().includes('moto');
      
      if (!esMoto) {
        mostrarAlerta('error', '⚠️ El vehículo encontrado no está registrado como MOTO.');
        toggleFormState(false);
        return;
      }

      // 🎯 LLENAR FORMULARIO CON DATOS DEL VEHÍCULO
      setInput('placa', data.placa);
      setInput('marca', data.marca?.toUpperCase());
      setInput('modelo', data.modelo?.toUpperCase());
      setInput('ano', data.ano);
      setInput('color', data.color);
      setInput('tipo', data.tipo);
      setInput('s_carroceria', data.s_carroceria);
      setInput('s_motor', data.s_motor);
      setInput('n_identificacion', data.n_identificacion);
      
      // Guardar ID del vehículo para referencia
      vehicleIdInput.value = data.id;

      // 🔹 Generar número de inspección automático y fechas por defecto
      generarDatosPorDefecto();

      // Habilitar formulario
      toggleFormState(true);
      
      // Actualizar vista previa
      updatePreview();
      
      mostrarAlerta('success', `✅ Moto ${data.placa || data.modelo} encontrada. Complete la inspección.`);
      
      // Scroll suave hacia el formulario
      inspectionForm?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('❌ Error en búsqueda:', err);
      mostrarAlerta('error', `Error: ${err.message || 'No se pudo conectar con la base de datos'}`);
    } finally {
      // Restaurar UI del botón
      if (btnSearch) {
        btnSearch.disabled = false;
        if (btnSearchText) btnSearchText.style.display = 'inline';
        if (btnSearchLoader) btnSearchLoader.style.display = 'none';
      }
    }
  }

  // ============================================
  // 🆕 GENERAR DATOS POR DEFECTO
  // ============================================
  function generarDatosPorDefecto() {
    const now = new Date();
    
    // Fecha actual
    const fechaStr = now.toISOString().split('T')[0];
    setInput('fecha_inspeccion', fechaStr);
    
    // Hora actual (HH:MM)
    const horaStr = now.toTimeString().slice(0, 5);
    setInput('hora', horaStr);
    
    // Generar N° de inspección único: PVR-AAAAMMDD-XXX
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const nInspeccion = `PVR-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${random}`;
    setInput('n_inspeccion', nInspeccion);
  }

  // ============================================
  // 🧹 LIMPIAR FORMULARIO
  // ============================================
  function limpiarFormulario() {
    // Resetear búsqueda
    if (searchInput) searchInput.value = '';
    
    // Resetear formulario completo
    if (inspectionForm) inspectionForm.reset();
    
    // Limpiar ID oculto
    if (vehicleIdInput) vehicleIdInput.value = '';
    
    // Deshabilitar formulario
    toggleFormState(false);
    
    // Resetear vista previa
    updatePreview();
    
    // Mensaje informativo
    mostrarAlerta('info', '🔍Ingrese Placa o Serial para buscar una Moto');
    
    // Focus en campo de búsqueda
    searchInput?.focus();
  }

  // ============================================
  // 📦 EXTRAER VALORES DE COMPONENTES (RADIOS)
  // ============================================
  function getComponentesValues() {
    const componentes = {};
    
    // Recorrer todos los radios de componentes
    document.querySelectorAll('.inspection-item input[type="radio"]').forEach(radio => {
      // Inicializar con valor por defecto si no existe
      if (!componentes[radio.name]) {
        componentes[radio.name] = 'NT'; // Default: No Tiene
      }
      // Si está seleccionado, usar su valor
      if (radio.checked) {
        componentes[radio.name] = radio.value;
      }
    });
    
    return componentes;
  }

  // ============================================
  // 🎧 EVENT LISTENERS
  // ============================================
  
  // Búsqueda con botón
  btnSearch?.addEventListener('click', buscarVehiculo);
  
  // Búsqueda con Enter
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      buscarVehiculo();
    }
  });
  
  // Botón limpiar
  btnClear?.addEventListener('click', (e) => {
    e.preventDefault();
    limpiarFormulario();
  });
  
  // Actualizar vista previa en tiempo real
  inspectionForm?.addEventListener('input', updatePreview);
  inspectionForm?.addEventListener('change', updatePreview);
  
  // 🚨 VALIDACIÓN Y ENVÍO DEL FORMULARIO
  inspectionForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validar autenticación
    if (!usuarioActual) {
      mostrarAlerta('error', '🔐 Debe iniciar sesión para guardar una inspección');
      return;
    }
    
    // Validar que se haya seleccionado un vehículo
    if (!vehicleIdInput.value) {
      mostrarAlerta('error', '⚠️ Debe buscar y seleccionar una moto primero');
      return;
    }
    
    // Validar Nº de Rin (2 dígitos si se proporciona)
    const rinVal = document.getElementById('rin_numero')?.value;
    if (rinVal && !/^\d{2}$/.test(rinVal)) {
      mostrarAlerta('error', 'El Nº de Rin debe contener exactamente 2 dígitos (ej: 17)');
      document.getElementById('rin_numero')?.focus();
      return;
    }

    // UI: Estado de guardando
    btnSubmit.disabled = true;
    if (btnSubmit.querySelector('.btn-text')) {
      btnSubmit.querySelector('.btn-text').style.display = 'none';
    }
    if (btnSubmit.querySelector('.btn-loader')) {
      btnSubmit.querySelector('.btn-loader').style.display = 'inline';
    }

    try {
      // 🔹 Función auxiliar para convertir a null si está vacío
      const toNullIfEmpty = val => (val === '' || val === null) ? null : val;
      const toIntOrNull = val => {
        const num = parseInt(val, 10);
        return isNaN(num) || val === '' ? null : num;
      };

      // 📦 Construir payload para Supabase
      const payload = {
        // 🔗 Relación con vehículo
        vehiculo_id: toIntOrNull(vehicleIdInput.value),
        
        // 📋 Datos de inspección
        n_inspeccion: toNullIfEmpty(document.getElementById('n_inspeccion')?.value),
        fecha_inspeccion: toNullIfEmpty(document.getElementById('fecha_inspeccion')?.value),
        hora: toNullIfEmpty(document.getElementById('hora')?.value),
        motivo: toNullIfEmpty(document.getElementById('motivo_inspeccion')?.value),
        lugar: toNullIfEmpty(document.getElementById('lugar')?.value),
        asignacion: toNullIfEmpty(document.getElementById('asignacion')?.value),
        supervision: toNullIfEmpty(document.getElementById('supervision')?.value),
        
        // 🚗 Datos del vehículo (redundantes para reporte impreso)
        placa: toNullIfEmpty(document.getElementById('placa')?.value),
        marca: toNullIfEmpty(document.getElementById('marca')?.value),
        modelo: toNullIfEmpty(document.getElementById('modelo')?.value),
        ano: toIntOrNull(document.getElementById('ano')?.value),
        tipo: toNullIfEmpty(document.getElementById('tipo')?.value),
        color: toNullIfEmpty(document.getElementById('color')?.value),
        s_carroceria: toNullIfEmpty(document.getElementById('s_carroceria')?.value),
        s_motor: toNullIfEmpty(document.getElementById('s_motor')?.value),
        n_identificacion: toNullIfEmpty(document.getElementById('n_identificacion')?.value),
        
        // 📦 Accesorios
        bateria: document.getElementById('bateria')?.value || 'NO',
        estacion_base: document.getElementById('estacion_base')?.value || 'NO',
        coctelera: document.getElementById('coctelera')?.value || 'NO',
        triangulo: document.getElementById('triangulo')?.value || 'NO',
        placas: document.getElementById('placas')?.value || 'NO',
        herramientas: document.getElementById('herramientas')?.value || 'NO',
        gato: document.getElementById('gato')?.value || 'NO',
        sestacion_luces: document.getElementById('sestacion_luces')?.value || 'NO',
        
        // 🛞 Cauchos (solo B/M para motos)
        caucho_del_izq: document.querySelector('input[name="caucho_del_izq"]:checked')?.value || 'M',
        caucho_del_der: document.querySelector('input[name="caucho_del_der"]:checked')?.value || 'M',
        caucho_tra_izq: document.querySelector('input[name="caucho_tra_izq"]:checked')?.value || 'M',
        caucho_tra_der: document.querySelector('input[name="caucho_tra_der"]:checked')?.value || 'M',
        caucho_repuesto: document.querySelector('input[name="caucho_repuesto"]:checked')?.value || 'M',
        tapa_cauchos: document.querySelector('input[name="tapa_cauchos"]:checked')?.value || 'NO',
        
        // 🔧 Kilometraje y rin
        kms: toIntOrNull(document.getElementById('kms')?.value) || 0,
        rin_numero: rinVal || null,
        
        // 📝 Observaciones
        observaciones: toNullIfEmpty(document.getElementById('observaciones')?.value),
        
        // 👥 Responsables - Coordinación
        coord_nombre: toNullIfEmpty(document.getElementById('coord_nombre')?.value),
        coord_rango: toNullIfEmpty(document.getElementById('coord_rango')?.value),
        coord_cedula: toNullIfEmpty(document.getElementById('coord_cedula')?.value),
        coord_telefono: toNullIfEmpty(document.getElementById('coord_telefono')?.value),
        
        // 👥 Responsables - Inspector
        insp_nombre: toNullIfEmpty(document.getElementById('insp_nombre')?.value),
        insp_rango: toNullIfEmpty(document.getElementById('insp_rango')?.value),
        insp_cedula: toNullIfEmpty(document.getElementById('insp_cedula')?.value),
        insp_telefono: toNullIfEmpty(document.getElementById('insp_telefono')?.value),
        
        // 👤 Auditoría
        inspector: usuarioActual.email || 'sistema',
        created_at: new Date().toISOString(),
        
        // 🔧 Componentes inspeccionados (spread operator)
        ...getComponentesValues()
      };

      // 🧹 Limpiar campos null para optimizar almacenamiento
      Object.keys(payload).forEach(key => {
        if (payload[key] === null || payload[key] === '') {
          delete payload[key];
        }
      });

      // 💾 INSERTAR en tabla 'inspecciones_pvr'
      const { data: result, error } = await supabase
        .from('inspecciones_pvr')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // ✅ Éxito
      mostrarAlerta('success', '✅ Inspección de Moto registrada exitosamente');
      
      // Scroll hacia la alerta
      alertSuccess?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Limpiar formulario después de 2.5 segundos
      setTimeout(() => {
        limpiarFormulario();
      }, 2500);

    } catch (err) {
      console.error('❌ Error al guardar inspección:', err);
      mostrarAlerta('error', `No se pudo guardar: ${err.message || 'Error desconocido'}`);
    } finally {
      // Restaurar botón
      btnSubmit.disabled = false;
      if (btnSubmit.querySelector('.btn-text')) {
        btnSubmit.querySelector('.btn-text').style.display = 'inline';
      }
      if (btnSubmit.querySelector('.btn-loader')) {
        btnSubmit.querySelector('.btn-loader').style.display = 'none';
      }
    }
  });

  // ============================================
  // 🚀 INICIALIZACIÓN
  // ============================================
  // Configurar vista previa inicial
  updatePreview();
  
  // Mensaje inicial
  mostrarAlerta('info', '🔍 Busque una moto para habilitar el formulario de inspección');
  
  // Deshabilitar formulario al inicio
  toggleFormState(false);
  
  console.log('✅ inspeccion-crear-moto.js cargado correctamente');
});
