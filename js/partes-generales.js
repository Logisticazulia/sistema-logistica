/**
* PARTES GENERALES - REPORTES Y ESTADÍSTICAS
* Muestra gráficos y estadísticas del parque automotor
*/

// ================= CONFIGURACIÓN DE SUPABASE =================
// ✅ Crear cliente de Supabase explícitamente
const SUPABASE_URL = window.SUPABASE_CONFIG?.url || 'https://tu-proyecto.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_CONFIG?.anonKey || 'tu-anon-key-aqui';

// ✅ Inicializar cliente solo si no existe globalmente
const supabase = window.supabase 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Validar que Supabase esté disponible
if (!supabase) {
  console.error('❌ Error: Cliente de Supabase no disponible. Verifica config.js');
  // Opcional: redirigir o mostrar mensaje al usuario
}

// Variables globales para los gráficos
let chartEstatus, chartTipos, chartUnidades, chartAnos;

// ================= ELEMENTOS DEL DOM =================
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// ================= VERIFICAR SESIÓN =================
async function verificarSesion() {
  try {
    if (!supabase) throw new Error('Supabase no inicializado');
    
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      console.warn('⚠️ Sesión no válida, redirigiendo...');
      window.location.href = '../index.html';
      return false;
    }
    
    userEmail.textContent = session.user.email?.split('@')[0] || 'usuario';
    return true;
  } catch (err) {
    console.error('❌ Error verificando sesión:', err);
    window.location.href = '../index.html';
    return false;
  }
}

// ================= CERRAR SESIÓN =================
async function cerrarSesion() {
  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
    window.location.href = '../index.html';
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error);
    window.location.href = '../index.html';
  }
}

// ================= CARGAR DATOS =================
async function cargarDatos() {
  try {
    if (!supabase) throw new Error('Supabase no está inicializado');
    
    // Obtener todos los vehículos
    const { data: vehiculos, error } = await supabase
      .from('vehiculos')
      .select('*');
    
    if (error) throw error;
    
    console.log('✅ Vehículos cargados:', vehiculos?.length || 0);
    
    // Calcular estadísticas
    calcularEstadisticas(vehiculos || []);
    
    // Generar gráficos
    generarGraficos(vehiculos || []);
    
    // Generar tabla de resumen
    generarTablaResumen(vehiculos || []);
    
  } catch (error) {
    console.error('❌ Error al cargar datos:', error);
    alert('Error al cargar los datos del reporte: ' + error.message);
  }
}

// ================= CALCULAR ESTADÍSTICAS =================
function calcularEstadisticas(vehiculos) {
  const total = vehiculos.length;
  
  const operativos = vehiculos.filter(v => v.estatus === 'OPERATIVA').length;
  const inoperativos = vehiculos.filter(v => v.estatus === 'INOPERATIVA').length;
  const mantenimiento = vehiculos.filter(v =>
    v.situacion === 'REPARACION' || v.situacion === 'TALLER'
  ).length;
  const asignados = vehiculos.filter(v => 
    v.unidad_administrativa && 
    v.unidad_administrativa !== 'NO' && 
    v.unidad_administrativa.trim() !== ''
  ).length;

  // Actualizar tarjetas
  const setIfExists = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setIfExists('totalOperativos', operativos);
  setIfExists('totalInoperativos', inoperativos);
  setIfExists('totalMantenimiento', mantenimiento);
  setIfExists('totalAsignados', asignados);

  // Calcular porcentajes
  const pct = (num, total) => total > 0 ? ((num / total) * 100).toFixed(1) : 0;
  
  setIfExists('porcentajeOperativos', `${pct(operativos, total)}% del total`);
  setIfExists('porcentajeInoperativos', `${pct(inoperativos, total)}% del total`);
  setIfExists('porcentajeMantenimiento', `${pct(mantenimiento, total)}% del total`);
  setIfExists('porcentajeAsignados', `${pct(asignados, total)}% del total`);
  setIfExists('totalVehiculos', total);
}

