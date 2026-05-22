// ============================================
// CONSULTAR FICHAS TÉCNICAS - LÓGICA
// ============================================
// Configuración de Supabase
const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_KEY
);

let fichasEncontradas = [];
let fichaSeleccionada = null;

// ============================================
// FUNCIONES DE BÚSQUEDA
// ============================================
async function buscarFichas() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput.value.trim();
  
  if (!searchTerm) {
    mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
    return;
  }

  console.log('🔍 Buscando fichas técnicas:', searchTerm);
  mostrarAlerta('⏳ Buscando en base de datos...', 'info');

  const btnSearch = document.getElementById('btnSearch');
  if(btnSearch) btnSearch.disabled = true;

  try {
    // Uso de ilike para búsqueda case-insensitive y alineado a columnas del CSV
    const { data, error } = await supabaseClient
      .from('fichas_tecnicas')
      .select('*')
      .or(`placa.ilike.${searchTerm},facsimil.ilike.${searchTerm},s_carroceria.ilike.${searchTerm},s_motor.ilike.${searchTerm},marca.ilike.${searchTerm}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error en la búsqueda:', error);
      mostrarAlerta('❌ Error al buscar: ' + error.message, 'error');
      return;
    }

    if (!data || data.length === 0) {
      mostrarAlerta('❌ No se encontró ninguna ficha técnica con: ' + searchTerm, 'error');
      fichasEncontradas = [];
      document.getElementById('resultsBody').innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
            😕 No se encontraron resultados
          </td>
        </tr>
      `;
      return;
    }

    fichasEncontradas = data;
    console.log('✅ Fichas encontradas:', fichasEncontradas.length);
    mostrarAlerta(`✅ Se encontraron ${fichasEncontradas.length} ficha(s) técnica(s)`, 'success');
    renderizarTablaResultados();
  } catch (error) {
    console.error('❌ Error en buscarFichas:', error);
    mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
  } finally {
    if(btnSearch) btnSearch.disabled = false;
  }
}

function limpiarBusqueda() {
  const searchInput = document.getElementById('searchInput');
  if(searchInput) searchInput.value = '';
  
  document.getElementById('searchAlert').style.display = 'none';
  fichasEncontradas = [];
  fichaSeleccionada = null;
  
  document.getElementById('resultsBody').innerHTML = `
    <tr>
      <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
        🔍 Realice una búsqueda para ver las fichas disponibles
      </td>
    </tr>
  `;
  cerrarModal();
}

// ============================================
// RENDERIZAR TABLA DE RESULTADOS
// ============================================
function renderizarTablaResultados() {
  const tbody = document.getElementById('resultsBody');
  if (!tbody) return;

  if (fichasEncontradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:#666;">No hay registros para mostrar</td></tr>`;
    return;
  }

  tbody.innerHTML = fichasEncontradas.map(ficha => `
    <tr>
      <td>${ficha.placa || 'N/A'}</td>
      <td>${ficha.marca || 'N/A'}</td>
      <td>${ficha.modelo || 'N/A'}</td>
      <td>${ficha.tipo || 'N/A'}</td>
      <td>${ficha.color || 'N/A'}</td>
      <td><span style="font-weight:600; color: ${ficha.estatus_ficha === 'OPERATIVO' ? '#28a745' : '#dc3545'}">${ficha.estatus_ficha || 'N/A'}</span></td>
      <td>${ficha.dependencia || 'N/A'}</td>
      <td>
        <button class="btn-view" onclick="seleccionarFicha('${ficha.id}')">👁️ Ver</button>
      </td>
    </tr>
  `).join('');
}

// ============================================
// SELECCIONAR Y MOSTRAR MODAL
// ============================================
function seleccionarFicha(id) {
  const ficha = fichasEncontradas.find(f => String(f.id) === String(id));
  if (!ficha) {
    mostrarAlerta('❌ Ficha no encontrada', 'error');
    return;
  }
  fichaSeleccionada = ficha;
  mostrarFichaDetalle(ficha);
}

