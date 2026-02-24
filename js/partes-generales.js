/**
* PARTES GENERALES - REPORTES Y ESTADÍSTICAS
* Muestra gráficos y estadísticas del parque automotor
*/

// Variables globales para los gráficos
let chartEstatus, chartTipos, chartUnidades, chartAnos;

// ================= CLIENTE SUPABASE =================
// ✅ USAR window.supabaseClient (creado en config.js)
const db = window.supabaseClient;

// ================= ELEMENTOS DEL DOM =================
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

// ================= VERIFICAR SESIÓN (OPCIONAL) =================
async function verificarSesion() {
  try {
    // ✅ Verificar si el cliente está disponible
    if (!db) {
      console.warn('⚠️ Cliente Supabase no disponible, continuando sin autenticación');
      if (userEmail) userEmail.textContent = 'usuario@institucion.com';
      return true; // Continuar sin sesión
    }
    
    const { data: { session }, error } = await db.auth.getSession();
    
    if (error) {
      console.warn('⚠️ Error en sesión:', error.message);
      if (userEmail) userEmail.textContent = 'usuario@institucion.com';
      return true; // Continuar sin sesión
    }
    
    if (session && session.user && session.user.email) {
      if (userEmail) userEmail.textContent = session.user.email.split('@')[0];
    } else {
      if (userEmail) userEmail.textContent = 'usuario@institucion.com';
    }
    
    return true;
  } catch (err) {
    console.warn('⚠️ Error verificando sesión:', err.message);
    if (userEmail) userEmail.textContent = 'usuario@institucion.com';
    return true; // ✅ NO REDIRIGIR, continuar sin sesión
  }
}

// ================= CERRAR SESIÓN =================
async function cerrarSesion() {
  if (confirm('¿Está seguro de cerrar sesión?')) {
    try {
      if (db) {
        await db.auth.signOut();
      }
      window.location.href = '../index.html';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      window.location.href = '../index.html';
    }
  }
}