// ================= GENERAR GRÁFICOS =================
function generarGraficos(vehiculos) {
  // Destruir gráficos existentes si los hay
  [chartEstatus, chartTipos, chartUnidades, chartAnos].forEach(chart => {
    if (chart) chart.destroy();
  });

  // ============================================
  // GRÁFICO DE ESTATUS (Solo valores válidos)
  // ============================================
  const estatusValidos = ['OPERATIVA', 'INOPERATIVA', 'REPARACION', 'TALLER', 'DESINCORPORADA', 'DONACION', 'COMODATO', 'DENUNCIADA'];
  const estatusData = {};
  
  vehiculos.forEach(v => {
    const estatus = v.estatus?.trim().toUpperCase();
    if (estatus && estatusValidos.includes(estatus)) {
      estatusData[estatus] = (estatusData[estatus] || 0) + 1;
    }
  });

  chartEstatus = new Chart(document.getElementById('chartEstatus'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(estatusData),
      datasets: [{
        data: Object.values(estatusData),
        backgroundColor: [
          '#059669', '#dc2626', '#f59e0b', '#d97706',
          '#6b7280', '#3b82f6', '#10b981', '#ef4444'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { family: 'Roboto', size: 11 } } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${ctx.parsed} vehículos (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // ============================================
  // GRÁFICO POR TIPO
  // ============================================
  const tiposData = {};
  vehiculos.forEach(v => {
    const tipo = v.tipo?.trim() || 'SIN TIPO';
    if (tipo && tipo !== 'SIN TIPO') {
      tiposData[tipo] = (tiposData[tipo] || 0) + 1;
    }
  });

  chartTipos = new Chart(document.getElementById('chartTipos'), {
    type: 'bar',
    data: {
      labels: Object.keys(tiposData),
      datasets: [{ label: 'Cantidad', data: Object.values(tiposData), backgroundColor: '#005b96' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Roboto' } } },
        x: { ticks: { font: { family: 'Roboto', size: 10 } } }
      }
    }
  });

  // ============================================
  // GRÁFICO POR UNIDAD ADMINISTRATIVA (TOP 15)
  // ============================================
  const unidadesData = {};
  vehiculos.forEach(v => {
    const unidad = v.unidad_administrativa?.trim();
    if (unidad && unidad !== '' && unidad !== 'NO' && unidad !== 'null') {
      unidadesData[unidad] = (unidadesData[unidad] || 0) + 1;
    }
  });

  const sortedUnidades = Object.entries(unidadesData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  chartUnidades = new Chart(document.getElementById('chartUnidades'), {
    type: 'pie',
    data: {
      labels: sortedUnidades.map(u => u[0].length > 25 ? u[0].substring(0, 25) + '...' : u[0]),
      datasets: [{
        data: sortedUnidades.map(u => u[1]),
        backgroundColor: [
          '#003366', '#005b96', '#2a9d8f', '#e9c46a', '#e76f51',
          '#9b5de5', '#f15bb5', '#00bbf4', '#00f5d4', '#fee440',
          '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { family: 'Roboto', size: 10 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${ctx.parsed} vehículos (${pct}%)`;
            }
          }
        }
      }
    }
  });

  // ============================================
  // GRÁFICO POR AÑO
  // ============================================
  const anosData = {};
  vehiculos.forEach(v => {
    const ano = v.ano?.toString()?.trim();
    if (ano && !isNaN(ano) && parseInt(ano) >= 1900 && parseInt(ano) <= 2030) {
      anosData[ano] = (anosData[ano] || 0) + 1;
    }
  });

  const sortedAnos = Object.entries(anosData)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
    .slice(0, 15);

  chartAnos = new Chart(document.getElementById('chartAnos'), {
    type: 'line',
    data: {
      labels: sortedAnos.map(a => a[0]),
      datasets: [{
        label: 'Vehículos',
        data: sortedAnos.map(a => a[1]),
        borderColor: '#005b96',
        backgroundColor: 'rgba(0, 91, 150, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#005b96',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Roboto' } } },
        x: { ticks: { font: { family: 'Roboto', size: 10 } } }
      }
    }
  });
}

// ================= GENERAR TABLA DE RESUMEN =================
function generarTablaResumen(vehiculos) {
  const unidadesData = {};
  
  vehiculos.forEach(v => {
    const unidad = v.unidad_administrativa?.trim() || 'SIN ASIGNAR';
    if (!unidadesData[unidad]) {
      unidadesData[unidad] = { total: 0, operativos: 0, inoperativos: 0, mantenimiento: 0 };
    }
    unidadesData[unidad].total++;
    if (v.estatus === 'OPERATIVA') unidadesData[unidad].operativos++;
    else if (v.estatus === 'INOPERATIVA') unidadesData[unidad].inoperativos++;
    if (v.situacion === 'REPARACION' || v.situacion === 'TALLER') unidadesData[unidad].mantenimiento++;
  });

  const tbody = document.getElementById('tbodyResumen');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  Object.entries(unidadesData)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([unidad, datos]) => {
      const porcentaje = datos.total > 0 ? ((datos.operativos / datos.total) * 100).toFixed(1) : 0;
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${unidad}</strong></td>
        <td>${datos.total}</td>
        <td><span class="badge badge-operativa">${datos.operativos}</span></td>
        <td><span class="badge badge-inoperativa">${datos.inoperativos}</span></td>
        <td><span class="badge badge-mantenimiento">${datos.mantenimiento}</span></td>
        <td><strong>${porcentaje}%</strong></td>
      `;
      tbody.appendChild(row);
    });
}

// ================= IMPRIMIR REPORTE =================
function imprimirReporte() {
  window.print();
}

// ================= EXPORTAR A PDF =================
async function exportarPDF() {
  const { jsPDF } = window.jspdf;
  if (!jsPDF) {
    alert('Error: Librería jsPDF no cargada');
    return;
  }
  
  const pdf = new jsPDF('l', 'mm', 'a4');
  
  try {
    const element = document.getElementById('reportContent');
    const btnPdf = document.querySelector('.btn-pdf');
    const originalText = btnPdf.innerHTML;
    
    btnPdf.innerHTML = '⏳ Generando PDF...';
    btnPdf.disabled = true;

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 297;
    const pageHeight = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fecha = new Date().toISOString().split('T')[0];
    pdf.save(`partes-generales-${fecha}.pdf`);
    
    btnPdf.innerHTML = originalText;
    btnPdf.disabled = false;
    
  } catch (error) {
    console.error('❌ Error al generar PDF:', error);
    alert('Error al generar el PDF. Intente nuevamente.');
    const btnPdf = document.querySelector('.btn-pdf');
    if (btnPdf) {
      btnPdf.innerHTML = '📄 Exportar a PDF';
      btnPdf.disabled = false;
    }
  }
}

// ================= INICIALIZAR =================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando Partes Generales...');
  
  // Validar dependencias
  if (typeof Chart === 'undefined') {
    console.error('❌ Chart.js no está cargado');
    return;
  }
  
  // Verificar sesión
  const sesionValida = await verificarSesion();
  if (!sesionValida) return;
  
  // Establecer fecha del reporte
  const fechaEl = document.getElementById('fechaReporte');
  if (fechaEl) {
    fechaEl.textContent = new Date().toLocaleString('es-VE');
  }
  
  // Cargar datos
  await cargarDatos();
  
  // Event listeners
  if (logoutBtn) {
    logoutBtn.addEventListener('click', cerrarSesion);
  }
  
  console.log('✅ Partes Generales inicializado correctamente');
});
