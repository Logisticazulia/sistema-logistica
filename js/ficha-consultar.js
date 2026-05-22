// ============================================
// CONSULTAR FICHAS TÉCNICAS - LÓGICA CORREGIDA
// ============================================

// Verificación segura de Supabase
if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
  console.error('❌ Error: Supabase o config.js no cargaron correctamente.');
}

const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_KEY
);

let fichasEncontradas = [];

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

    if (fichasEncontradas.length === 0) {
      mostrarAlerta('😕 No se encontraron resultados para: ' + term, 'info');
    } else {
      mostrarAlerta(`✅ Se encontraron ${fichasEncontradas.length} ficha(s)`, 'success');
    }

    renderizarListaFichas();
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
function renderizarListaFichas() {
  const tbody = document.getElementById('resultsBody');
  if (!tbody) return;

  if (fichasEncontradas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
          📭 No hay vehículos registrados. Realice una búsqueda o cargue la base de datos.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = fichasEncontradas.map(f => {
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
// ABRIR Y POBLAR MODAL (SIN ROMPER HTML)
// ============================================
function verFicha(id) {
  const ficha = fichasEncontradas.find(f => String(f.id) === String(id));
  if (!ficha) return;
  mostrarFichaDetalle(ficha);
  document.getElementById('fichaModal').style.display = 'block';
}

function mostrarFichaDetalle(f) {
  // Helper seguro para llenar campos por ID
  const setText = (id, val) => { 
    const el = document.getElementById(id); 
    if (el) el.textContent = val || 'N/A'; 
  };

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

// ============================================
// UTILIDADES Y EVENTOS
// ============================================
window.cerrarModal = function() {
  document.getElementById('fichaModal').style.display = 'none';
};

// Cerrar al hacer clic fuera del modal
window.onclick = function(event) {
  const modal = document.getElementById('fichaModal');
  if (event.target === modal) cerrarModal();
};

window.limpiarBusqueda = function() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchAlert').style.display = 'none';
  fichasEncontradas = [];
  renderizarListaFichas();
  cerrarModal();
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

  // Cargar estado inicial (muestra mensaje vacío por defecto)
  renderizarListaFichas();

  // Cargar email de usuario
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session?.user?.email) {
      document.getElementById('userEmail').textContent = session.user.email;
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

  console.log('✅ Consulta de fichas inicializada');
});
