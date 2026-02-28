/**
 * CONSULTAR ACTA DE ASIGNACIÓN
 */

let supabaseClient = null;

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Inicializando consulta de actas...');
    
    // Inicializar Supabase
    supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_KEY
    );
    
    // Cargar usuario
    await cargarUsuario();
    
    // Configurar logout
    configurarLogout();
    
    // Configurar búsqueda con Enter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarActa();
            }
        });
    }
    
    console.log('✅ Consulta de actas inicializada');
});

async function cargarUsuario() {
    try {
        const sessionData = await supabaseClient.auth.getSession();
        const session = sessionData.data ? sessionData.data.session : null;
        
        const userEmail = document.getElementById('userEmail');
        if (session && session.user && session.user.email) {
            userEmail.textContent = session.user.email;
        }
    } catch (err) {
        console.error('Error cargando usuario:', err);
    }
}

function configurarLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            await supabaseClient.auth.signOut();
            window.location.href = '../index.html';
        });
    }
}

async function buscarActa() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        alert('⚠️ Por favor ingrese un término de búsqueda');
        return;
    }
    
    try {
        console.log('🔍 Buscando acta:', searchTerm);
        
        // Buscar en tabla actas_asignacion
        const { data, error } = await supabaseClient
            .from('actas_asignacion')
            .select('*')
            .or(`numero_acta.eq.${searchTerm},placa.ilike.%${searchTerm}%,cedula_funcionario.ilike.%${searchTerm}%`)
            .order('fecha_asignacion', { ascending: false });
        
        if (error) throw error;
        
        const tbody = document.getElementById('resultsBody');
        
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #dc2626;">
                        No se encontraron actas con: ${searchTerm}
                    </td>
                </tr>
            `;
            return;
        }
        
        // Renderizar resultados
        tbody.innerHTML = data.map(acta => `
            <tr onclick="verDetalleActa('${acta.id}')">
                <td>${acta.numero_acta || 'N/A'}</td>
                <td>${acta.placa || 'N/A'}</td>
                <td>${acta.marca_vehiculo || 'N/A'} ${acta.modelo_vehiculo || ''}</td>
                <td>${acta.nombre_funcionario || 'N/A'}</td>
                <td>${acta.cedula_funcionario || 'N/A'}</td>
                <td>${formatDate(acta.fecha_asignacion)}</td>
                <td><span class="badge ${acta.estatus === 'ACTIVA' ? 'badge-operativa' : 'badge-inoperativa'}">${acta.estatus || 'N/A'}</span></td>
            </tr>
        `).join('');
        
        console.log(`✅ ${data.length} actas encontradas`);
        
    } catch (error) {
        console.error('❌ Error buscando acta:', error);
        alert('❌ Error al buscar: ' + error.message);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-VE');
}

function verDetalleActa(id) {
    // Redirigir a una página de detalle o mostrar modal
    console.log('Ver detalle de acta:', id);
    alert('Funcionalidad de detalle en desarrollo. ID: ' + id);
}

console.log('✅ Script acta-consultar.js cargado');