function mostrarFichaDetalle(ficha) {
  // Mapeo exacto a los IDs del HTML
  document.getElementById('modalMarca').textContent = ficha.marca || 'N/A';
  document.getElementById('modalModelo').textContent = ficha.modelo || 'N/A';
  document.getElementById('modalTipo').textContent = ficha.tipo || 'N/A';
  document.getElementById('modalClase').textContent = ficha.clase || 'N/A';
  document.getElementById('modalColor').textContent = ficha.color || 'N/A';
  document.getElementById('modalSerialCarroceria').textContent = ficha.s_carroceria || 'N/A';
  document.getElementById('modalPlaca').textContent = ficha.placa || 'N/A';
  document.getElementById('modalFacsimilar').textContent = ficha.facsimil || 'N/A';
  document.getElementById('modalDependencia').textContent = ficha.dependencia || 'N/A';
  document.getElementById('modalSerialMotor').textContent = ficha.s_motor || 'N/A';
  document.getElementById('modalEstatus').textContent = ficha.estatus_ficha || 'N/A';
  document.getElementById('modalCausa').textContent = ficha.causa || 'N/A';
  document.getElementById('modalDiagnostico').textContent = ficha.diagnostico || 'N/A';
  document.getElementById('modalMecanica').textContent = ficha.mecanica || 'N/A';
  document.getElementById('modalUbicacion').textContent = ficha.ubicacion || 'N/A';
  document.getElementById('modalTapiceria').textContent = ficha.tapiceria || 'N/A';
  document.getElementById('modalCauchos').textContent = ficha.cauchos || 'N/A';
  document.getElementById('modalLuces').textContent = ficha.luces || 'N/A';
  document.getElementById('modalObservaciones').textContent = ficha.observaciones || 'Sin observaciones';

  const fechaCreacion = ficha.created_at ? new Date(ficha.created_at).toLocaleString() : 'N/A';
  document.getElementById('modalFechaCreacion').textContent = fechaCreacion;
  document.getElementById('modalCreadoPor').textContent = ficha.creado_por || 'N/A';

  // Carga de fotos dinámicas
  for (let i = 1; i <= 4; i++) {
    const imgUrl = ficha[`foto${i}_url`];
    const imgEl = document.getElementById(`modalImg${i}`);
    const boxEl = document.getElementById(`modalBox${i}`);
    const placeholder = boxEl.querySelector('span');
    
    if (imgUrl) {
      imgEl.src = imgUrl;
      imgEl.style.display = 'block';
      placeholder.style.display = 'none';
    } else {
      imgEl.src = '';
      imgEl.style.display = 'none';
      placeholder.style.display = 'block';
    }
  }

  // Mostrar modal
  document.getElementById('fichaModal').style.display = 'block';
}

function cerrarModal() {
  document.getElementById('fichaModal').style.display = 'none';
  fichaSeleccionada = null;
}

function imprimirFicha() {
  window.print();
}

function mostrarAlerta(mensaje, tipo) {
  const alertDiv = document.getElementById('searchAlert');
  if (!alertDiv) return;
  alertDiv.textContent = mensaje;
  alertDiv.className = `alert alert-${tipo}`;
  alertDiv.style.display = 'block';
  document.querySelector('.search-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => { alertDiv.style.display = 'none'; }, 5000);
}

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando consulta de fichas técnicas...');

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') buscarFichas();
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('¿Está seguro de cerrar sesión?')) {
        try {
          await supabaseClient.auth.signOut();
          window.location.href = '../index.html';
        } catch (err) {
          console.error('Error al cerrar sesión:', err);
        }
      }
    });
  }

  cargarUsuario();
  console.log('✅ Consulta de fichas inicializada');
});

async function cargarUsuario() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user?.email) {
      const el = document.getElementById('userEmail');
      if(el) el.textContent = session.user.email;
    }
  } catch (error) {
    console.error('Error al cargar usuario:', error);
  }
}

// Cerrar modal al hacer clic fuera del contenido
window.addEventListener('click', (e) => {
  const modal = document.getElementById('fichaModal');
  if (e.target === modal) cerrarModal();
});
