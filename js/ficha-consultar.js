// ============================================
// CONSULTAR FICHAS TÉCNICAS - LÓGICA COMPLETA
// Archivo: ficha-consultar.js
// ============================================

// ================= CONFIGURACIÓN =================
let supabaseClient = null;

// ================= ESTADO =================
let fichasEncontradas = [];
let fichasFiltradas = [];
let paginaActual = 1;
const registrosPorPagina = 15;

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
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar Supabase:', error);
        return false;
    }
}

// ================= LIMPIAR TEXTO =================
function limpiarTexto(texto) {
    if (!texto) return '';
    return texto.toString().trim().toUpperCase();
}

// ================= MOSTRAR ALERTA =================
function mostrarAlerta(mensaje, tipo) {
    var alertDiv = document.getElementById('searchAlert');
    if (!alertDiv) return;
    
    alertDiv.textContent = mensaje;
    alertDiv.className = 'alert alert-' + tipo;
    alertDiv.style.display = 'block';

    // Auto-scroll suave hacia la alerta
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            alertDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    });

    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// ================= BUSCAR VEHÍCULO =================
async function buscarVehiculo() {
    var searchInput = document.getElementById('searchInput');
    if (!searchInput) return mostrarAlerta('❌ Campo de búsqueda no encontrado', 'error');
    
    var searchTerm = limpiarTexto(searchInput.value);
    if (!searchTerm) return mostrarAlerta('⚠️ Ingrese un término de búsqueda', 'error');

    mostrarAlerta('⏳ Buscando en base de datos...', 'info');
    
    var btnSearch = document.querySelector('.btn-search');
    if (btnSearch) btnSearch.disabled = true;

    try {
        // Buscar por placa, facsimil, seriales, marca y modelo
        var result = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .or(
                'placa.eq."' + searchTerm + '",' +
                'facsimil.eq."' + searchTerm + '",' +
                's_carroceria.eq."' + searchTerm + '",' +
                's_motor.eq."' + searchTerm + '",' +
                'marca.ilike.%' + searchTerm + '%,' +
                'modelo.ilike.%' + searchTerm + '%'
            )
            .order('created_at', { ascending: false });

        if (result.error) throw result.error;

        if (!result.data || result.data.length === 0) {
            mostrarAlerta('❌ No se encontró ninguna ficha con: ' + searchTerm, 'error');
            fichasEncontradas = [];
            fichasFiltradas = [];
            paginaActual = 1;
            renderizarTabla();
            actualizarPaginacion();
            return;
        }

        fichasEncontradas = result.data;
        mostrarAlerta('✅ Se encontraron ' + fichasEncontradas.length + ' ficha(s)', 'success');
        
        // Resetear filtro y aplicar
        var filtroSelect = document.getElementById('filtroTipo');
        if (filtroSelect) filtroSelect.value = 'todos';
        aplicarFiltro();
    } catch (error) {
        console.error('❌ Error en buscarVehiculo:', error);
        mostrarAlerta('❌ Error: ' + error.message, 'error');
    } finally {
        if (btnSearch) btnSearch.disabled = false;
    }
}

// ================= APLICAR FILTRO =================
function aplicarFiltro() {
    var filtroSelect = document.getElementById('filtroTipo');
    if (!filtroSelect) return;
    
    var valorFiltro = filtroSelect.value;

    if (valorFiltro === 'todos') {
        fichasFiltradas = fichasEncontradas.slice();
    } else if (valorFiltro === 'motos') {
        // Solo MOTO
        fichasFiltradas = fichasEncontradas.filter(function(f) {
            return f.tipo && limpiarTexto(f.tipo) === 'MOTO';
        });
    } else if (valorFiltro === 'vehiculos') {
        // Todo lo que NO sea MOTO (CAMIONETA, AUTOMOVIL, BUS, CAMION, etc.)
        fichasFiltradas = fichasEncontradas.filter(function(f) {
            return !f.tipo || limpiarTexto(f.tipo) !== 'MOTO';
        });
    }

    // Resetear a página 1 al aplicar filtro
    paginaActual = 1;
    renderizarTabla();
    actualizarPaginacion();
}

