/* ============================================ */
/* ACTA-HISTORIAL.JS                            */
/* Sistema de Gestión de Transporte - CCPE ZULIA */
/* HISTORIAL DE ASIGNACIONES                    */
/* PAGINACIÓN: 10 POR PÁGINA                    */
/* GRÁFICO: REASIGNACIONES POR AÑO              */
/* ============================================ */

// ============================================
// ✅ VARIABLES GLOBALES
// ============================================
let supabaseClient = null;
let historialComplet = [];
let paginaActual = 1;
const itemsPorPagina = 10;
let chartInstance = null;

// ============================================
// ✅ INICIALIZAR AL CARGAR LA PÁGINA
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOMContentLoaded - Iniciando acta-historial.js');
    
    if (typeof window.supabase !== 'undefined' && window.SUPABASE_URL && window.SUPABASE_KEY) {
        supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        console.log('✅ Supabase inicializado correctamente');
    } else {
        console.error('❌ Error: Credenciales de Supabase no encontradas. Verifica config.js');
    }
    
    cargarEmailUsuario();
    cargarHistorial();
});

// ============================================
// ✅ CARGAR EMAIL DEL USUARIO
// ============================================
function cargarEmailUsuario() {
    const userEmailElement = document.getElementById('userEmail');
    if (!userEmailElement) return;
    
    const usuarioGuardado = sessionStorage.getItem('usuario');
    if (usuarioGuardado) {
        try {
            const usuario = JSON.parse(usuarioGuardado);
            userEmailElement.textContent = usuario.email || usuario.correo || 'usuario@institucion.com';
            console.log('✅ Usuario cargado desde sessionStorage:', usuario.email);
            return;
        } catch (error) {
            console.error('Error al parsear usuario:', error);
        }
    }
    
    if (supabaseClient) {
        supabaseClient.auth.getSession().then(function(response) {
            const session = response.data.session;
            if (session && session.user) {
                userEmailElement.textContent = session.user.email || 'usuario@institucion.com';
                sessionStorage.setItem('usuario', JSON.stringify({
                    email: session.user.email,
                    id: session.user.id
                }));
            } else {
                userEmailElement.textContent = 'usuario@institucion.com';
            }
        }).catch(function(error) {
            console.error('Error al obtener sesión:', error);
            userEmailElement.textContent = 'usuario@institucion.com';
        });
    } else {
        userEmailElement.textContent = 'usuario@institucion.com';
    }
}

// ============================================
// ✅ CONTAR VEHÍCULOS
// ============================================
function contarVehiculos(vehiculos) {
    try {
        if (Array.isArray(vehiculos)) return vehiculos.length;
        if (typeof vehiculos === 'string' && vehiculos.trim()) {
            return JSON.parse(vehiculos).length;
        }
        return 0;
    } catch (e) {
        return 0;
    }
}

// ============================================
// ✅ CARGAR HISTORIAL COMPLETO
// ============================================
async function cargarHistorial() {
    const historyAlert = document.getElementById('historyAlert');
    mostrarAlerta('🔄 cargando historial de asignaciones...', 'info', historyAlert);
    
    if (!supabaseClient) {
        mostrarAlerta('❌ error de conexión con la base de datos', 'error', historyAlert);
        return;
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('historial_de_actas')
            .select('*')
            .order('fecha_reasignacion', { ascending: false });
        
        if (error) throw error;
        
        historialComplet = data || [];
        console.log('📊 Total de registros en historial:', historialComplet.length);
        
        paginaActual = 1;
        renderizarTablaHistorial();
        generarGraficoPorAño();
        
        if (historialComplet.length === 0) {
            mostrarAlerta('ℹ️ no hay registros en el historial', 'info', historyAlert);
        } else {
            mostrarAlerta(`✅ ${historialComplet.length} registro(s) en el historial`, 'success', historyAlert);
        }
        
    } catch (error) {
        console.error('❌ Error al cargar historial:', error);
        mostrarAlerta('❌ error al cargar el historial: ' + error.message, 'error', historyAlert);
    }
}

