// planilla-partes.js - Dashboard de estadísticas para Partes Generales
// ✅ Compatible con config.js: usa window.SUPABASE_KEY

document.addEventListener('DOMContentLoaded', () => {
  // 🔧 LEER CONFIGURACIÓN DESDE config.js
  // Tu config.js define: window.SUPABASE_URL y window.SUPABASE_KEY
  const supabaseUrl = window.SUPABASE_URL;
  const supabaseKey = window.SUPABASE_KEY; // ← ¡CORRECCIÓN CLAVE!
  
  let supabase = null;
  
  if (supabaseUrl && supabaseKey && window.supabase) {
    try {
      supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
      console.log('✅ Cliente Supabase inicializado con config.js');
    } catch (e) {
      console.warn('⚠️ No se pudo inicializar Supabase:', e.message);
    }
  } else {
    console.warn('⚠️ Configuración de Supabase no disponible. Usando modo demostración.');
    console.log('🔍 Debug - SUPABASE_URL:', !!supabaseUrl, 'SUPABASE_KEY:', !!supabaseKey);
  }

  // 📦 REFERENCIAS DOM
  const fechaReporte = document.getElementById('fechaReporte');
  
  // 🚀 INICIALIZACIÓN
  if (supabase) {
    cargarYProcesarDatos();
  } else {
    generarDatosEjemplo(); // Fallback inmediato
  }

  // 📥 CARGAR Y PROCESAR DATOS
  async function cargarYProcesarDatos() {
    try {
      const { data: vehiculos, error } = await supabase
        .from('vehiculos')
        .select('estatus, clase, tipo, ano, unidad_administrativa')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('⚠️ Error en consulta Supabase:', error.message);
        generarDatosEjemplo();
        return;
      }
      
      if (!vehiculos || vehiculos.length === 0) {
        console.warn('⚠️ Sin registros. Usando datos de ejemplo.');
        generarDatosEjemplo();
        return;
      }
      
      procesarDatos(vehiculos);
    } catch (err) {
      console.error('❌ Error inesperado:', err);
      generarDatosEjemplo();
    }
  }

  // 🔄 PROCESAR DATOS - Agrupación exacta como pediste
  function procesarDatos(vehiculos) {
    // 🎯 Agrupación: automovil+camioneta+autobus+camion → "Vehículos"
    const tiposAgrupados = {
      'Vehículos': ['automovil', 'camioneta', 'autobus', 'camion', 'pick-up', 'pickup', 'bus', 'machito', 'sport wagon', 'minibus'],
      'Motocicletas': ['moto', 'enduro', 'trimovil', 'traccion de sangre', 'paseo'],
      'Especiales': ['especial', 'embarcacion', 'barco']
    };

    const stats = {
      total: vehiculos.length,
      operativos: 0,
      inoperativos: 0,
      mantenimiento: 0,
      asignados: 0,
      porTipo: {},
      porEstatus: {},
      porAno: {},
      porUnidad: {}
    };

    vehiculos.forEach(v => {
      // 📊 Estatus
      const estatusRaw = (v.estatus || '').toString().toLowerCase().trim();
      let estatusNorm = 'Desconocido';
      
      if (estatusRaw.includes('operativa') && !estatusRaw.includes('inoperativa') && !estatusRaw.includes('reparacion')) {
        estatusNorm = 'Operativo';
        stats.operativos++;
      } else if (estatusRaw.includes('inoperativa') || estatusRaw.includes('reparacion') || estatusRaw.includes('taller') || estatusRaw.includes('desincorporada')) {
        estatusNorm = 'Inoperativo/Mantenimiento';
        stats.inoperativos++;
      } else {
        stats.mantenimiento++;
      }
      stats.porEstatus[estatusNorm] = (stats.porEstatus[estatusNorm] || 0) + 1;

      // 🚗 Tipo agrupado
      const claseRaw = (v.clase || v.tipo || '').toString().toLowerCase().trim();
      let tipoAgrupado = 'Otros';
      for (const [grupo, valores] of Object.entries(tiposAgrupados)) {
        if (valores.some(val => claseRaw.includes(val))) {
          tipoAgrupado = grupo;
          break;
        }
      }
      stats.porTipo[tipoAgrupado] = (stats.porTipo[tipoAgrupado] || 0) + 1;

      // 📅 Año
      const ano = v.ano && !isNaN(v.ano) ? v.ano : 'N/D';
      stats.porAno[ano] = (stats.porAno[ano] || 0) + 1;

      // 🏢 Unidad
      const unidad = (v.unidad_administrativa || 'Sin asignar').toString().trim() || 'Sin asignar';
      if (!stats.porUnidad[unidad]) {
        stats.porUnidad[unidad] = { total: 0, vehiculos: 0, motos: 0, otros: 0, operativos: 0 };
      }
      stats.porUnidad[unidad].total++;
      if (tipoAgrupado === 'Vehículos') stats.porUnidad[unidad].vehiculos++;
      else if (tipoAgrupado === 'Motocicletas') stats.porUnidad[unidad].motos++;
      else stats.porUnidad[unidad].otros++;
      if (estatusNorm === 'Operativo') {
        stats.porUnidad[unidad].operativos++;
        stats.asignados++;
      }
    });

    // 📊 ACTUALIZAR UI
    actualizarEstadisticas(stats);
    generarGraficos(stats);
    generarTablaResumen(stats.porUnidad);
    
    if (fechaReporte) {
      fechaReporte.textContent = new Date().toLocaleString('es-ES');
    }
  }

  // 📈 ACTUALIZAR TARJETAS
  function actualizarEstadisticas(stats) {
    const total = stats.total || 0;
    const elementos = [
      { id: 'totalOperativos', value: stats.operativos, pctId: 'porcentajeOperativos' },
      { id: 'totalInoperativos', value: stats.inoperativos, pctId: 'porcentajeInoperativos' },
      { id: 'totalMantenimiento', value: stats.mantenimiento, pctId: 'porcentajeMantenimiento' },
      { id: 'totalAsignados', value: stats.asignados, pctId: 'porcentajeAsignados' }
    ];
    
    elementos.forEach(el => {
      const elem = document.getElementById(el.id);
      const pctElem = document.getElementById(el.pctId);
      if (elem) elem.textContent = el.value;
      if (pctElem && total > 0) {
        pctElem.textContent = `${Math.round((el.value / total) * 100)}% del total`;
      }
    });
  }

  // 📊 GENERAR GRÁFICOS (Chart.js)
  function generarGraficos(stats) {
    if (typeof Chart === 'undefined') return;
    
    Chart.defaults.font.family = 'Roboto, sans-serif';
    Chart.defaults.color = '#64748b';

    // Doughnut: Tipos
    const ctxTipos = document.getElementById('chartTipos');
    if (ctxTipos) {
      new Chart(ctxTipos, {
        type: 'doughnut',
        data: {
          labels: Object.keys(stats.porTipo),
          datasets: [{
            data: Object.values(stats.porTipo),
            backgroundColor: ['#264653', '#2a9d8f', '#e9c46a', '#e76f51'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } }
        }
      });
    }

    // Bar: Estatus
    const ctxEstatus = document.getElementById('chartEstatus');
    if (ctxEstatus) {
      new Chart(ctxEstatus, {
        type: 'bar',
        data: {
          labels: Object.keys(stats.porEstatus),
          datasets: [{
            label: 'Cantidad',
            data: Object.values(stats.porEstatus),
            backgroundColor: ['#2a9d8f', '#e76f51', '#e9c46a'],
            borderRadius: 6
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Line: Años
    const ctxAnos = document.getElementById('chartAnos');
    if (ctxAnos) {
      const anosValidos = Object.keys(stats.porAno)
        .filter(a => a !== 'N/D' && !isNaN(a))
        .map(Number)
        .sort((a, b) => a - b);
      
      new Chart(ctxAnos, {
        type: 'line',
        data: {
          labels: anosValidos,
          datasets: [{
            label: 'Vehículos',
            data: anosValidos.map(a => stats.porAno[a]),
            borderColor: '#005b96',
            backgroundColor: 'rgba(0, 91, 150, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { 
          responsive: true, 
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { title: { display: true, text: 'Año' } },
            y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } }
          }
        }
      });
    }

    // Horizontal Bar: Top Unidades
    const ctxUnidades = document.getElementById('chartUnidades');
    if (ctxUnidades) {
      const unidadesTop = Object.entries(stats.porUnidad)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 10);
      
      new Chart(ctxUnidades, {
        type: 'bar',
        data: {
          labels: unidadesTop.map(u => u[0].length > 30 ? u[0].substring(0, 27) + '...' : u[0]),
          datasets: [{
            label: 'Vehículos',
            data: unidadesTop.map(u => u[1].total),
            backgroundColor: '#005b96',
            borderRadius: 4
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
  }

  // 📋 TABLA RESUMEN
  function generarTablaResumen(porUnidad) {
    const tbody = document.getElementById('tbodyResumen');
    if (!tbody) return;
    
    const filas = Object.entries(porUnidad)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15)
      .map(([unidad, datos]) => {
        const porcentaje = datos.total > 0 
          ? Math.round((datos.operativos / datos.total) * 100) 
          : 0;
        const badgeClass = porcentaje >= 80 ? 'badge-operativa' : porcentaje >= 50 ? 'badge-mantenimiento' : 'badge-inoperativa';
        
        return `
          <tr>
            <td><strong>${unidad}</strong></td>
            <td>${datos.total}</td>
            <td>${datos.operativos}</td>
            <td>${datos.total - datos.operativos}</td>
            <td>${datos.mantenimiento || 0}</td>
            <td><span class="badge ${badgeClass}">${porcentaje}%</span></td>
          </tr>
        `;
      }).join('');
    
    tbody.innerHTML = filas || '<tr><td colspan="6" style="text-align:center;color:#64748b;">Sin datos disponibles</td></tr>';
  }

  // 🧪 DATOS DE EJEMPLO (fallback)
  function generarDatosEjemplo() {
    console.log('🔄 Usando datos de ejemplo para demostración');
    
    const vehiculosEjemplo = Array.from({length: 150}, () => {
      const tipos = ['MOTO', 'CAMIONETA', 'AUTOMOVIL', 'CAMION', 'ENDURO', 'AUTOBUS'];
      const estatus = ['OPERATIVA', 'INOPERATIVA', 'REPARACION', 'OPERATIVA', 'OPERATIVA'];
      const unidades = [
        'ESTACION PARROQUIAL VENANCIO PULGAR',
        'BRIGADA MOTORIZADA (BRIM)',
        'ESTACION MUNICIPAL JESUS ENRIQUE LOSADA',
        'DIP', 'CCPEM', 'ESTACION PARROQUIAL LOS CORTIJOS'
      ];
      
      return {
        estatus: estatus[Math.floor(Math.random() * estatus.length)],
        clase: tipos[Math.floor(Math.random() * tipos.length)],
        tipo: null,
        ano: [2012, 2015, 2018, 2022, 2023, 2024][Math.floor(Math.random() * 6)],
        unidad_administrativa: unidades[Math.floor(Math.random() * unidades.length)]
      };
    });
    
    procesarDatos(vehiculosEjemplo);
    
    // Aviso visual
    const reportContent = document.getElementById('reportContent');
    if (reportContent && !reportContent.querySelector('.demo-warning')) {
      const warning = document.createElement('div');
      warning.className = 'demo-warning';
      warning.style.cssText = 'background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:20px;font-size:0.9rem;color:#92400e;text-align:center';
      warning.innerHTML = '⚠️ <strong>Modo demostración:</strong> Mostrando datos de ejemplo. Conecta Supabase para ver datos reales.';
      reportContent.insertBefore(warning, reportContent.firstChild);
    }
  }

  // 🖨️ EXPORTAR
  window.imprimirReporte = () => window.print();
  
  window.exportarPDF = async () => {
    if (typeof window.jspdf === 'undefined') {
      alert('⚠️ Librerías PDF no cargadas');
      return;
    }
    const { jsPDF } = window.jspdf;
    const element = document.getElementById('reportContent');
    if (!element) return;
    
    try {
      const btn = document.querySelector('.btn-pdf');
      if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Generando...'; }
      
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`reporte-partes-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (err) {
      console.error('❌ Error PDF:', err);
      alert('⚠️ No se pudo generar el PDF');
    } finally {
      const btn = document.querySelector('.btn-pdf');
      if (btn) { btn.disabled = false; btn.innerHTML = '📄 Exportar a PDF'; }
    }
  };
});
