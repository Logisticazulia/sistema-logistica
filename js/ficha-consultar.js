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
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        mostrarAlerta('⚠️ Por favor ingrese un término de búsqueda', 'error');
        return;
    }
    
    console.log('🔍 Buscando fichas técnicas:', searchTerm);
    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    const btnSearch = document.getElementById('btnSearch');
    btnSearch.disabled = true;
    
    try {
        // Buscar en placa, facsimilar, serial carroceria y serial motor
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .or(`placa.eq.${searchTerm},facsimil.eq.${searchTerm},s_carroceria.eq.${searchTerm},s_motor.eq.${searchTerm}`)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error en la búsqueda:', error);
            mostrarAlerta('❌ Error al buscar: ' + error.message, 'error');
            return;
        }
        
        if (!data || data.length === 0) {
            mostrarAlerta('❌ No se encontró ninguna ficha técnica con: ' + searchTerm, 'error');
            fichasEncontradas = [];
            document.getElementById('fichasList').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <p>😕 No se encontraron resultados</p>
                </div>
            `;
            return;
        }
        
        fichasEncontradas = data;
        console.log('✅ Fichas encontradas:', fichasEncontradas.length);
        mostrarAlerta(`✅ Se encontraron ${fichasEncontradas.length} ficha(s) técnica(s)`, 'success');
        
        renderizarListaFichas();
        
    } catch (error) {
        console.error('❌ Error en buscarFichas:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    } finally {
        btnSearch.disabled = false;
    }
}

function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    document.getElementById('searchAlert').style.display = 'none';
    fichasEncontradas = [];
    fichaSeleccionada = null;
    document.getElementById('fichasList').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <p>🔍 Realice una búsqueda para ver las fichas disponibles</p>
        </div>
    `;
    document.getElementById('fichaViewSection').classList.remove('active');
}
// ============================================
// RENDERIZAR LISTA DE FICHAS
// ============================================

// ============================================
// RENDERIZAR LISTA DE FICHAS (VERSIÓN CORREGIDA)
// ============================================
function renderizarListaFichas() {
  const tbody = document.getElementById('resultsBody');  // ← Usar resultsBody
  if (!tbody) {
    console.error('❌ No se encontró el elemento #resultsBody');
    return;
  }

  if (fichasEncontradas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">
          😕 No se encontraron resultados para esta búsqueda
        </td>
      </tr>
    `;
    return;
  }

  const html = fichasEncontradas.map(ficha => {
    return `
      <tr>
        <td><strong>${ficha.placa || 'N/A'}</strong></td>
        <td>${ficha.marca || 'N/A'}</td>
        <td>${ficha.modelo || 'N/A'}</td>
        <td>${ficha.tipo || 'N/A'}</td>
        <td>${ficha.color || 'N/A'}</td>
        <td>
          <span style="padding: 4px 8px; border-radius: 4px; background: ${
            ficha.estatus_ficha === 'OPERATIVO' ? '#d4edda' : 
            ficha.estatus_ficha === 'INOPERATIVO' ? '#f8d7da' : '#fff3cd'
          }; color: ${
            ficha.estatus_ficha === 'OPERATIVO' ? '#155724' : 
            ficha.estatus_ficha === 'INOPERATIVO' ? '#721c24' : '#856404'
          }; font-weight: 500;">
            ${ficha.estatus_ficha || 'N/A'}
          </span>
        </td>
        <td>${ficha.dependencia || 'N/A'}</td>
        <td>
          <button class="btn-view" onclick="verFicha('${ficha.id}')">
            👁️ Ver
          </button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
}

// Función para ver ficha (nueva)
function verFicha(id) {
  const ficha = fichasEncontradas.find(f => f.id == id);
  if (ficha) {
    mostrarFichaDetalle(ficha);
    // Abrir modal si usas uno
    const modal = document.getElementById('fichaModal');
    if (modal) modal.style.display = 'block';
  }
}
// ============================================
// SELECCIONAR Y MOSTRAR FICHA
// ============================================