// ================= RENDERIZAR TABLA =================
function renderizarTabla() {
    var tbody = document.getElementById('resultsBody');
    if (!tbody) return;
    
    var inicio = (paginaActual - 1) * registrosPorPagina;
    var fin = inicio + registrosPorPagina;
    var fichasPagina = fichasFiltradas.slice(inicio, fin);

    if (fichasPagina.length === 0) {
        tbody.innerHTML = 
            '<tr>' +
                '<td colspan="8" style="text-align: center; padding: 50px; color: #666; font-size: 15px;">' +
                    '📭 No hay resultados para mostrar' +
                '</td>' +
            '</tr>';
        return;
    }

    var html = fichasPagina.map(function(ficha) {
        var fecha = ficha.created_at ? new Date(ficha.created_at).toLocaleDateString('es-VE') : 'N/A';
        var estatus = ficha.estatus_ficha || 'N/A';
        var colorEstatus = estatus === 'OPERATIVO' ? '#d4edda' : 
                          estatus === 'INOPERATIVO' ? '#fff3cd' : '#f8d7da';
        var colorTexto = estatus === 'OPERATIVO' ? '#155724' : 
                        estatus === 'INOPERATIVO' ? '#856404' : '#721c24';
        var tipoIcono = ficha.tipo === 'MOTO' ? '🏍️' : '🚗';

        return 
            '<tr>' +
                '<td><strong>' + (ficha.placa || 'N/A') + '</strong></td>' +
                '<td>' + (ficha.marca || 'N/A') + '</td>' +
                '<td>' + (ficha.modelo || 'N/A') + '</td>' +
                '<td>' + tipoIcono + ' ' + (ficha.tipo || 'N/A') + '</td>' +
                '<td>' + (ficha.color || 'N/A') + '</td>' +
                '<td><span style="padding: 4px 8px; border-radius: 4px; background: ' + colorEstatus + '; color: ' + colorTexto + '; font-weight: 600;">' + estatus + '</span></td>' +
                '<td>' + (ficha.dependencia || 'N/A') + '</td>' +
                '<td>' +
                    '<button class="btn-view" onclick="verFicha(\'' + ficha.id + '\')">' +
                        '👁️ Ver Ficha' +
                    '</button>' +
                '</td>' +
            '</tr>';
    }).join('');

    tbody.innerHTML = html;
}

// ================= ACTUALIZAR PAGINACIÓN =================
function actualizarPaginacion() {
    var totalPaginas = Math.ceil(fichasFiltradas.length / registrosPorPagina) || 1;
    var inicio = fichasFiltradas.length > 0 ? (paginaActual - 1) * registrosPorPagina + 1 : 0;
    var fin = Math.min(paginaActual * registrosPorPagina, fichasFiltradas.length);

    var elPaginaActual = document.getElementById('paginaActual');
    var elTotalPaginas = document.getElementById('totalPaginas');
    var elMostrandoInicio = document.getElementById('mostrandoInicio');
    var elMostrandoFin = document.getElementById('mostrandoFin');
    var elTotalRegistros = document.getElementById('totalRegistros');
    var btnAnterior = document.getElementById('btnAnterior');
    var btnSiguiente = document.getElementById('btnSiguiente');

    if (elPaginaActual) elPaginaActual.textContent = paginaActual;
    if (elTotalPaginas) elTotalPaginas.textContent = totalPaginas;
    if (elMostrandoInicio) elMostrandoInicio.textContent = inicio;
    if (elMostrandoFin) elMostrandoFin.textContent = fin;
    if (elTotalRegistros) elTotalRegistros.textContent = fichasFiltradas.length;
    if (btnAnterior) btnAnterior.disabled = paginaActual === 1;
    if (btnSiguiente) btnSiguiente.disabled = paginaActual === totalPaginas || totalPaginas === 0;
}

