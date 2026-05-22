// ============================================
// CONSULTAR FICHAS TÉCNICAS - LÓGICA CORREGIDA
// ============================================
// Verificación segura (evita errores si config.js no cargó a tiempo)
if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
  console.error('❌ Error crítico: Supabase o config.js no cargaron correctamente.');
}
const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_KEY
);
let fichasEncontradas = [];

// ============================================
// ✅ NUEVA FUNCIÓN: CARGAR TODAS LAS FICHAS AL INICIAR
// ============================================
async function cargarTodasLasFichas() {
  mostrarAlerta('⏳ Cargando registros desde la base de datos...', 'info');
  try {
    const { data, error } = await supabaseClient
      .from('fichas_tecnicas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    fichasEncontradas = data || [];
    renderizarListaFichas();

    if (fichasEncontradas.length === 0) {
      mostrarAlerta('ℹ️ No hay fichas registradas en el sistema.', 'info');
    } else {
      mostrarAlerta(`✅ Se cargaron ${fichasEncontradas.length} ficha(s) correctamente.`, 'success');
    }
  } catch (err) {
    console.error('❌ Error al cargar fichas iniciales:', err);
    mostrarAlerta('❌ Error de conexión: ' + err.message, 'error');
  }
}

// ============================================
// FUNCIÓN DE BÚSQUEDA (MEJORADA)
// ============================================
async function buscarFichas() {
  const searchInput = document.getElementById('searchInput');
  const term = searchInput.value.trim();
  
  if (!term) {
    mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
    return;
  }
  
  mostrarAlerta('⏳ Buscando en base de datos...', 'info');
  try {
    // ✅ Búsqueda parcial e insensible a mayúsculas/minúsculas
    const { data, error } = await supabaseClient
      .from('fichas_tecnicas')
      .select('*')
      .or(
        `placa.ilike.%${term}%,` +
        `facsimil.ilike.%${term}%,` +
        `s_carroceria.ilike.%${term}%,` +
        `s_motor.ilike.%${term}%,` +
        `marca.ilike.%${term}%,` +
        `modelo.ilike.%${term}%`
      )
      .order('created_at', { ascending: false });

    if (error) throw error;
    fichasEncontradas = data || [];
    renderizarListaFichas();
    
    if (fichasEncontradas.length === 0) {
      mostrarAlerta('😕 No se encontraron resultados para: ' + term, 'info');
    } else {
      mostrarAlerta(`✅ Se encontraron ${fichasEncontradas.length} ficha(s)`, 'success');
    }
  } catch (err) {
    console.error('❌ Error en buscarFichas:', err);
    mostrarAlerta('❌ Error de conexión: ' + err.message, 'error');
  }
}

// Alias para compatibilidad con tu HTML: onclick="buscarVehiculo()"
window.buscarVehiculo = buscarFichas;

// ============================================
// RENDERIZAR TABLA DE RESULTADOS
// ============================================
// ============================================
// RENDERIZAR TABLA DE RESULTADOS (CON FILTRO)
// ============================================
function renderizarListaFichas() {
    const tbody = document.getElementById('resultsBody');
    const filterValue = document.getElementById('filterType')?.value || 'all';
    if (!tbody) return;
    tbody.innerHTML = '';

    // ✅ Filtrar datos según selección
    let datosAMostrar = fichasEncontradas;
    if (filterValue === 'MOTO') {
        datosAMostrar = fichasEncontradas.filter(f => String(f.clase || '').toUpperCase() === 'MOTO');
    } else if (filterValue === 'VEHICULO') {
        datosAMostrar = fichasEncontradas.filter(f => String(f.clase || '').toUpperCase() !== 'MOTO');
    }

    if (datosAMostrar.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
                    📭 No hay resultados para el filtro seleccionado.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = datosAMostrar.map(f => {
        let estatusBg = '#fff3cd', estatusColor = '#856404';
        if (f.estatus_ficha === 'OPERATIVO') { estatusBg = '#d4edda'; estatusColor = '#155724'; }
        else if (f.estatus_ficha === 'INOPERATIVO') { estatusBg = '#f8d7da'; estatusColor = '#721c24'; }
        else if (f.estatus_ficha === 'DESINCORPORADO') { estatusBg = '#d6d8db'; estatusColor = '#383d41'; }
        
        return `
            <tr>
                <td><strong>${f.placa || 'N/A'}</strong></td>
                <td>${f.marca || 'N/A'}</td>
                <td>${f.modelo || 'N/A'}</td>
                <td>${f.tipo || 'N/A'}</td>
                <td>${f.color || 'N/A'}</td>
                <td>
                    <span style="padding: 4px 8px; border-radius: 4px; background: ${estatusBg}; color: ${estatusColor}; font-weight: 500;">
                        ${f.estatus_ficha || 'N/A'}
                    </span>
                </td>
                <td>${f.dependencia || 'N/A'}</td>
                <td>
                    <button class="btn-view" onclick="verFicha('${f.id}')">👁️ Ver</button>
                </td>
            </tr>
        `;
    }).join('');
}
// ============================================
// VER Y POBLAR MODAL (SIN ROMPER ESTRUCTURA)
// ============================================
function verFicha(id) {
  const ficha = fichasEncontradas.find(f => String(f.id) === String(id));
  if (!ficha) {
    mostrarAlerta('❌ Ficha no encontrada', 'error');
    return;
  }
  mostrarFichaDetalle(ficha);
  abrirModal();
}

function mostrarFichaDetalle(f) {
  // Helper seguro para asignar texto a elementos por ID
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || 'N/A';
  };
  
  // Asignar valores a los campos del modal
  setText('modalMarca', f.marca);
  setText('modalModelo', f.modelo);
  setText('modalTipo', f.tipo);
  setText('modalClase', f.clase);
  setText('modalColor', f.color);
  setText('modalPlaca', f.placa);
  setText('modalFacsimilar', f.facsimil);
  setText('modalDependencia', f.dependencia);
  setText('modalSerialCarroceria', f.s_carroceria);
  setText('modalSerialMotor', f.s_motor);
  setText('modalObservaciones', f.observaciones || 'Sin observaciones');
  setText('modalCausa', f.causa);
  setText('modalDiagnostico', f.diagnostico);
  setText('modalMecanica', f.mecanica);
  setText('modalUbicacion', f.ubicacion);
  setText('modalTapiceria', f.tapiceria);
  setText('modalCauchos', f.cauchos);
  setText('modalLuces', f.luces);
  setText('modalFechaCreacion', f.created_at ? new Date(f.created_at).toLocaleString('es-VE') : 'N/A');
  setText('modalCreadoPor', f.creado_por);
  
  // Color dinámico para estatus
  const elEst = document.getElementById('modalEstatus');
  if (elEst) {
    elEst.textContent = f.estatus_ficha || 'N/A';
    elEst.style.color = f.estatus_ficha === 'OPERATIVO' ? '#155724' :
                        f.estatus_ficha === 'INOPERATIVO' ? '#721c24' :
                        f.estatus_ficha === 'DESINCORPORADO' ? '#383d41' : '#856404';
  }
  
  // Carga de fotos
  for (let i = 1; i <= 4; i++) {
    const img = document.getElementById(`modalImg${i}`);
    const box = document.getElementById(`modalBox${i}`);
    if (img && box) {
      const url = f[`foto${i}_url`];
      if (url && url.trim() !== '') {
        img.src = url;
        img.style.display = 'block';
        const sp = box.querySelector('span');
        if (sp) sp.style.display = 'none';
      } else {
        img.style.display = 'none';
        const sp = box.querySelector('span');
        if (sp) sp.style.display = 'block';
      }
    }
  }
}

function abrirModal() {
  const modal = document.getElementById('fichaModal');
  if (modal) modal.style.display = 'block';
}

window.cerrarModal = function() {
  const modal = document.getElementById('fichaModal');
  if (modal) modal.style.display = 'none';
};

// Cerrar modal al hacer clic fuera del contenido
window.onclick = function(event) {
  const modal = document.getElementById('fichaModal');
  if (event.target === modal) cerrarModal();
};

// ============================================
// UTILIDADES
// ============================================
window.limpiarBusqueda = function() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const alertDiv = document.getElementById('searchAlert');
    if (alertDiv) alertDiv.style.display = 'none';
    
    // ✅ Reiniciar filtro a "Todos"
    const filterSelect = document.getElementById('filterType');
    if (filterSelect) filterSelect.value = 'all';
    
    fichasEncontradas = [];
    cargarTodasLasFichas(); // Vuelve a cargar todo y aplica el filtro automáticamente
};
window.imprimirFicha = function() {
  window.print();
};

function mostrarAlerta(mensaje, tipo) {
  const alertDiv = document.getElementById('searchAlert');
  if (!alertDiv) return;
  alertDiv.textContent = mensaje;
  alertDiv.className = `alert alert-${tipo}`;
  alertDiv.style.display = 'block';
  setTimeout(() => { alertDiv.style.display = 'none'; }, 4000);
}

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando consulta de fichas técnicas...');
  
  // Búsqueda con Enter
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') buscarFichas();
    });
  }
  
  // ✅ Cargar automáticamente todas las fichas al abrir la página
  cargarTodasLasFichas();
  
  // Cargar email de usuario
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session?.user?.email) {
      const el = document.getElementById('userEmail');
      if (el) el.textContent = session.user.email;
    }
  });
  
  // Cerrar sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function() {
      if (confirm('¿Está seguro de cerrar sesión?')) {
        await supabaseClient.auth.signOut();
        window.location.href = '../index.html';
      }
    });
  }
  // ✅ Activar filtro de tipo de vehículo
const filterSelect = document.getElementById('filterType');
if (filterSelect) {
    filterSelect.addEventListener('change', () => {
        renderizarListaFichas();
    });
}
  console.log('✅ Consulta de fichas inicializada');
});
