/**
 * ============================================
 * CONSULTA DE FICHAS TÉCNICAS - SUPABASE
 * VERSIÓN COMPATIBLE CON ficha-consulta.html
 * ============================================
 */

// ================= CONFIGURACIÓN =================
let supabaseClient = null;
let allFichas = [];
let filteredFichas = [];

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
        filteredFichas = [].concat(allFichas);
        
        console.log('✅ Fichas cargadas:', allFichas.length);
        renderTable();
        
    } catch (error) {
        console.error('❌ Error cargando fichas:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

// ================= BUSCAR FICHA =================
async function buscarVehiculo() {
    var searchInput = document.getElementById('searchInput');
    
    if (!searchInput) {
        mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
        return;
    }
    
    var searchTerm = searchInput.value.trim().toUpperCase();
    
    if (!searchTerm) {
        filteredFichas = [].concat(allFichas);
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
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('Error: ' + error.message, 'error');
    }
}

// ================= LIMPIAR BÚSQUEDA =================
function limpiarBusqueda() {
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    var searchAlert = document.getElementById('searchAlert');
    if (searchAlert) searchAlert.style.display = 'none';
    
    filteredFichas = [].concat(allFichas);
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
    
    if (!tbody) {
        console.error('❌ tbody#resultsBody no encontrado');
        return;
    }
    
    if (filteredFichas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 50px; color: #666;">📭 No hay fichas técnicas registradas</td></tr>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < filteredFichas.length; i++) {
        var ficha = filteredFichas[i];
        var estatusClass = 'badge badge-operativa';
        var estatusText = ficha.estatus_ficha || 'N/A';
        
        if (estatusText.toUpperCase().indexOf('INOPERATIVO') !== -1) {
            estatusClass = 'badge badge-inoperativa';
        }
        
        html += '<tr>' +
            '<td><strong>' + (ficha.placa || 'N/A') + '</strong></td>' +
            '<td>' + (ficha.marca || 'N/A') + '</td>' +
            '<td>' + (ficha.modelo || 'N/A') + '</td>' +
            '<td>' + (ficha.tipo || 'N/A') + '</td>' +
            '<td>' + (ficha.color || 'N/A') + '</td>' +
            '<td><span class="' + estatusClass + '">' + estatusText + '</span></td>' +
            '<td>' + (ficha.dependencia || 'N/A').substring(0, 30) + '...</td>' +
            '<td>' +
            '<button class="btn-view" onclick="verFicha(\'' + (ficha.id || '') + '\')">👁️ Ver</button>' +
            '<button class="btn-print" onclick="imprimirFicha(\'' + (ficha.id || '') + '\')">🖨️</button>' +
            '</td>' +
            '</tr>';
    }
    
    tbody.innerHTML = html;
}

// ================= FUNCIÓN SEGURA PARA SETEAR TEXTO =================
function setTexto(idElemento, valor, esOpcional) {
    var el = document.getElementById(idElemento);
    if (el) {
        el.textContent = valor !== undefined && valor !== null ? valor : 'N/A';
        return true;
    } else {
        // Solo mostrar warning si NO es opcional
        if (!esOpcional) {
            console.warn('⚠️ Elemento requerido no encontrado:', idElemento);
        }
        return false;
    }
}

// ================= FUNCIÓN SEGURA PARA SETEAR HTML =================
function setHtml(idElemento, valor, esOpcional) {
    var el = document.getElementById(idElemento);
    if (el) {
        el.innerHTML = valor !== undefined && valor !== null ? valor : 'N/A';
        return true;
    } else {
        if (!esOpcional) {
            console.warn('⚠️ Elemento requerido no encontrado:', idElemento);
        }
        return false;
    }
}

// ================= VER FICHA DETALLADA =================
function verFicha(id) {
    console.log('🔍 Buscando ficha con ID:', id);
    
    var ficha = null;
    for (var i = 0; i < allFichas.length; i++) {
        if (String(allFichas[i].id) === String(id)) {
            ficha = allFichas[i];
            break;
        }
    }
    
    if (!ficha) {
        mostrarAlerta('❌ Ficha no encontrada', 'error');
        return;
    }
    
    console.log('✅ Ficha encontrada:', ficha.placa);
    
    // ✅ Llenar datos del modal - campos REQUERIDOS (sin esOpcional)
    setTexto('modalMarca', ficha.marca);
    setTexto('modalModelo', ficha.modelo);
    setTexto('modalTipo', ficha.tipo);
    setTexto('modalClase', ficha.clase);
    setTexto('modalColor', ficha.color);
    setTexto('modalSerialCarroceria', ficha.s_carroceria);
    setTexto('modalSerialMotor', ficha.s_motor);
    setTexto('modalPlaca', ficha.placa);
    setTexto('modalFacsimilar', ficha.facsimil);
    setTexto('modalDependencia', ficha.dependencia);
    setTexto('modalEstatus', ficha.estatus_ficha);
    
    // Información técnico mecánica
    setTexto('modalCausa', ficha.causa);
    setTexto('modalMecanica', ficha.mecanica);
    setTexto('modalDiagnostico', ficha.diagnostico);
    setTexto('modalUbicacion', ficha.ubicacion);
    setTexto('modalTapiceria', ficha.tapiceria);
    setTexto('modalCauchos', ficha.cauchos);
    setTexto('modalLuces', ficha.luces);
    
    // Observaciones
    setHtml('modalObservaciones', ficha.observaciones || 'Sin observaciones');
    
    // ✅ Fecha y creador - campos OPCIONALES (con esOpcional=true)
    if (ficha.fecha_creacion) {
        var fechaCreacion = new Date(ficha.fecha_creacion).toLocaleString('es-VE');
        setTexto('modalFechaCreacion', fechaCreacion, true);
    }
    setTexto('modalCreadoPor', ficha.creado_por, true);
    
    // ✅ CARGAR FOTOS CON VERIFICACIÓN
    cargarFotosModal(ficha);
    
    // ✅ MOSTRAR MODAL - con pequeño delay para asegurar renderizado
    setTimeout(function() {
        var modal = document.getElementById('fichaModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }, 50);
}

// ================= CARGAR FOTOS EN MODAL =================
function cargarFotosModal(ficha) {
    for (var i = 1; i <= 4; i++) {
        var img = document.getElementById('modalImg' + i);
        var box = document.getElementById('modalBox' + i);
        var span = box ? box.querySelector('span') : null;
        
        var fotoUrl = ficha['foto' + i + '_url'];
        
        if (fotoUrl && fotoUrl.trim() !== '' && img && box && span) {
            img.src = fotoUrl;
            img.style.display = 'block';
            span.style.display = 'none';
        } else if (span) {
            if (img) img.style.display = 'none';
            span.style.display = 'block';
        }
    }
}

// ================= CERRAR MODAL =================
function cerrarModal() {
    var modal = document.getElementById('fichaModal');
    if (modal) {
        modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
}

// ================= IMPRIMIR FICHA =================
function imprimirFicha() {
    window.print();
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
            if (typeof localStorage !== 'undefined') {
                localStorage.clear();
            }
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
                buscarVehiculo();
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