// ================= CAMBIAR PÁGINA =================
function cambiarPagina(direccion) {
    var totalPaginas = Math.ceil(fichasFiltradas.length / registrosPorPagina) || 1;
    var nuevaPagina = paginaActual + direccion;

    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        renderizarTabla();
        actualizarPaginacion();

        // Scroll suave a la tabla de resultados
        var resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// ================= VER FICHA =================
function verFicha(id) {
    var ficha = fichasEncontradas.find(function(f) {
        return f.id == id;
    });

    if (!ficha) {
        mostrarAlerta('❌ Ficha no encontrada', 'error');
        return;
    }

    // Llenar datos del modal
    var campos = [
        { key: 'marca', id: 'modalMarca' },
        { key: 'modelo', id: 'modalModelo' },
        { key: 'tipo', id: 'modalTipo' },
        { key: 'clase', id: 'modalClase' },
        { key: 'color', id: 'modalColor' },
        { key: 'placa', id: 'modalPlaca' },
        { key: 'facsimil', id: 'modalFacsimilar' },
        { key: 'dependencia', id: 'modalDependencia' },
        { key: 's_carroceria', id: 'modalSerialCarroceria' },
        { key: 's_motor', id: 'modalSerialMotor' },
        { key: 'estatus_ficha', id: 'modalEstatus' },
        { key: 'causa', id: 'modalCausa' },
        { key: 'diagnostico', id: 'modalDiagnostico' },
        { key: 'mecanica', id: 'modalMecanica' },
        { key: 'ubicacion', id: 'modalUbicacion' },
        { key: 'tapiceria', id: 'modalTapiceria' },
        { key: 'cauchos', id: 'modalCauchos' },
        { key: 'luces', id: 'modalLuces' },
        { key: 'observaciones', id: 'modalObservaciones' }
    ];

    campos.forEach(function(campo) {
        var el = document.getElementById(campo.id);
        if (el) el.textContent = ficha[campo.key] || 'N/A';
    });

    // Fecha y creador
    var fechaEl = document.getElementById('modalFechaCreacion');
    if (fechaEl) fechaEl.textContent = ficha.created_at ? new Date(ficha.created_at).toLocaleString('es-VE') : 'N/A';
    
    var creadorEl = document.getElementById('modalCreadoPor');
    if (creadorEl) creadorEl.textContent = ficha.creado_por || 'N/A';

    // Fotos
    for (var i = 1; i <= 4; i++) {
        var fotoUrl = ficha['foto' + i + '_url'];
        var imgElement = document.getElementById('modalImg' + i);
        var boxElement = document.getElementById('modalBox' + i);
        var spanElement = boxElement ? boxElement.querySelector('span') : null;

        if (fotoUrl && imgElement && spanElement) {
            imgElement.src = fotoUrl;
            imgElement.style.display = 'block';
            spanElement.style.display = 'none';
        } else if (spanElement) {
            if (imgElement) imgElement.style.display = 'none';
            spanElement.style.display = 'block';
        }
    }

    // Mostrar modal
    var modal = document.getElementById('fichaModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// ================= CERRAR MODAL =================
function cerrarModal() {
    var modal = document.getElementById('fichaModal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ================= IMPRIMIR FICHA =================
function imprimirFicha() {
    window.print();
}

// ================= LIMPIAR BÚSQUEDA =================
function limpiarBusqueda() {
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    
    var filtroTipo = document.getElementById('filtroTipo');
    if (filtroTipo) filtroTipo.value = 'todos';

    fichasEncontradas = [];
    fichasFiltradas = [];
    paginaActual = 1;

    var alertDiv = document.getElementById('searchAlert');
    if (alertDiv) alertDiv.style.display = 'none';

    renderizarTabla();
    actualizarPaginacion();

    mostrarAlerta('🔄 Búsqueda limpiada', 'info');
}

// ================= CARGAR USUARIO =================
async function cargarUsuario() {
    try {
        var res = await supabaseClient.auth.getSession();
        var email = res.data?.session?.user?.email;
        var userEmailEl = document.getElementById('userEmail');
        if (userEmailEl) userEmailEl.textContent = email || 'Invitado';
    } catch (error) {
        console.error('Error al cargar usuario:', error);
    }
}

// ================= INICIALIZACIÓN =================
document.addEventListener('DOMContentLoaded', function() {
    if (!inicializarSupabase()) return;

    // Búsqueda con Enter
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                buscarVehiculo();
            }
        });
    }

    // Cerrar sesión
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('¿Cerrar sesión?')) {
                window.location.href = '../index.html';
            }
        });
    }

    // Cerrar modal al hacer clic fuera
    window.onclick = function(event) {
        var modal = document.getElementById('fichaModal');
        if (event.target === modal) {
            cerrarModal();
        }
    };

    // Cargar usuario
    cargarUsuario();

    // Estado inicial
    renderizarTabla();
    actualizarPaginacion();

    console.log('✅ Consulta de fichas inicializada');
});