// ============================================
// ✅ RENDERIZAR TABLA DE HISTORIAL (10 POR PÁGINA)
// ============================================
function renderizarTablaHistorial() {
    const tbody = document.getElementById('historyListBody');
    const count = document.getElementById('historyCount');
    const paginationControls = document.getElementById('paginationControls');
    
    if (!tbody || !count) return;
    
    count.textContent = historialComplet.length;
    
    if (historialComplet.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No hay registros en el historial</td></tr>';
        paginationControls.style.display = 'none';
        return;
    }
    
    // ✅ Paginación de 10 en 10
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    const registrosPagina = historialComplet.slice(inicio, fin);
    
    tbody.innerHTML = registrosPagina.map(registro => {
        const fecha = registro.fecha_reasignacion ? new Date(registro.fecha_reasignacion).toLocaleDateString('es-VE') : 'N/A';
        const vehiculosCount = contarVehiculos(registro.vehiculos);
        
        return `
            <tr>
                <td>${fecha}</td>
                <td>${registro.acta_id || 'N/A'}</td>
                <td>${registro.funcionario_nombre || '---'}</td>
                <td>${registro.funcionario_cedula || '---'}</td>
                <td>${registro.unidad_asignacion || '---'}</td>
                <td style="text-align: center;">${vehiculosCount}</td>
                <td>${registro.usuario_reasigno || 'N/A'}</td>
            </tr>
        `;
    }).join('');
    
    renderizarPaginacion();
}

// ============================================
// ✅ RENDERIZAR PAGINACIÓN
// ============================================
function renderizarPaginacion() {
    const paginationControls = document.getElementById('paginationControls');
    const paginationNumbers = document.getElementById('paginationNumbers');
    const btnAnterior = document.getElementById('btnAnterior');
    const btnSiguiente = document.getElementById('btnSiguiente');
    const spanPaginaActual = document.getElementById('paginaActual');
    const spanTotalPaginas = document.getElementById('totalPaginas');
    
    if (!paginationControls || !paginationNumbers) return;
    
    const totalPaginas = Math.ceil(historialComplet.length / itemsPorPagina);
    
    if (totalPaginas <= 1) {
        paginationControls.style.display = 'none';
        return;
    }
    
    paginationControls.style.display = 'flex';
    if (spanPaginaActual) spanPaginaActual.textContent = paginaActual;
    if (spanTotalPaginas) spanTotalPaginas.textContent = totalPaginas;
    if (btnAnterior) btnAnterior.disabled = paginaActual === 1;
    if (btnSiguiente) btnSiguiente.disabled = paginaActual === totalPaginas;
    
    let numerosHTML = '';
    const maxBotones = 5;
    let inicio = Math.max(1, paginaActual - Math.floor(maxBotones / 2));
    let fin = Math.min(totalPaginas, inicio + maxBotones - 1);
    
    if (fin - inicio < maxBotones - 1) {
        inicio = Math.max(1, fin - maxBotones + 1);
    }
    
    if (inicio > 1) {
        numerosHTML += `<button class="btn-page-number" onclick="irAPagina(1)">1</button>`;
        if (inicio > 2) {
            numerosHTML += `<span style="padding: 0 5px;">...</span>`;
        }
    }
    
    for (let i = inicio; i <= fin; i++) {
        if (i === paginaActual) {
            numerosHTML += `<button class="btn-page-number active">${i}</button>`;
        } else {
            numerosHTML += `<button class="btn-page-number" onclick="irAPagina(${i})">${i}</button>`;
        }
    }
    
    if (fin < totalPaginas) {
        if (fin < totalPaginas - 1) {
            numerosHTML += `<span style="padding: 0 5px;">...</span>`;
        }
        numerosHTML += `<button class="btn-page-number" onclick="irAPagina(${totalPaginas})">${totalPaginas}</button>`;
    }
    
    paginationNumbers.innerHTML = numerosHTML;
}

// ============================================
// ✅ CAMBIAR PÁGINA
// ============================================
function cambiarPagina(direccion) {
    const totalPaginas = Math.ceil(historialComplet.length / itemsPorPagina);
    const nuevaPagina = paginaActual + direccion;
    
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
        paginaActual = nuevaPagina;
        renderizarTablaHistorial();
        
        document.querySelector('.history-section')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }
}