// ================= CARGAR DATOS =================
async function cargarDatos() {
  try {
    // ✅ Verificar si el cliente está disponible
    if (!db) {
      console.error('❌ Cliente Supabase no disponible');
      alert('Error: No se pudo conectar a la base de datos. Verifica config.js');
      return;
    }
    
    console.log('🔗 Conectando a Supabase...');
    
    // Obtener todos los vehículos
    const { data: vehiculos, error } = await db
      .from('vehiculos')
      .select('*');
    
    if (error) {
      console.error('❌ Error al cargar vehículos:', error);
      alert('Error al cargar los datos: ' + error.message);
      return;
    }
    
    console.log('✅ Vehículos cargados:', vehiculos.length);
    
    // Calcular estadísticas
    calcularEstadisticas(vehiculos);
    
    // Generar gráficos
    generarGraficos(vehiculos);
    
    // Generar tabla de resumen
    generarTablaResumen(vehiculos);
    
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
  const elOperativos = document.getElementById('totalOperativos');
  const elInoperativos = document.getElementById('totalInoperativos');
  const elMantenimiento = document.getElementById('totalMantenimiento');
  const elAsignados = document.getElementById('totalAsignados');
  
  if (elOperativos) elOperativos.textContent = operativos;
  if (elInoperativos) elInoperativos.textContent = inoperativos;
  if (elMantenimiento) elMantenimiento.textContent = mantenimiento;
  if (elAsignados) elAsignados.textContent = asignados;
  
  // Calcular porcentajes
  const pctOperativos = total > 0 ? ((operativos / total) * 100).toFixed(1) : 0;
  const pctInoperativos = total > 0 ? ((inoperativos / total) * 100).toFixed(1) : 0;
  const pctMantenimiento = total > 0 ? ((mantenimiento / total) * 100).toFixed(1) : 0;
  const pctAsignados = total > 0 ? ((asignados / total) * 100).toFixed(1) : 0;
  
  const elPctOperativos = document.getElementById('porcentajeOperativos');
  const elPctInoperativos = document.getElementById('porcentajeInoperativos');
  const elPctMantenimiento = document.getElementById('porcentajeMantenimiento');
  const elPctAsignados = document.getElementById('porcentajeAsignados');
  
  if (elPctOperativos) elPctOperativos.textContent = `${pctOperativos}% del total`;
  if (elPctInoperativos) elPctInoperativos.textContent = `${pctInoperativos}% del total`;
  if (elPctMantenimiento) elPctMantenimiento.textContent = `${pctMantenimiento}% del total`;
  if (elPctAsignados) elPctAsignados.textContent = `${pctAsignados}% del total`;
  
  // Actualizar total general
  const totalElement = document.getElementById('totalVehiculos');
  if (totalElement) {
    totalElement.textContent = total;
  }
}

// ================= GENERAR GRÁFICOS =================
function generarGraficos(vehiculos) {
  // Destruir gráficos existentes si los hay
  if (chartEstatus) chartEstatus.destroy();
  if (chartTipos) chartTipos.destroy();
  if (chartUnidades) chartUnidades.destroy();
  if (chartAnos) chartAnos.destroy();
  
  // ============================================
  // GRÁFICO DE ESTATUS (Solo valores válidos)
  // ============================================
  const estatusValidos = ['OPERATIVA', 'INOPERATIVA', 'REPARACION', 'TALLER', 'DESINCORPORADA', 'DONACION', 'COMODATO', 'DENUNCIADA'];
  const estatusData = {};
  
  vehiculos.forEach(v => {
    const estatus = v.estatus?.trim().toUpperCase();
    // ✅ Solo incluir estatus válidos, excluir vacíos/null
    if (estatus && estatusValidos.includes(estatus)) {
      estatusData[estatus] = (estatusData[estatus] || 0) + 1;
    }
  });
  
  const chartEstatusEl = document.getElementById('chartEstatus');
  if (chartEstatusEl && Object.keys(estatusData).length > 0) {
    chartEstatus = new Chart(chartEstatusEl, {
      type: 'doughnut',
      data: {
        labels: Object.keys(estatusData),
        datasets: [{
          data: Object.values(estatusData),
          backgroundColor: [
            '#059669', // OPERATIVA - Verde
            '#dc2626', // INOPERATIVA - Rojo
            '#f59e0b', // REPARACION - Amarillo
            '#d97706', // TALLER - Naranja
            '#6b7280', // DESINCORPORADA - Gris
            '#3b82f6', // DONACION - Azul
            '#10b981', // COMODATO - Verde claro
            '#ef4444'  // DENUNCIADA - Rojo claro
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: {
                family: 'Roboto',
                size: 11
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} vehículos (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  // ============================================
  // GRÁFICO POR TIPO
  // ============================================
  const tiposData = {};
  vehiculos.forEach(v => {
    const tipo = v.tipo?.trim() || 'SIN TIPO';
    // ✅ Excluir tipos vacíos
    if (tipo && tipo !== 'SIN TIPO') {
      tiposData[tipo] = (tiposData[tipo] || 0) + 1;
    }
  });
  
  const chartTiposEl = document.getElementById('chartTipos');
  if (chartTiposEl && Object.keys(tiposData).length > 0) {
    chartTipos = new Chart(chartTiposEl, {
      type: 'bar',
      data: {
        labels: Object.keys(tiposData),
        datasets: [{
          label: 'Cantidad',
          data: Object.values(tiposData),
          backgroundColor: '#005b96'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                family: 'Roboto'
              }
            }
          },
          x: {
            ticks: {
              font: {
                family: 'Roboto',
                size: 10
              }
            }
          }
        }
      }
    });
  }
  
  // ============================================
  // GRÁFICO POR UNIDAD ADMINISTRATIVA (TOP 15)
  // ============================================
  const unidadesData = {};
  vehiculos.forEach(v => {
    const unidad = v.unidad_administrativa?.trim();
    // ✅ Solo incluir unidades válidas, excluir vacíos, null, 'NO'
    if (unidad && unidad !== '' && unidad !== 'NO' && unidad !== 'null') {
      unidadesData[unidad] = (unidadesData[unidad] || 0) + 1;
    }
  });
  
  // ✅ Ordenar y tomar TOP 15
  const sortedUnidades = Object.entries(unidadesData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  
  console.log('📊 Top 15 Unidades:', sortedUnidades);
  
  const chartUnidadesEl = document.getElementById('chartUnidades');
  if (chartUnidadesEl && sortedUnidades.length > 0) {
    chartUnidades = new Chart(chartUnidadesEl, {
      type: 'pie',
      data: {
        labels: sortedUnidades.map(u => u[0].length > 25 ? u[0].substring(0, 25) + '...' : u[0]),
        datasets: [{
          data: sortedUnidades.map(u => u[1]),
          backgroundColor: [
            '#003366', '#005b96', '#2a9d8f', '#e9c46a',
            '#e76f51', '#9b5de5', '#f15bb5', '#00bbf4',
            '#00f5d4', '#fee440', '#ff6b6b', '#4ecdc4',
            '#45b7d1', '#96ceb4', '#ffeaa7'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: {
                family: 'Roboto',
                size: 10
              },
              boxWidth: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} vehículos (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }
  
  // ============================================
  // GRÁFICO POR AÑO
  // ============================================
  const anosData = {};
  vehiculos.forEach(v => {
    const ano = v.ano?.toString()?.trim();
    // ✅ Solo incluir años válidos (números entre 1900 y 2030)
    if (ano && !isNaN(ano) && parseInt(ano) >= 1900 && parseInt(ano) <= 2030) {
      anosData[ano] = (anosData[ano] || 0) + 1;
    }
  });
  
  const sortedAnos = Object.entries(anosData)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
    .slice(0, 15);
  
  const chartAnosEl = document.getElementById('chartAnos');
  if (chartAnosEl && sortedAnos.length > 0) {
    chartAnos = new Chart(chartAnosEl, {
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
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              font: {
                family: 'Roboto'
              }
            }
          },
          x: {
            ticks: {
              font: {
                family: 'Roboto',
                size: 10
              }
            }
          }
        }
      }
    });
  }
}

// ================= GENERAR TABLA DE RESUMEN =================
function generarTablaResumen(vehiculos) {
  const unidadesData = {};
  
  vehiculos.forEach(v => {
    const unidad = v.unidad_administrativa?.trim() || 'SIN ASIGNAR';
    if (!unidadesData[unidad]) {
      unidadesData[unidad] = {
        total: 0,
        operativos: 0,
        inoperativos: 0,
        mantenimiento: 0
      };
    }
    unidadesData[unidad].total++;
    if (v.estatus === 'OPERATIVA') {
      unidadesData[unidad].operativos++;
    } else if (v.estatus === 'INOPERATIVA') {
      unidadesData[unidad].inoperativos++;
    }
    if (v.situacion === 'REPARACION' || v.situacion === 'TALLER') {
      unidadesData[unidad].mantenimiento++;
    }
  });
  
  const tbody = document.getElementById('tbodyResumen');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  Object.entries(unidadesData)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([unidad, datos]) => {
      const porcentaje = datos.total > 0
        ? ((datos.operativos / datos.total) * 100).toFixed(1)
        : 0;
      
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
    console.error('Error al generar PDF:', error);
    alert('Error al generar el PDF. Intente nuevamente.');
    const btnPdf = document.querySelector('.btn-pdf');
    btnPdf.innerHTML = '📄 Exportar a PDF';
    btnPdf.disabled = false;
  }
}

// ================= INICIALIZAR =================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Inicializando Partes Generales...');
  
  // ✅ Verificar que el cliente Supabase esté disponible
  if (!window.supabaseClient) {
    console.error('❌ Cliente Supabase no inicializado. Verifica config.js');
  }
  
  // Verificar sesión (sin redirección)
  await verificarSesion();
  
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
