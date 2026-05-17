// planilla.partes.js - Dashboard de estadísticas para Partes Generales
document.addEventListener('DOMContentLoaded', () => {
  // 🔧 CONFIGURACIÓN SUPABASE
  const SUPABASE_URL = window.SUPABASE_URL || 'https://TU_PROYECTO.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'TU_CLAVE_ANONIMA';
  const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 📦 REFERENCIAS DOM
  const fechaReporte = document.getElementById('fechaReporte');
  
  // 🚀 INICIALIZACIÓN
  if (supabase) {
    cargarYProcesarDatos();
  } else {
    console.warn('⚠️ Supabase no está disponible. Usando datos de ejemplo...');
    generarDatosEjemplo();
  }

  // 📥 CARGAR Y PROCESAR DATOS
  async function cargarYProcesarDatos() {
    try {
      const { data: vehiculos, error } = await supabase
        .from('vehiculos')
        .select('*');
      
      if (error) throw error;
      procesarDatos(vehiculos);
    } catch (err) {
      console.error('❌ Error cargando datos:', err);
      generarDatosEjemplo();
    }
  }

  // 🔄 PROCESAR DATOS Y GENERAR ESTADÍSTICAS
  function procesarDatos(vehiculos) {
    // Agrupar tipos: automovil/camioneta/autobus/camion → "Vehículo Terrestre"
    const tiposAgrupados = {
      'Vehículo Terrestre': ['automovil', 'camioneta', 'autobus', 'camion', 'pick-up', 'pickup', 'bus'],
      'Motocicleta': ['moto', 'enduro', 'trimovil', 'traccion de sangre'],
      'Especial': ['especial', 'embarcacion', 'barco']
    };

    // Contadores
    const stats = {
      total: vehiculos.length,
      operativos: 0,
      inoperativos: 0,
      mantenimiento: 0,
      porTipo: {},
      porEstatus: {},
      porAno: {},
      porUnidad: {}
    };

    vehiculos.forEach(v => {
      // Estatus
      const estatus = (v.estatus || '').toLowerCase().trim();
      if (estatus.includes('operativa') && !estatus.includes('inoperativa')) {
        stats.operativos++;
        stats.porEstatus['Operativo'] = (stats.porEstatus['Operativo'] || 0) + 1;
      } else if (estatus.includes('inoperativa') || estatus.includes('reparacion') || estatus.includes('taller')) {
        stats.inoperativos++;
        stats.porEstatus['Inoperativo/Mantenimiento'] = (stats.porEstatus['Inoperativo/Mantenimiento'] || 0) + 1;
      } else {
        stats.mantenimiento++;
        stats.porEstatus['Otros'] = (stats.porEstatus['Otros'] || 0) + 1;
      }

      // Tipo agrupado
      const clase = (v.clase || v.tipo || '').toLowerCase().trim();
      let tipoAgrupado = 'Otros';
      for (const [grupo, valores] of Object.entries(tiposAgrupados)) {
        if (valores.some(val => clase.includes(val))) {
          tipoAgrupado = grupo;
          break;
        }
      }
      stats.porTipo[tipoAgrupado] = (stats.porTipo[tipoAgrupado] || 0) + 1;

      // Año
      const ano = v.ano || 'N/D';
      stats.porAno[ano] = (stats.porAno[ano] || 0) + 1;

      // Unidad administrativa
      const unidad = (v.unidad_administrativa || 'Sin asignar').trim();
      if (!stats.porUnidad[unidad]) {
        stats.porUnidad[unidad] = { total: 0, terrestres: 0, motos: 0, otros: 0, operativos: 0 };
      }
      stats.porUnidad[unidad].total++;
      if (tipoAgrupado === 'Vehículo Terrestre') stats.porUnidad[unidad].terrestres++;
      else if (tipoAgrupado === 'Motocicleta') stats.porUnidad[unidad].motos++;
      else stats.porUnidad[unidad].otros++;
      if (estatus.includes('operativa') && !estatus.includes('inoperativa')) {
        stats.porUnidad[unidad].operativos++;
      }
    });

    // 📊 ACTUALIZAR UI
    actualizarEstadisticas(stats);
    generarGraficos(stats);
    generarTablaResumen(stats.porUnidad);
    
    // Fecha del reporte
    fechaReporte.textContent = new Date().toLocaleString('es-ES');
  }

  // 📈 ACTUALIZAR TARJETAS DE ESTADÍSTICAS
  function actualizarEstadisticas(stats) {
    document.getElementById('totalVehiculos').textContent = stats.total;
    document.getElementById('totalOperativos').textContent = stats.operativos;
    document.getElementById('totalInoperativos').textContent = stats.inoperativos;
    document.getElementById('totalMantenimiento').textContent = stats.mantenimiento;
  }

  // 📊 GENERAR GRÁFICOS CON CHART.JS
  function generarGraficos(stats) {
    Chart.defaults.font.family = 'Roboto';
    Chart.defaults.color = '#64748b';

    // Gráfico de Tipos (Doughnut)
    new Chart(document.getElementById('chartTipos'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(stats.porTipo),
        datasets: [{
          data: Object.values(stats.porTipo),
          backgroundColor: ['#264653', '#2a9d8f', '#e9c46a', '#e76f51', '#f4a261']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // Gráfico de Estatus (Bar)
    new Chart(document.getElementById('chartEstatus'), {
      type: 'bar',
      data: {
        labels: Object.keys(stats.porEstatus),
        datasets: [{
          label: 'Cantidad',
          data: Object.values(stats.porEstatus),
          backgroundColor: ['#2a9d8f', '#e76f51', '#e9c46a']
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Gráfico por Año (Line)
    const anosOrdenados = Object.keys(stats.porAno).filter(a => a !== 'N/D').sort();
    new Chart(document.getElementById('chartAnos'), {
      type: 'line',
      data: {
        labels: anosOrdenados,
        datasets: [{
          label: 'Vehículos',
          data: anosOrdenados.map(a => stats.porAno[a]),
          borderColor: '#005b96',
          backgroundColor: 'rgba(0, 91, 150, 0.1)',
          fill: true,
          tension: 0.3
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // Top 10 Unidades (Horizontal Bar)
    const unidadesTop = Object.entries(stats.porUnidad)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);
    new Chart(document.getElementById('chartUnidades'), {
      type: 'bar',
      data: {
        labels: unidadesTop.map(u => u[0].length > 25 ? u[0].substring(0,25)+'...' : u[0]),
        datasets: [{
          label: 'Vehículos',
          data: unidadesTop.map(u => u[1].total),
          backgroundColor: '#005b96'
        }]
      },
      options: { 
        indexAxis: 'y',
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true } }
      }
    });
  }

  // 📋 GENERAR TABLA RESUMEN
  function generarTablaResumen(porUnidad) {
    const tbody = document.getElementById('tablaResumenBody');
    const filas = Object.entries(porUnidad)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15)
      .map(([unidad, datos]) => {
        const porcentaje = datos.total > 0 ? Math.round((datos.operativos / datos.total) * 100) : 0;
        const badgeClass = porcentaje >= 80 ? 'operativo' : porcentaje >= 50 ? 'mantenimiento' : 'inoperativo';
        return `
          <tr>
            <td><strong>${unidad}</strong></td>
            <td>${datos.terrestres}</td>
            <td>${datos.motos}</td>
            <td>${datos.otros}</td>
            <td><span class="badge badge-${badgeClass}">${datos.operativos}</span></td>
            <td><strong>${porcentaje}%</strong></td>
          </tr>
        `;
      }).join('');
    
    tbody.innerHTML = filas || '<tr><td colspan="6" style="text-align:center;">Sin datos</td></tr>';
  }

  // 🧪 DATOS DE EJEMPLO (fallback)
  function generarDatosEjemplo() {
    const vehiculosEjemplo = Array.from({length: 100}, (_, i) => ({
      estatus: ['OPERATIVA', 'INOPERATIVA', 'REPARACION'][Math.floor(Math.random()*3)],
      clase: ['CAMIONETA', 'MOTO', 'AUTOMOVIL', 'CAMION', 'ENDURO'][Math.floor(Math.random()*5)],
      ano: [2012, 2015, 2018, 2022, 2023][Math.floor(Math.random()*5)],
      unidad_administrativa: ['ESTACION PARROQUIAL A', 'BRIGADA MOTORIZADA', 'DIP', 'CCPEM'][Math.floor(Math.random()*4)]
    }));
    procesarDatos(vehiculosEjemplo);
  }

  // 🖨️ FUNCIONES DE EXPORTACIÓN
  window.imprimirReporte = () => window.print();
  
  window.exportarPDF = async () => {
    const { jsPDF } = window.jspdf;
    const element = document.getElementById('reportContent');
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`reporte-partes-${new Date().toISOString().slice(0,10)}.pdf`);
  };
});
