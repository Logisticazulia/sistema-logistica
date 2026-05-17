// planilla-partes.js - Dashboard estadístico con paginación
document.addEventListener('DOMContentLoaded', () => {
  const supabaseUrl = window.SUPABASE_URL;
  const supabaseKey = window.SUPABASE_KEY;
  let supabase = null;
  
  if (supabaseUrl && supabaseKey && window.supabase) {
    supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
  }

  const userEmail = document.getElementById('userEmail');
  const fechaReporte = document.getElementById('fechaReporte');
  const tbody = document.getElementById('tablaResumenBody');
  const pagContainer = document.getElementById('paginationControls');

  let unidadesData = [];
  const itemsPerPage = 20;
  let currentPage = 1;

  // 🚀 INICIALIZACIÓN
  if (supabase) {
    cargarUsuario();
    cargarYProcesarDatos();
  } else {
    if(userEmail) userEmail.textContent = '⚠️ Sin conexión a BD';
    generarDatosEjemplo();
  }

  // 👤 SESIÓN
  async function cargarUsuario() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if(userEmail) userEmail.textContent = session?.user?.email || 'Invitado';
    } catch { if(userEmail) userEmail.textContent = 'Usuario'; }
  }

  // 📥 OBTENER DATOS
  async function cargarYProcesarDatos() {
    try {
      const { data, error } = await supabase
        .from('vehiculos')
        .select('clase, estatus, situacion, unidad_administrativa, ano');
      
      if (error) throw error;
      procesarDatos(data || []);
    } catch (err) {
      console.error('❌ Error BD:', err);
      generarDatosEjemplo();
    }
  }

  // 🔄 PROCESAR Y AGRUPAR
  function procesarDatos(vehiculos) {
    const stats = { 
      total: 0, patrulleras: 0, motos: 0, traccion: 0, 
      inoperativos: 0, desincorporados: 0, 
      porEstatus: { 'Operativos': 0, 'Inoperativos': 0, 'Desincorporados': 0 },
      porUnidad: {}, porAno: {}
    };

    // Definiciones estrictas según tu CSV
    const clasesPatrulleras = ['automovil', 'camioneta', 'autobus', 'camion'];
    const clasesMotos = ['moto', 'enduro', 'trimovil', 'paseo', 'especial'];
    const clasesTraccion = ['traccion de sangre', 'traccion'];

    vehiculos.forEach(v => {
      stats.total++;
      const clase = (v.clase || '').toLowerCase().trim();
      const estatus = ((v.estatus || v.situacion) || '').toLowerCase().trim();

      // 1. TIPO
      if (clasesPatrulleras.some(c => clase.includes(c))) { stats.patrulleras++; }
      else if (clasesMotos.some(c => clase.includes(c))) { stats.motos++; }
      else if (clasesTraccion.some(c => clase.includes(c))) { stats.traccion++; }

      // 2. ESTATUS
      const esDesincorporado = estatus.includes('desincorporad');
      const esInoperativo = !esDesincorporado && (estatus.includes('inoperativa') || estatus.includes('reparacion') || estatus.includes('taller') || estatus.includes('denunciada'));
      
      if (esDesincorporado) {
        stats.desincorporados++; stats.porEstatus['Desincorporados']++;
      } else if (esInoperativo) {
        stats.inoperativos++; stats.porEstatus['Inoperativos']++;
      } else {
        stats.porEstatus['Operativos']++;
      }

      // 3. UNIDAD
      const unidad = (v.unidad_administrativa || 'Sin Asignar').trim();
      if (!stats.porUnidad[unidad]) {
        stats.porUnidad[unidad] = { total: 0, patrulleras: 0, motos: 0, traccion: 0, inoperativos: 0, desincorporados: 0 };
      }
      stats.porUnidad[unidad].total++;
      if (clasesPatrulleras.some(c => clase.includes(c))) stats.porUnidad[unidad].patrulleras++;
      if (clasesMotos.some(c => clase.includes(c))) stats.porUnidad[unidad].motos++;
      if (clasesTraccion.some(c => clase.includes(c))) stats.porUnidad[unidad].traccion++;
      if (esInoperativo) stats.porUnidad[unidad].inoperativos++;
      if (esDesincorporado) stats.porUnidad[unidad].desincorporados++;

      // 4. AÑO
      const ano = v.ano && !isNaN(v.ano) ? v.ano : null;
      if (ano) stats.porAno[ano] = (stats.porAno[ano] || 0) + 1;
    });

    // Preparar datos para tabla
    unidadesData = Object.entries(stats.porUnidad)
      .map(([nombre, d]) => ({ nombre, ...d }))
      .sort((a, b) => b.total - a.total);

    currentPage = 1;
    renderStats(stats);
    renderCharts(stats);
    renderTable();
    renderPagination();
    
    if(fechaReporte) fechaReporte.textContent = new Date().toLocaleString('es-ES');
  }

  // 📈 ACTUALIZAR TARJETAS
  function renderStats(s) {
    document.getElementById('totalVehiculos').textContent = s.total;
    document.getElementById('totalPatrulleras').textContent = s.patrulleras;
    document.getElementById('totalMotos').textContent = s.motos;
    document.getElementById('totalInoperativos').textContent = s.inoperativos;
    document.getElementById('totalDesincorporados').textContent = s.desincorporados;
  }

  // 📊 GRÁFICOS
  function renderCharts(s) {
    if(typeof Chart === 'undefined') return;
    Chart.defaults.font.family = 'Roboto, sans-serif';

    // 1. Tipos (Solo 3)
    new Chart(document.getElementById('chartTipos'), {
      type: 'doughnut',
      data: {
        labels: ['Unidades Patrulleras', 'Motocicletas', 'Tracción de Sangre'],
        datasets: [{ data: [s.patrulleras, s.motos, s.traccion], backgroundColor: ['#003366', '#e76f51', '#2a9d8f'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // 2. Estatus
    new Chart(document.getElementById('chartEstatus'), {
      type: 'bar',
      data: {
        labels: Object.keys(s.porEstatus),
        datasets: [{ data: Object.values(s.porEstatus), backgroundColor: ['#22c55e', '#ef4444', '#64748b'], borderRadius: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 3. Top Unidades
    const top = s.porUnidad ? Object.entries(s.porUnidad).sort((a,b)=>b[1].total-a[1].total).slice(0,10) : [];
    new Chart(document.getElementById('chartUnidades'), {
      type: 'bar',
      data: {
        labels: top.map(u => u[0].length>30 ? u[0].substring(0,27)+'...' : u[0]),
        datasets: [{ data: top.map(u=>u[1].total), backgroundColor: '#005b96', borderRadius: 4 }]
      },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 4. Años
    const anos = Object.keys(s.porAno).filter(a=>!isNaN(a)).map(Number).sort((a,b)=>a-b);
    new Chart(document.getElementById('chartAnos'), {
      type: 'line',
      data: {
        labels: anos,
        datasets: [{ data: anos.map(a=>s.porAno[a]), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  // 📋 RENDER TABLA CON PAGINACIÓN
  function renderTable() {
    if(!tbody) return;
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = unidadesData.slice(start, end);

    if(pageData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">Sin datos para mostrar</td></tr>';
      return;
    }

    tbody.innerHTML = pageData.map(d => {
      const activos = d.total - d.inoperativos - d.desincorporados;
      const pct = d.total > 0 ? Math.round((activos / d.total) * 100) : 0;
      const cls = pct >= 80 ? 'badge-alta' : pct >= 50 ? 'badge-media' : 'badge-baja';
      return `<tr>
        <td style="font-weight:500;">${d.nombre}</td>
        <td style="text-align:center;">${d.patrulleras}</td>
        <td style="text-align:center;">${d.motos}</td>
        <td style="text-align:center;">${d.traccion}</td>
        <td style="text-align:center;color:#dc2626;">${d.inoperativos}</td>
        <td style="text-align:center;color:#64748b;">${d.desincorporados}</td>
        <td style="text-align:center;"><span class="badge ${cls}">${pct}%</span></td>
      </tr>`;
    }).join('');
  }

  // 🔘 PAGINACIÓN
  function renderPagination() {
    pagContainer.innerHTML = '';
    const totalPages = Math.ceil(unidadesData.length / itemsPerPage);
    if (totalPages <= 1) return;

    const prev = document.createElement('button'); prev.textContent = '← Anterior';
    prev.disabled = currentPage === 1;
    prev.onclick = () => { currentPage--; renderTable(); renderPagination(); };

    const next = document.createElement('button'); next.textContent = 'Siguiente →';
    next.disabled = currentPage === totalPages;
    next.onclick = () => { currentPage++; renderTable(); renderPagination(); };

    const info = document.createElement('span');
    info.textContent = `Página ${currentPage} de ${totalPages} (${unidadesData.length} registros)`;
    
    pagContainer.append(prev, info, next);
  }

  // 🧪 FALLBACK DATOS
  function generarDatosEjemplo() {
    const data = Array.from({length: 85}, (_, i) => ({
      clase: ['CAMIONETA','MOTO','TRACCION DE SANGRE','AUTOMOVIL'][Math.floor(Math.random()*4)],
      estatus: ['OPERATIVA','INOPERATIVA','DESINCORPORADA','REPARACION'][Math.floor(Math.random()*4)],
      unidad_administrativa: ['ESTACIÓN A','EPP B','CCPEM','EPM C','BRIM'][Math.floor(Math.random()*5)],
      ano: 2015 + Math.floor(Math.random()*9)
    }));
    procesarDatos(data);
    if(tbody) tbody.insertAdjacentHTML('beforebegin', '<div style="background:#fef3c7;padding:10px;margin-bottom:10px;border-radius:8px;text-align:center;color:#92400e;">⚠️ Modo Demo: Datos simulados. Conecta Supabase para datos reales.</div>');
  }

  // 📄 EXPORTAR
  window.imprimirReporte = () => window.print();
  window.exportarPDF = async () => {
    if(!window.jspdf || !window.html2canvas) return alert('⚠️ Librerías no cargadas');
    const { jsPDF } = window.jspdf;
    const el = document.getElementById('reportContent');
    if(!el) return;
    try {
      const btn = document.querySelector('.btn-pdf');
      btn.innerHTML = '⏳ Generando...'; btn.disabled = true;
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#fff' });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const w = 210, h = (canvas.height * w) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, w, h);
      pdf.save(`Partes_Generales_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch(e) { console.error(e); alert('❌ Error al exportar'); }
    finally { const b = document.querySelector('.btn-pdf'); b.innerHTML = '📄 Exportar PDF'; b.disabled = false; }
  };
});