function seleccionarFicha(id) {
    const ficha = fichasEncontradas.find(f => f.id == id);
    if (!ficha) {
        mostrarAlerta('❌ Ficha no encontrada', 'error');
        return;
    }
    
    fichaSeleccionada = ficha;
    
    // Remover selección previa
    document.querySelectorAll('.ficha-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Agregar selección actual
    const selectedItem = document.querySelector(`.ficha-item[data-id="${id}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    
    // Mostrar vista de ficha
    mostrarFichaDetalle(ficha);
}

function mostrarFichaDetalle(ficha) {
    const container = document.getElementById('fichaDetalle');
    const fecha = ficha.created_at ? new Date(ficha.created_at).toLocaleString() : 'N/A';
    
    // Preparar fotos
    const fotosHtml = [];
    for (let i = 1; i <= 4; i++) {
        const fotoUrl = ficha[`foto${i}_url`];
        if (fotoUrl) {
            fotosHtml.push(`
                <div class="foto-box">
                    <img src="${fotoUrl}" alt="Foto ${i}" style="display: block;">
                </div>
            `);
        } else {
            fotosHtml.push(`
                <div class="foto-box">
                    <span>Foto ${i}</span>
                </div>
            `);
        }
    }
    
    // ============================================
    // FORMATO IDÉNTICO A ficha-crear.html
    // ============================================
    const html = `
        <div class="ficha-header">
            <img src="../img/logo.png" alt="Venezuela" class="ficha-logo" onerror="this.style.display='none'">
            <div class="ficha-title">
                <h1>Ministerio del Poder Popular para<br>Relaciones Interiores, Justicia y Paz</h1>
                <h2>REDIP: OCCIDENTAL</h2>
                <h3>CCPE ZULIA</h3>
            </div>
            <img src="../img/logo-juntos.png" alt="Juntos por la Vida" class="ficha-logo-right" onerror="this.style.display='none'">
        </div>
        <table class="ficha-table">
            <tr>
                <th colspan="5">DATOS DEL VEHICULO</th>
                <th rowspan="6" style="width: 22%; vertical-align: top; text-align: center;">
                    OBSERVACIONES<br><br>
                    <div class="observaciones-box">${ficha.observaciones || 'Sin observaciones'}</div>
                </th>
            </tr>
            <tr>
                <td class="label">MARCA</td>
                <td class="value">${ficha.marca || 'N/A'}</td>
                <td class="label">MODELO</td>
                <td class="value">${ficha.modelo || 'N/A'}</td>
                <td class="label">TIPO: ${ficha.tipo || 'N/A'}</td>
            </tr>
            <tr>
                <td class="label">SERIAL CARROCERIA</td>
                <td class="value">${ficha.s_carroceria || 'N/A'}</td>
                <td class="label">CLASE</td>
                <td class="value">${ficha.clase || 'N/A'}</td>
                <td class="label">COLOR: ${ficha.color || 'N/A'}</td>
            </tr>
            <tr>
                <td class="label">PLACA</td>
                <td class="value">${ficha.placa || 'N/A'}</td>
                <td class="label">FACSIMIL</td>
                <td class="value">${ficha.facsimil || 'N/A'}</td>
                <td class="label">DEPENDENCIA:<br>${ficha.dependencia || 'N/A'}</td>
            </tr>
            <tr>
                <td class="label">SERIAL MOTOR</td>
                <td class="value">${ficha.s_motor || 'N/A'}</td>
                <td class="label" colspan="3"></td>
            </tr>
            <tr>
                <td class="label">ESTATUS DEL VEHICULO</td>
                <td colspan="4" style="text-align: center; font-weight: bold;">${ficha.estatus_ficha || 'N/A'}</td>
            </tr>
            <tr>
                <th colspan="6">INFORMACIÓN TECNICO MECANICA POR INOPERATIVIDAD</th>
            </tr>
            <tr>
                <td class="label">CAUSA</td>
                <td colspan="2">${ficha.causa || 'N/A'}</td>
                <td class="label">DIAGNÓSTICO</td>
                <td colspan="2">${ficha.diagnostico || 'N/A'}</td>
            </tr>
            <tr>
                <td class="label">MECANICA</td>
                <td colspan="2">${ficha.mecanica || 'N/A'}</td>
                <td class="label">UBICACIÓN</td>
                <td colspan="2">${ficha.ubicacion || 'N/A'}</td>
            </tr>
            <tr>
                <td class="label">TAPICERIA</td>
                <td>${ficha.tapiceria || 'N/A'}</td>
                <td class="label">CAUCHOS</td>
                <td>${ficha.cauchos || 'N/A'}</td>
                <td class="label">LUCES</td>
                <td>${ficha.luces || 'N/A'}</td>
            </tr>
            <tr>
                <th colspan="6">REGISTRO FOTOGRÁFICO</th>
            </tr>
            <tr>
                <td colspan="6">
                    <div class="fotos-container">
                        ${fotosHtml.join('')}
                    </div>
                </td>
            </tr>
            <tr>
                <td colspan="6" style="text-align: center; font-size: 11px; color: #666;">
                    Ficha creada el: ${fecha}
                </td>
            </tr>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Mostrar sección de vista
    const viewSection = document.getElementById('fichaViewSection');
    viewSection.classList.add('active');
    
    // Scroll a la vista
    viewSection.scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

function limpiarBusqueda() {
    document.getElementById('searchPlaca').value = '';
    document.getElementById('searchFacsimil').value = '';
    document.getElementById('searchSerialCarroceria').value = '';
    document.getElementById('searchSerialMotor').value = '';
    document.getElementById('searchAlert').style.display = 'none';
    
    fichasEncontradas = [];
    fichaSeleccionada = null;
    
    document.getElementById('fichasList').innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
            <p>🔍 Realice una búsqueda para ver las fichas disponibles</p>
        </div>
    `;
    
    document.getElementById('fichaViewSection').classList.remove('active');
}

function cerrarFicha() {
    document.getElementById('fichaViewSection').classList.remove('active');
    fichaSeleccionada = null;
    
    document.querySelectorAll('.ficha-item').forEach(item => {
        item.classList.remove('selected');
    });
}

function imprimirFicha() {
    window.print();
}

function mostrarAlerta(mensaje, tipo) {
    const alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando consulta de fichas técnicas...');
    
    // Permitir buscar con Enter
    const inputs = ['searchPlaca', 'searchFacsimil', 'searchSerialCarroceria', 'searchSerialMotor'];
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    buscarFichas();
                }
            });
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
    
    // Cargar usuario
    cargarUsuario();
    
    console.log('✅ Consulta de fichas inicializada');
});

async function cargarUsuario() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user && session.user.email) {
            document.getElementById('userEmail').textContent = session.user.email;
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}
// Permitir buscar con Enter
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarFichas();
        }
    });
}
// Alias para compatibilidad con el HTML
window.buscarVehiculo = buscarFichas;
