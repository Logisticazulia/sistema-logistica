// ============================================
// CONSULTAR FICHAS TÉCNICAS - LÓGICA CORREGIDA
// ============================================

// Verificación de seguridad para evitar errores si config.js no cargó
if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) {
    console.error('❌ Error crítico: Supabase o configuración no cargada. Verifique que config.js se carga antes que este archivo.');
}

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

    try {
        // Búsqueda parcial e insensible a mayúsculas/minúsculas
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .or(
                `placa.ilike.%${searchTerm}%,` +
                `facsimil.ilike.%${searchTerm}%,` +
                `s_carroceria.ilike.%${searchTerm}%,` +
                `s_motor.ilike.%${searchTerm}%,` +
                `marca.ilike.%${searchTerm}%,` +
                `modelo.ilike.%${searchTerm}%`
            )
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error en la búsqueda:', error);
            mostrarAlerta('❌ Error al buscar: ' + error.message, 'error');
            return;
        }

        fichasEncontradas = data || [];

        if (fichasEncontradas.length === 0) {
            mostrarAlerta('😕 No se encontraron resultados para: ' + searchTerm, 'info');
        } else {
            mostrarAlerta(`✅ Se encontraron ${fichasEncontradas.length} ficha(s) técnica(s)`, 'success');
        }

        renderizarListaFichas();
    } catch (error) {
        console.error('❌ Error inesperado en buscarFichas:', error);
        mostrarAlerta('❌ Error de conexión: ' + error.message, 'error');
    }
}

// Alias para compatibilidad con tu HTML: onclick="buscarVehiculo()"
window.buscarVehiculo = buscarFichas;

// ============================================
// RENDERIZAR LISTA DE FICHAS
// ============================================
function renderizarListaFichas() {
    const tbody = document.getElementById('resultsBody');
    if (!tbody) {
        console.error('❌ No se encontró el elemento #resultsBody');
        return;
    }

    tbody.innerHTML = '';

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

    const html = fichasEncontradas.map(ficha => {
        const placa = ficha.placa || 'N/A';
        const marca = ficha.marca || 'N/A';
        const modelo = ficha.modelo || 'N/A';
        const tipo = ficha.tipo || 'N/A';
        const color = ficha.color || 'N/A';
        const estatus = ficha.estatus_ficha || 'N/A';
        const dependencia = ficha.dependencia || 'N/A';
        const id = ficha.id;

        let estatusBg = '#fff3cd';
        let estatusColor = '#856404';
        if (estatus === 'OPERATIVO') { estatusBg = '#d4edda'; estatusColor = '#155724'; }
        else if (estatus === 'INOPERATIVO') { estatusBg = '#f8d7da'; estatusColor = '#721c24'; }
        else if (estatus === 'DESINCORPORADO') { estatusBg = '#d6d8db'; estatusColor = '#383d41'; }

        return `
            <tr>
                <td><strong>${placa}</strong></td>
                <td>${marca}</td>
                <td>${modelo}</td>
                <td>${tipo}</td>
                <td>${color}</td>
                <td>
                    <span style="padding: 4px 8px; border-radius: 4px; background: ${estatusBg}; color: ${estatusColor}; font-weight: 500;">
                        ${estatus}
                    </span>
                </td>
                <td>${dependencia}</td>
                <td>
                    <button class="btn-view" onclick="verFicha('${id}')">
                        👁️ Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = html;
}

// ============================================
// VER DETALLE DE FICHA (MODAL)
// ============================================
function verFicha(id) {
    const ficha = fichasEncontradas.find(f => String(f.id) === String(id));
    if (!ficha) {
        mostrarAlerta('❌ Ficha no encontrada', 'error');
        return;
    }
    fichaSeleccionada = ficha;
    mostrarFichaDetalle(ficha);
    abrirModal();
}

function mostrarFichaDetalle(ficha) {
    const fecha = ficha.created_at ? new Date(ficha.created_at).toLocaleString('es-VE', { timeZone: 'UTC' }) : 'N/A';

    // Función auxiliar segura para asignar texto
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || 'N/A'; };

    // Campos principales
    setText('modalMarca', ficha.marca);
    setText('modalModelo', ficha.modelo);
    setText('modalTipo', ficha.tipo);
    setText('modalClase', ficha.clase);
    setText('modalColor', ficha.color);
    setText('modalPlaca', ficha.placa);
    setText('modalFacsimilar', ficha.facsimil);
    setText('modalDependencia', ficha.dependencia);
    setText('modalSerialCarroceria', ficha.s_carroceria);
    setText('modalSerialMotor', ficha.s_motor);
    setText('modalObservaciones', ficha.observaciones || 'Sin observaciones');

    // Estatus con color dinámico
    const elEstatus = document.getElementById('modalEstatus');
    if (elEstatus) {
        elEstatus.textContent = ficha.estatus_ficha || 'N/A';
        elEstatus.style.color =
            ficha.estatus_ficha === 'OPERATIVO' ? '#155724' :
            ficha.estatus_ficha === 'INOPERATIVO' ? '#721c24' :
            ficha.estatus_ficha === 'DESINCORPORADO' ? '#383d41' : '#856404';
        elEstatus.style.fontWeight = 'bold';
        elEstatus.style.fontSize = '14px';
    }

    // Info técnico mecánica
    setText('modalCausa', ficha.causa);
    setText('modalDiagnostico', ficha.diagnostico);
    setText('modalMecanica', ficha.mecanica);
    setText('modalUbicacion', ficha.ubicacion);
    setText('modalTapiceria', ficha.tapiceria);
    setText('modalCauchos', ficha.cauchos);
    setText('modalLuces', ficha.luces);

    // Fotos
    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById(`modalImg${i}`);
        const box = document.getElementById(`modalBox${i}`);
        if (img && box) {
            const fotoUrl = ficha[`foto${i}_url`];
            if (fotoUrl && fotoUrl.trim() !== '') {
                img.src = fotoUrl;
                img.style.display = 'block';
                const span = box.querySelector('span');
                if (span) span.style.display = 'none';
            } else {
                img.style.display = 'none';
                const span = box.querySelector('span');
                if (span) span.style.display = 'block';
            }
        }
    }

    // Fecha y creador
    setText('modalFechaCreacion', fecha);
    setText('modalCreadoPor', ficha.creado_por);
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
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================
function limpiarBusqueda() {
    const searchInput = document.getElementById('searchInput');
    const alertDiv = document.getElementById('searchAlert');

    if (searchInput) searchInput.value = '';
    if (alertDiv) alertDiv.style.display = 'none';

    fichasEncontradas = [];
    fichaSeleccionada = null;

    renderizarListaFichas();
    cerrarModal();
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
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// ============================================
// INICIALIZACIÓN Y EVENTOS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando consulta de fichas técnicas...');

    // Buscar con Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarFichas();
            }
        });
    }

    // Cargar estado inicial
    renderizarListaFichas();

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
            const el = document.getElementById('userEmail');
            if (el) el.textContent = session.user.email;
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}
