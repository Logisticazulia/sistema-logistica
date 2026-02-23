/**
 * ============================================
 * CONSULTA DE FICHAS TÉCNICAS - SUPABASE
 * ============================================
 */

// ================= CONFIGURACIÓN =================
let supabaseClient = null;
let allFichas = [];
let filteredFichas = [];
let currentFicha = null;

// ================= INICIALIZAR SUPABASE =================
function inicializarSupabase() {
    if (typeof window.supabase === 'undefined') {
        console.error('❌ Librería Supabase no cargada');
        return false;
    }
    
    var url = window.SUPABASE_URL;
    var key = window.SUPABASE_KEY;
    
    if (!url || !key) {
        console.error('❌ Configuración de Supabase no encontrada');
        return false;
    }
    
    try {
        supabaseClient = window.supabase.createClient(url, key);
        console.log('✅ Supabase inicializado correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        return false;
    }
}

// ================= CARGAR FICHAS TÉCNICAS =================
async function cargarFichas() {
    try {
        console.log('📊 Cargando fichas técnicas desde Supabase...');
        
        var result = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .order('fecha_creacion', { ascending: false });
        
        if (result.error) {
            console.error('❌ Error al cargar fichas:', result.error);
            mostrarAlerta('Error al cargar datos: ' + result.error.message, 'error');
            return;
        }
        
        allFichas = result.data || [];
        filteredFichas = [...allFichas];
        
        console.log('✅ Fichas cargadas:', allFichas.length);
        renderTable();
        
    } catch (error) {
        console.error('❌ Error cargando fichas:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

// ================= BUSCAR FICHA =================
async function buscarFicha() {
    var searchInput = document.getElementById('searchInput');
    
    if (!searchInput) {
        mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
        return;
    }
    
    var searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        filteredFichas = [...allFichas];
        renderTable();
        return;
    }
    
    console.log('🔍 Buscando ficha:', searchTerm);
    mostrarAlerta('⏳ Buscando...', 'info');
    
    try {
        var result = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .or('placa.eq.' + searchTerm + ',facsimil.eq.' + searchTerm + ',s_carroceria.eq.' + searchTerm + ',s_motor.eq.' + searchTerm + ',marca.ilike.%' + searchTerm + '%,modelo.ilike.%' + searchTerm + '%')
            .order('fecha_creacion', { ascending: false });
        
        if (result.error) {
            console.error('❌ Error en búsqueda:', result.error);
            mostrarAlerta('Error: ' + result.error.message, 'error');
            return;
        }
        
        filteredFichas = result.data || [];
        
        console.log('📊 Resultados:', filteredFichas.length);
        
        if (filteredFichas.length === 0) {
            mostrarAlerta('❌ No se encontró ninguna ficha con: ' + searchTerm, 'error');
        } else {
            mostrarAlerta('✅ ' + filteredFichas.length + ' ficha(s) encontrada(s)', 'success');
        }
        
        renderTable();
        
    } catch (error) {
        console.error('❌ Error en buscarFicha:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

// ================= LIMPIAR BÚSQUEDA =================
function limpiarBusqueda() {
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    var searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    filteredFichas = [...allFichas];
    renderTable();
    mostrarAlerta('🔄 Búsqueda limpiada', 'info');
}

// ================= MOSTRAR ALERTA =================
function mostrarAlerta(mensaje, tipo) {
    var alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';
    
    setTimeout(function() {
        alertDiv.style.display = 'none';
    }, 5000);
}

// ================= RENDERIZAR TABLA =================
function renderTable() {
    var tbody = document.getElementById('resultsBody');
    
    if (!tbody) return;
    
    if (filteredFichas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 50px; color: #666;">📭 No hay fichas técnicas registradas</td></tr>';
        return;
    }
    
    var html = filteredFichas.map(function(ficha) {
        var estatusClass = 'badge-operativa';
        var estatusText = ficha.estatus_ficha || 'N/A';
        
        if (estatusText.toUpperCase().includes('INOPERATIVO')) {
            estatusClass = 'badge-inoperativa';
        } else if (estatusText.toUpperCase().includes('DESINCORPORADO')) {
            estatusClass = 'badge-desincorporada';
        }
        
        return '<tr>' +
            '<td><strong>' + (ficha.placa || 'N/A') + '</strong></td>' +
            '<td>' + (ficha.marca || 'N/A') + '</td>' +
            '<td>' + (ficha.modelo || 'N/A') + '</td>' +
            '<td>' + (ficha.tipo || 'N/A') + '</td>' +
            '<td>' + (ficha.color || 'N/A') + '</td>' +
            '<td><span class="badge ' + estatusClass + '">' + estatusText + '</span></td>' +
            '<td>' + (ficha.dependencia || 'N/A').substring(0, 30) + '...</td>' +
            '<td>' +
            '<button class="btn-view" onclick="verFicha(\'' + (ficha.id || '') + '\')">👁️ Ver</button>' +
            '<button class="btn-print" onclick="imprimirFicha(\'' + (ficha.id || '') + '\')">🖨️ Imprimir</button>' +
            '</td>' +
            '</tr>';
    }).join('');
    
    tbody.innerHTML = html;
}

// ================= VER FICHA DETALLADA =================
function verFicha(id) {
    var ficha = allFichas.find(function(f) { return f.id == id; });
    
    if (!ficha) {
        mostrarAlerta('❌ Ficha no encontrada', 'error');
        return;
    }
    
    currentFicha = ficha;
    
    // Llenar datos del modal
    document.getElementById('modalMarca').textContent = ficha.marca || 'N/A';
    document.getElementById('modalModelo').textContent = ficha.modelo || 'N/A';
    document.getElementById('modalTipo').textContent = ficha.tipo || 'N/A';
    document.getElementById('modalClase').textContent = ficha.clase || 'N/A';
    document.getElementById('modalColor').textContent = ficha.color || 'N/A';
    document.getElementById('modalSerialCarroceria').textContent = ficha.s_carroceria || 'N/A';
    document.getElementById('modalSerialMotor').textContent = ficha.s_motor || 'N/A';
    document.getElementById('modalPlaca').textContent = ficha.placa || 'N/A';
    document.getElementById('modalFacsimilar').textContent = ficha.facsimil || 'N/A';
    document.getElementById('modalDependencia').textContent = ficha.dependencia || 'N/A';
    document.getElementById('modalEstatus').textContent = ficha.estatus_ficha || 'N/A';
    
    // Información técnico mecánica
    document.getElementById('modalCausa').textContent = ficha.causa || 'N/A';
    document.getElementById('modalMecanica').textContent = ficha.mecanica || 'N/A';
    document.getElementById('modalDiagnostico').textContent = ficha.diagnostico || 'N/A';
    document.getElementById('modalUbicacion').textContent = ficha.ubicacion || 'N/A';
    document.getElementById('modalTapiceria').textContent = ficha.tapiceria || 'N/A';
    document.getElementById('modalCauchos').textContent = ficha.cauchos || 'N/A';
    document.getElementById('modalLuces').textContent = ficha.luces || 'N/A';
    
    // Observaciones
    document.getElementById('modalObservaciones').textContent = ficha.observaciones || 'Sin observaciones';
    
    // Fecha y creador
    document.getElementById('modalFechaCreacion').textContent = ficha.fecha_creacion ? new Date(ficha.fecha_creacion).toLocaleString() : 'N/A';
    document.getElementById('modalCreadoPor').textContent = ficha.creado_por || 'N/A';
    
    // Fotos
    cargarFotosModal(ficha);
    
    // Mostrar modal
    document.getElementById('fichaModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ================= CARGAR FOTOS EN MODAL =================
function cargarFotosModal(ficha) {
    for (var i = 1; i <= 4; i++) {
        var img = document.getElementById('modalImg' + i);
        var box = document.getElementById('modalBox' + i);
        var span = box ? box.querySelector('span') : null;
        
        var fotoUrl = ficha['foto' + i + '_url'];
        
        if (fotoUrl && fotoUrl.trim() !== '') {
            if (img) {
                img.src = fotoUrl;
                img.style.display = 'block';
            }
            if (span) span.style.display = 'none';
        } else {
            if (img) img.style.display = 'none';
            if (span) span.style.display = 'block';
        }
    }
}

// ================= CERRAR MODAL =================
function cerrarModal() {
    document.getElementById('fichaModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentFicha = null;
}

// ================= IMPRIMIR FICHA =================
function imprimirFicha(id) {
    if (id) {
        verFicha(id);
    }
    
    setTimeout(function() {
        window.print();
    }, 500);
}

// ================= CARGAR USUARIO =================
async function cargarUsuario() {
    try {
        if (supabaseClient) {
            var result = await supabaseClient.auth.getSession();
            var session = result.data ? result.data.session : null;
            
            if (session && session.user && session.user.email) {
                var userEmail = document.getElementById('userEmail');
                if (userEmail) {
                    userEmail.textContent = session.user.email;
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}

// ================= CERRAR SESIÓN =================
async function cerrarSesion() {
    if (confirm('¿Está seguro de cerrar sesión?')) {
        try {
            if (supabaseClient) {
                await supabaseClient.auth.signOut();
            }
            localStorage.clear();
            window.location.href = '../index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '../index.html';
        }
    }
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando consulta de fichas técnicas...');
    
    if (!inicializarSupabase()) {
        console.warn('⚠️ Supabase no disponible');
    }
    
    cargarFichas();
    cargarUsuario();
    
    // Event listeners
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                buscarFicha();
            }
        });
    }
    
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', cerrarSesion);
    }
    
    // Cerrar modal al hacer click fuera
    window.onclick = function(event) {
        var modal = document.getElementById('fichaModal');
        if (event.target === modal) {
            cerrarModal();
        }
    };
    
    console.log('✅ Inicialización completada');
});
