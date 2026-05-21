// ============================================
// CONSULTAR FICHAS TÉCNICAS - LÓGICA COMPLETA
// Archivo: ficha-consultar.js
// ============================================

let supabaseClient = null;
let fichasEncontradas = [];
let fichasFiltradas = [];
let paginaActual = 1;
const REGISTROS_POR_PAGINA = 15;

function inicializarSupabase() {
    if (typeof window.supabase === 'undefined') return false;
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_KEY;
    if (!url || !key) return false;
    try {
        supabaseClient = window.supabase.createClient(url, key);
        return true;
    } catch (e) { return false; }
}

function limpiarTexto(t) { return t ? t.toString().trim().toUpperCase() : ''; }

function mostrarAlerta(msg, tipo) {
    const el = document.getElementById('searchAlert');
    if (!el) return;
    el.textContent = msg;
    el.className = 'alert alert-' + tipo;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => el.style.display = 'none', 5000);
}

async function buscarVehiculo() {
    const input = document.getElementById('searchInput');
    const term = limpiarTexto(input.value);
    if (!term) return mostrarAlerta('⚠️ Ingrese un término de búsqueda', 'error');

    mostrarAlerta('⏳ Buscando...', 'info');
    const btn = document.getElementById('btnSearch');
    btn.disabled = true;

    try {
        const { data, error } = await supabaseClient
            .from('fichas_tecnicas')
            .select('*')
            .or(
                `placa.ilike.%${term}%,facsimil.ilike.%${term}%,s_carroceria.ilike.%${term}%,s_motor.ilike.%${term}%,marca.ilike.%${term}%,modelo.ilike.%${term}%`
            )
            .order('created_at', { ascending: false });

        if (error) throw error;

        fichasEncontradas = data || [];
        if (fichasEncontradas.length === 0) return mostrarAlerta('❌ No se encontraron resultados', 'error');

        mostrarAlerta('✅ ' + fichasEncontradas.length + ' ficha(s) encontrada(s)', 'success');
        document.getElementById('filtroTipo').value = 'todos';
        aplicarFiltro();
    } catch (e) {
        console.error(e);
        mostrarAlerta('❌ Error: ' + e.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

function aplicarFiltro() {
    const tipo = document.getElementById('filtroTipo').value;
    const t = limpiarTexto;
    
    if (tipo === 'todos') fichasFiltradas = [...fichasEncontradas];
    else if (tipo === 'motos') fichasFiltradas = fichasEncontradas.filter(f => t(f.tipo) === 'MOTO');
    else if (tipo === 'vehiculos') fichasFiltradas = fichasEncontradas.filter(f => t(f.tipo) !== 'MOTO');
    
    paginaActual = 1;
    renderizarTabla();
    actualizarPaginacion();
}

function renderizarTabla() {
    const tbody = document.getElementById('resultsBody');
    if (!tbody) return;
    
    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    const fin = inicio + REGISTROS_POR_PAGINA;
    const datos = fichasFiltradas.slice(inicio, fin);

    if (datos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#666;">📭 No hay registros en esta página</td></tr>';
        return;
    }

    tbody.innerHTML = datos.map(f => {
        const est = f.estatus_ficha || 'N/A';
        const bg = est === 'OPERATIVO' ? '#d4edda' : est === 'INOPERATIVO' ? '#fff3cd' : '#f8d7da';
        const color = est === 'OPERATIVO' ? '#155724' : est === 'INOPERATIVO' ? '#856404' : '#721c24';
        const icono = limpiarTexto(f.tipo) === 'MOTO' ? '🏍️' : '🚗';
        
        return `<tr>
            <td><strong>${f.placa || 'N/A'}</strong></td>
            <td>${f.marca || 'N/A'}</td>
            <td>${f.modelo || 'N/A'}</td>
            <td>${icono} ${f.tipo || 'N/A'}</td>
            <td>${f.color || 'N/A'}</td>
            <td><span style="padding:4px 8px;border-radius:4px;background:${bg};color:${color};font-weight:600;">${est}</span></td>
            <td>${f.dependencia || 'N/A'}</td>
            <td><button class="btn-view" onclick="verFicha('${f.id}')">👁️ Ver</button></td>
        </tr>`;
    }).join('');
}

function actualizarPaginacion() {
    const total = fichasFiltradas.length;
    const paginas = Math.max(1, Math.ceil(total / REGISTROS_POR_PAGINA));
    const inicio = total > 0 ? (paginaActual - 1) * REGISTROS_POR_PAGINA + 1 : 0;
    const fin = Math.min(paginaActual * REGISTROS_POR_PAGINA, total);

    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    set('mostrandoInicio', inicio);
    set('mostrandoFin', fin);
    set('totalRegistros', total);
    set('paginaActual', paginaActual);
    set('totalPaginas', paginas);

    const btnA = document.getElementById('btnAnterior');
    const btnS = document.getElementById('btnSiguiente');
    if (btnA) btnA.disabled = paginaActual === 1;
    if (btnS) btnS.disabled = paginaActual === paginas;
}

function cambiarPagina(dir) {
    const paginas = Math.ceil(fichasFiltradas.length / REGISTROS_POR_PAGINA) || 1;
    const nueva = paginaActual + dir;
    if (nueva >= 1 && nueva <= paginas) {
        paginaActual = nueva;
        renderizarTabla();
        actualizarPaginacion();
        document.querySelector('.results-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function verFicha(id) {
    const f = fichasEncontradas.find(x => x.id == id);
    if (!f) return mostrarAlerta('❌ Ficha no encontrada', 'error');

    const map = ['marca','modelo','tipo','clase','color','placa','facsimil','dependencia','s_carroceria','s_motor','estatus_ficha','causa','diagnostico','mecanica','ubicacion','tapiceria','cauchos','luces','observaciones'];
    map.forEach(k => {
        const el = document.getElementById('modal' + k.charAt(0).toUpperCase() + k.slice(1));
        if (el) el.textContent = f[k] || 'N/A';
    });

    for (let i = 1; i <= 4; i++) {
        const img = document.getElementById('modalImg' + i);
        const box = document.getElementById('modalBox' + i);
        const span = box ? box.querySelector('span') : null;
        const url = f['foto' + i + '_url'];
        if (url && img && span) { img.src = url; img.style.display = 'block'; span.style.display = 'none'; }
        else if (span && img) { img.style.display = 'none'; span.style.display = 'block'; }
    }

    document.getElementById('fichaModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    document.getElementById('fichaModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function imprimirFicha() { window.print(); }

function limpiarBusqueda() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filtroTipo').value = 'todos';
    fichasEncontradas = [];
    fichasFiltradas = [];
    paginaActual = 1;
    renderizarTabla();
    actualizarPaginacion();
    document.getElementById('searchAlert').style.display = 'none';
}

async function cargarUsuario() {
    try {
        const { data } = await supabaseClient.auth.getSession();
        document.getElementById('userEmail').textContent = data?.session?.user?.email || 'Invitado';
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', function() {
    if (!inicializarSupabase()) return;

    document.getElementById('searchInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') buscarVehiculo(); });
    document.getElementById('logoutBtn')?.addEventListener('click', () => confirm('¿Cerrar sesión?') && window.location.replace('../index.html'));
    
    window.onclick = function(e) { if (e.target.id === 'fichaModal') cerrarModal(); };
    
    renderizarTabla();
    actualizarPaginacion();
    cargarUsuario();
});
