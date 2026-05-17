// planilla-partes.js - Dashboard de estadísticas (sin sección Mantenimiento)
document.addEventListener('DOMContentLoaded', () => {
  // 🔧 CONFIGURACIÓN
  const supabaseUrl = window.SUPABASE_URL;
  const supabaseKey = window.SUPABASE_KEY;
  let supabase = null;
  
  if (supabaseUrl && supabaseKey && window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  }

  // 📦 REFERENCIAS DOM
  const userEmail = document.getElementById('userEmail');
  const fechaReporte = document.getElementById('fechaReporte');
  const tbodyResumen = document.getElementById('tablaResumenBody');

  // 🚀 INICIALIZACIÓN
  if (supabase) {
    mostrarUsuarioAutenticado();
    cargarYProcesarDatos();
  } else {
    userEmail.textContent = 'Sin conexión';
    generarDatosEjemplo();
  }

  // 👤 MOSTRAR USUARIO (igual que transporte.js)
  async function mostrarUsuarioAutenticado() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        userEmail.textContent = session.user.email;
      } else {
        userEmail.textContent = 'Usuario no autenticado';
      }
    } catch (err) {
      console.warn('⚠️ No se pudo obtener sesión:', err.message);
      userEmail.textContent = 'usuario@institucion.com';
    }
  }

  // 📥 CARGAR DATOS
  async function cargarYProcesarDatos() {
    try {
      const { data: vehiculos, error } = await supabase
        .from('vehiculos')
        .select('estatus, clase, tipo, ano, unidad_administrativa')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!vehiculos?.length) {
        console.warn('⚠️ Sin registros');
        generarDatosEjemplo();
        return;
      }
      procesarDatos(vehiculos);
    } catch (err) {
      console.error('❌ Error cargando datos:', err.message);
      generarDatosEjemplo();
    }
  }

  // 🔄 PROCESAR DATOS
  function procesarDatos(vehiculos) {
    // 🎯 Agrupación EXACTA como pediste
    const tiposAgrupados = {
      'Vehículos': ['automovil', 'camioneta', 'autobus', 'camion', 'pick-up', 'pickup', 'bus', 'machito', 'sport wagon', 'minibus'],
      'Motocicletas': ['moto', 'enduro', 'trimovil', 'traccion de sangre', 'paseo'],
      'Especiales': ['especial', 'embarcacion', 'barco']
    };

    const stats = {
      total: vehiculos.length,
      operativos: 0,
      inoperativos: 0,
      vehiculosTerrestres: 0,
      motos: 0,
      porTipo: {},
      porEstatus: {},
      porAno: {},
      porUnidad: {}
    };

    vehiculos.forEach(v => {
      // 📊 Estatus (solo Operativo / Inoperativo)
      const estatusRaw = (v.estatus || '').toString().toLowerCase().trim();
      const esOperativo = estatusRaw.includes('operativa') && 
                         !estatusRaw.includes('inoperativa') && 
                         !estatusRaw.includes('reparacion') && 
                         !estatusRaw.includes('taller') &&
                         !estatusRaw.includes('desincorporada');
      
      if (esOperativo) {
        stats.operativos++;
        stats.porEstatus['Operativo'] = (stats.porEstatus['Operativo'] || 0) + 1;
      } else {
        stats.inoperativos++;
        stats.porEstatus['Inoperativo'] = (stats.porEstatus['Inoperativo'] || 0) + 1;
      }

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
      if (tipoAgrupado === 'Vehículos') stats.vehiculosTerrestres++;
      if (tipoAgrupado === 'Motocicletas') stats.motos++;

      // 📅 Año
      const ano = v.ano && !isNaN(v.ano) ? v.ano : 'N/D';
      stats.porAno[ano] = (stats.porAno[ano] || 0) + 1;

      // 🏢 Unidad administrativa
      const unidad = (v.unidad_administrativa || 'Sin asignar').toString().trim() || 'Sin asignar';
      if (!stats.porUnidad[unidad]) {
        stats.porUnidad[unidad] = { total: 0, terrestres: 0, motos: 0, otros: 0, operativos: 0 };
      }
      stats.porUnidad[unidad].total++;
      if (tipoAgrupado === 'Vehículos') stats.porUnidad[unidad].terrestres++;
      else if (tipoAgrupado === 'Motocicletas') stats.porUnidad[unidad].motos++;
      else stats.porUnidad[unidad].otros++;
      if (esOperativo) stats.porUnidad[unidad].operativos++;
    });

    // 📊 ACTUALIZAR UI
    actualizarEstadisticas(stats);
    generarGraficos(stats);
    generarTablaResumen(stats.porUnidad);
    
    if (fechaReporte) {
      fechaReporte.textContent = new Date().toLocaleString('es-ES');
    }
  }

  // 📈 ACTUALIZAR TARJETAS (estilo transporte.html)
  function actualizarEstadisticas(stats) {
    const ids = [
      { id: 'totalVehiculos', val: stats.total },
      { id: 'totalOperativos', val: stats.operativos },
      { id: 'totalInoperativos', val: stats.inoperativos },
      { id: 'totalVehiculosTerrestres', val: stats.vehiculosTerrestres },
      { id: 'totalMotos', val: stats.motos }
    ];
    ids.forEach(({id, val}) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  }

  // 📊 GRÁFICOS
  function generarGraficos(stats) {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = 'Roboto, sans-serif';

    // Doughnut: Tipos
    const ctxTipos = document.getElementById('chartTipos');
    if (ctxTipos) {
      new Chart(ctxTipos, {
        type: 'doughnut',
        data: {
          labels: Object.keys(stats.porTipo),
          datasets: [{
            data: Object.values(stats.porTipo),
            backgroundColor: ['#264653', '#2a9d8f', '#e9c46a'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
      });
    }

    // Bar: Estatus (solo 2 categorías)
    const ctxEstatus = document.getElementById('chartEstatus');
    if (ctxEstatus) {
      new Chart(ctxEstatus, {
        type: 'bar',
        data: {
          labels: Object.keys(stats.porEstatus),
          datasets: [{
            data: Object.values(stats.porEstatus),
            backgroundColor: ['#2a9d8f', '#e76f51'],
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
      const anos = Object.keys(stats.porAno).filter(a => a !== 'N/D').map(Number).sort((a,b)=>a-b);
      new Chart(ctxAnos, {
        type: 'line',
        data: {
          labels: anos,
          datasets: [{
            label: 'Vehículos',
            data: anos.map(a => stats.porAno[a]),
            borderColor: '#005b96',
            backgroundColor: 'rgba(0,91,150,0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
      });
    }

    // Horizontal Bar: Top Unidades
    const ctxUnidades = document.getElementById('chartUnidades');
    if (ctxUnidades) {
      const top = Object.entries(stats.porUnidad).sort((a,b)=>b[1].total-a[1].total).slice(0,10);
      new Chart(ctxUnidades, {
        type: 'bar',
        data: {
          labels: top.map(u => u[0].length>25 ? u[0].substring(0,22)+'...' : u[0]),
          datasets: [{
            data: top.map(u => u[1].total),
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

  // 📋 TABLA RESUMEN - ✅ ID CORREGIDO: tablaResumenBody
  function generarTablaResumen(porUnidad) {
    if (!tbodyResumen) {
      console.error('❌ No se encontró #tablaResumenBody');
      return;
    }
    
    const filas = Object.entries(porUnidad)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15)
      .map(([unidad, d]) => {
        const pct = d.total > 0 ? Math.round((d.operativos / d.total) * 100) : 0;
        const cls = pct >= 80 ? 'badge-operativa' : pct >= 50 ? 'badge-mantenimiento' : 'badge-inoperativa';
        return `<tr>
          <td><strong>${unidad}</strong></td>
          <td>${d.terrestres}</td>
          <td>${d.motos}</td>
          <td>${d.otros}</td>
          <td>${d.operativos}</td>
          <td><span class="badge ${cls}">${pct}%</span></td>
        </tr>`;
      }).join('');
    
    tbodyResumen.innerHTML = filas || '<tr><td colspan="6" style="text-align:center;color:#64748b;">Sin datos</td></tr>';
  }

  // 🧪 DATOS DE EJEMPLO
  function generarDatosEjemplo() {
    const vehiculos = Array.from({length: 120}, () => ({
      estatus: ['OPERATIVA','INOPERATIVA','OPERATIVA','OPERATIVA'][Math.floor(Math.random()*4)],
      clase: ['CAMIONETA','MOTO','AUTOMOVIL','CAMION','ENDURO'][Math.floor(Math.random()*5)],
      ano: [2015,2018,2022,2024][Math.floor(Math.random()*4)],
      unidad_administrativa: ['ESTACION A','ESTACION B','BRIGADA MOTORIZADA','DIP'][Math.floor(Math.random()*4)]
    }));
    procesarDatos(vehiculos);
    
    // Aviso visual
    const report = document.getElementById('reportContent');
    if (report && !report.querySelector('.demo-warning')) {
      const w = document.createElement('div');
      w.className = 'demo-warning';
      w.style.cssText = 'background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:20px;text-align:center;color:#92400e';
      w.innerHTML = '⚠️ <strong>Modo demostración:</strong> Datos de ejemplo. Conecta Supabase para datos reales.';
      report.insertBefore(w, report.firstChild);
    }
  }

  // 🖨️ EXPORTAR
  window.imprimirReporte = () => window.print();
  
  window.exportarPDF = async () => {
    if (!window.jspdf || !window.html2canvas) {
      alert('⚠️ Librerías PDF no cargadas');
      return;
    }
    const { jsPDF } = window.jspdf;
    const el = document.getElementById('reportContent');
    if (!el) return;
    
    try {
      const btn = document.querySelector('.btn-pdf');
      if (btn) { btn.disabled = true; btn.innerHTML = '⏳...'; }
      
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff' });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = 210;
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, 'PNG', 0, 0, w, h);
      pdf.save(`partes-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      console.error('❌ PDF error:', e);
      alert('⚠️ Error al exportar');
    } finally {
      const btn = document.querySelector('.btn-pdf');
      if (btn) { btn.disabled = false; btn.innerHTML = '📄 Exportar PDF'; }
    }
  };
});