// ============================================
// ✅ IR A PÁGINA ESPECÍFICA
// ============================================
function irAPagina(numeroPagina) {
    const totalPaginas = Math.ceil(historialComplet.length / itemsPorPagina);
    
    if (numeroPagina >= 1 && numeroPagina <= totalPaginas) {
        paginaActual = numeroPagina;
        renderizarTablaHistorial();
        
        document.querySelector('.history-section')?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest' 
        });
    }
}

// ============================================
// ✅ GENERAR GRÁFICO POR AÑO
// ============================================
function generarGraficoPorAño() {
    const ctx = document.getElementById('reasignacionesChart');
    if (!ctx) return;
    
    // ✅ Contar reasignaciones por año
    const reasignacionesPorAño = {};
    
    historialComplet.forEach(registro => {
        if (registro.fecha_reasignacion) {
            const año = new Date(registro.fecha_reasignacion).getFullYear();
            reasignacionesPorAño[año] = (reasignacionesPorAño[año] || 0) + 1;
        }
    });
    
    // ✅ Ordenar años
    const años = Object.keys(reasignacionesPorAño).sort();
    const cantidades = años.map(año => reasignacionesPorAño[año]);
    
    // ✅ Destruir gráfico anterior si existe
    if (chartInstance) {
        chartInstance.destroy();
    }
    
    // ✅ Crear nuevo gráfico
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: años,
            datasets: [{
                label: 'Actas Reasignadas',
                data: cantidades,
                backgroundColor: 'rgba(231, 111, 81, 0.7)',
                borderColor: 'rgba(231, 111, 81, 1)',
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: 'rgba(231, 111, 81, 0.9)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            family: 'Roboto'
                        },
                        color: '#003366'
                    }
                },
                title: {
                    display: true,
                    text: 'Total de Actas Reasignadas por Año',
                    font: {
                        size: 16,
                        family: 'Roboto',
                        weight: 'bold'
                    },
                    color: '#003366',
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 51, 102, 0.9)',
                    titleFont: {
                        size: 14,
                        family: 'Roboto'
                    },
                    bodyFont: {
                        size: 13,
                        family: 'Roboto'
                    },
                    padding: 12,
                    cornerRadius: 6,
                    callbacks: {
                        label: function(context) {
                            return `Actas: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 12,
                            family: 'Roboto'
                        },
                        color: '#666'
                    },
                    grid: {
                        color: 'rgba(0, 51, 102, 0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Cantidad de Actas',
                        font: {
                            size: 13,
                            family: 'Roboto',
                            weight: 'bold'
                        },
                        color: '#003366'
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12,
                            family: 'Roboto'
                        },
                        color: '#666'
                    },
                    grid: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Año',
                        font: {
                            size: 13,
                            family: 'Roboto',
                            weight: 'bold'
                        },
                        color: '#003366'
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
    
    console.log('📊 Gráfico generado:', { años, cantidades });
}

// ============================================
// ✅ MOSTRAR ALERTAS
// ============================================
function mostrarAlerta(mensaje, tipo, elemento = null) {
    const alertElement = elemento || document.getElementById('historyAlert');
    if (!alertElement) {
        console.error('❌ elemento de alerta no encontrado');
        return;
    }
    
    alertElement.textContent = mensaje;
    alertElement.className = `alert alert-${tipo}`;
    alertElement.style.display = 'block';
    
    setTimeout(() => {
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    
    if (tipo !== 'error') {
        setTimeout(() => { alertElement.style.display = 'none'; }, 5000);
    }
}

// ============================================
// ✅ EXPORTAR FUNCIONES GLOBALES
// ============================================
window.cargarHistorial = cargarHistorial;
window.cambiarPagina = cambiarPagina;
window.irAPagina = irAPagina;
window.cargarEmailUsuario = cargarEmailUsuario;
window.mostrarAlerta = mostrarAlerta;
window.contarVehiculos = contarVehiculos;

console.log('✅ Funciones exportadas a window');
console.log('📊 Paginación configurada:', itemsPorPagina, 'registros por página');
