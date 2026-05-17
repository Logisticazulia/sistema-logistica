// planilla-partes.js - Dashboard estadístico con paginación y nuevos gráficos
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

  if (supabase) { cargarUsuario(); cargarYProcesarDatos(); }
  else { if(userEmail) userEmail.textContent = '⚠️ Sin conexión a BD'; }

  async function cargarUsuario() {
    try { const { data: { session } } = await supabase.auth.getSession(); if(userEmail) userEmail.textContent = session?.user?.email || 'Invitado'; }
    catch { if(userEmail) userEmail.textContent = 'Usuario'; }
  }

  async function cargarYProcesarDatos() {
    try {
      const { data: vehiculos, error } = await supabase
        .from('vehiculos')
        .select('clase, tipo, estatus, situacion, unidad_administrativa, ano, marca, modelo')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      procesarDatos(vehiculos || []);
    } catch (err) { console.error('❌ Error BD:', err); generarDatosEjemplo(); }
  }

  function procesarDatos(vehiculos) {
    const vehiculosTerrestres = ['automovil', 'camioneta', 'autobus', 'camion', 'pick-up', 'pickup', 'bus', 'minibus'];
    const motos = ['moto', 'enduro', 'trimovil', 'traccion de sangre', 'paseo'];

    const stats = { 
      total: 0, terrestres: 0, motos: 0, traccion: 0, 
      operativos: 0, inoperativos: 0, desincorporados: 0, 
      porTipo: {}, porEstatus: { 'Operativo': 0, 'Inoperativo': 0 },
      porSituacion: {}, porMarca: {}, porModelo: {}, porUnidad: {}
    };

    vehiculos.forEach(v => {
      stats.total++;
      const claseStr = (v.clase || v.tipo || '').toString().toLowerCase().trim();
      const estatusStr = (v.estatus || '').toString().toLowerCase().trim();
      const situacionStr = (v.situacion || '').trim();
      const marca = (v.marca || 'Sin marca').trim();
      const modelo = (v.modelo || 'Sin modelo').trim();

      // 1. TIPO
      let tipo = 'Otro';
      if (vehiculosTerrestres.some(c => claseStr.includes(c))) { tipo = 'Vehículo Terrestre'; stats.terrestres++; }
      else if (motos.some(c => claseStr.includes(c))) { tipo = 'Motocicleta'; stats.motos++; }
      else if (claseStr.includes('traccion de sangre') || claseStr.includes('traccion')) { tipo = 'Tracción de Sangre'; stats.traccion++; }
      stats.porTipo[tipo] = (stats.porTipo[tipo] || 0) + 1;

      // 2. ESTATUS
      const esDesinc = estatusStr.includes('desincorporada');
      const esInop = !esDesinc && (estatusStr.includes('inoperativa') || estatusStr.includes('reparacion') || estatusStr.includes('taller') || estatusStr.includes('denunciada'));
      if (!esDesinc && !esInop) stats.operativos++;
      if (esInop) stats.inoperativos++;
      if (esDesinc) stats.desincorporados++;

      // 3. SITUACION, MARCA, MODELO
      const sit = situacionStr || 'Sin definir';
      stats.porSituacion[sit] = (stats.porSituacion[sit] || 0) + 1;
      stats.porMarca[marca] = (stats.porMarca[marca] || 0) + 1;
      stats.porModelo[modelo] = (stats.porModelo[modelo] || 0) + 1;

      // 4. UNIDAD (TABLA)
      const unidad = (v.unidad_administrativa || 'Sin Asignar').trim();
      if (!stats.porUnidad[unidad]) stats.porUnidad[unidad] = { total: 0, terrestres: 0, motos: 0, traccion: 0, inoperativos: 0, desincorporados: 0 };
      stats.porUnidad[unidad].total++;
      if (tipo === 'Vehículo Terrestre') stats.porUnidad[unidad].terrestres++;
      if (tipo === 'Motocicleta') stats.porUnidad[unidad].motos++;
      if (tipo === 'Tracción de Sangre') stats.porUnidad[unidad].traccion++;
      if (esInop) stats.porUnidad[unidad].inoperativos++;
      if (esDesinc) stats.porUnidad[unidad].desincorporados++;
    });

    unidadesData = Object.entries(stats.porUnidad).map(([nombre, d]) => ({ nombre, ...d })).sort((a, b) => b.total - a.total);
    currentPage = 1;

    renderStats(stats);
    renderCharts(stats);
    renderTable();
    renderPagination();
    if(fechaReporte) fechaReporte.textContent = new Date().toLocaleString('es-ES');
  }

  function renderStats(s) {
    const ids = ['totalVehiculos','totalPatrulleras','totalMotos','totalOperativos','totalInoperativos','totalDesincorporados'];
    const vals = [s.total, s.terrestres, s.motos, s.operativos, s.inoperativos, s.desincorporados];
    ids.forEach((id, i) => document.getElementById(id).textContent = vals[i]);
  }

  function renderCharts(s) {
    if(typeof Chart === 'undefined') return;
    Chart.defaults.font.family = 'Roboto, sans-serif';

    // Helper Top N
    const topN = (obj, n) => Object.entries(obj).sort((a,b)=>b[1]-a[1]).slice(0, n);

    // 1. Tipos
    new Chart(document.getElementById('chartTipos'), {
      type: 'doughnut', data: { labels: Object.keys(s.porTipo), datasets: [{ data: Object.values(s.porTipo), backgroundColor: ['#003366','#e76f51','#2a9d8f','#64748b'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    // 2. Estatus
    new Chart(document.getElementById('chartEstatus'), {
      type: 'bar', data: { labels: ['Operativos','Inoperativos'], datasets: [{ data: [s.porEstatus.Operativo, s.porEstatus.Inoperativo], backgroundColor: ['#22c55e','#ef4444'], borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 3. Situación
    const sitData = topN(s.porSituacion, 8);
    new Chart(document.getElementById('chartSituacion'), {
      type: 'bar', data: { labels: sitData.map(x=>x[0]), datasets: [{ data: sitData.map(x=>x[1]), backgroundColor: '#f59e0b', borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 4. Top Marcas
    const marcas = topN(s.porMarca, 8);
    new Chart(document.getElementById('chartMarcas'), {
      type: 'bar', data: { labels: marcas.map(x=>x[0]), datasets: [{ data: marcas.map(x=>x[1]), backgroundColor: '#3b82f6', borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 5. Top Modelos
    const modelos = topN(s.porModelo, 8);
    new Chart(document.getElementById('chartModelos'), {
      type: 'bar', data: { labels: modelos.map(x=>x[0]), datasets: [{ data: modelos.map(x=>x[1]), backgroundColor: '#8b5cf6', borderRadius: 4 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 6. Años
    const anos = Object.keys(s.porTipo).length ? Object.entries(s.porAno).filter(a=>!isNaN(a[0])).sort((a,b)=>a[0]-b[0]) : [];
    new Chart(document.getElementById('chartAnos'), {
      type: 'line', data: { labels: anos.map(x=>x[0]), datasets: [{ data: anos.map(x=>x[1]), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  function renderTable() {
    if(!tbody) return;
    const pageData = unidadesData.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);
    if(pageData.length===0) { tbody.innerHTML='<tr><td colspan="7" style="text-align:center;padding:20px;color:#64748b;">Sin datos</td></tr>'; return; }

    tbody.innerHTML = pageData.map(d => {
      const activos = d.total - d.inoperativos - d.desincorporados;
      const pct = d.total>0 ? Math.round((activos/d.total)*100) : 0;
      const cls = pct>=80?'badge-alta':pct>=50?'badge-media':'badge-baja';
      return `<tr>
        <td style="font-weight:500;">${d.nombre}</td>
        <td style="text-align:center;">${d.terrestres}</td>
        <td style="text-align:center;">${d.motos}</td>
        <td style="text-align:center;">${d.traccion}</td>
        <td style="text-align:center;color:#dc2626;">${d.inoperativos}</td>
        <td style="text-align:center;color:#64748b;">${d.desincorporados}</td>
        <td style="text-align:center;"><span class="badge ${cls}">${pct}%</span></td>
      </tr>`;
    }).join('');
  }

  function renderPagination() {
    pagContainer.innerHTML = '';
    const totalPages = Math.ceil(unidadesData.length/itemsPerPage);
    if(totalPages<=1) return;
    const prev = document.createElement('button'); prev.textContent='← Anterior'; prev.disabled=currentPage===1; prev.onclick=()=>{currentPage--;renderTable();renderPagination();};
    const next = document.createElement('button'); next.textContent='Siguiente →'; next.disabled=currentPage===totalPages; next.onclick=()=>{currentPage++;renderTable();renderPagination();};
    const info = document.createElement('span'); info.textContent=`Página ${currentPage} de ${totalPages} (${unidadesData.length} registros)`;
    pagContainer.append(prev, info, next);
  }

  function generarDatosEjemplo() {
    const data = Array.from({length:85},()=>({
      clase:['CAMIONETA','MOTO','TRACCION DE SANGRE','AUTOMOVIL'][Math.floor(Math.random()*4)],
      estatus:['OPERATIVA','INOPERATIVA','DESINCORPORADA','REPARACION'][Math.floor(Math.random()*4)],
      situacion:['OPERATIVA','INOPERATIVA','REPARACION','TALLER'][Math.floor(Math.random()*4)],
      marca:['TOYOTA','SUZUKI','HAOJUE','KAWASAKI','YAMAHA'][Math.floor(Math.random()*5)],
      modelo:['HILUX','DR-650','HJ-300AT','KLR-650','YBR 125'][Math.floor(Math.random()*5)],
      unidad_administrativa:['ESTACIÓN A','EPP B','CCPEM','EPM C','BRIM'][Math.floor(Math.random()*5)],
      ano:2015+Math.floor(Math.random()*9)
    }));
    procesarDatos(data);
    if(tbody) tbody.insertAdjacentHTML('beforebegin','<div style="background:#fef3c7;padding:10px;margin-bottom:10px;border-radius:8px;text-align:center;color:#92400e;">⚠️ Modo Demo: Datos simulados. Conecta Supabase para datos reales.</div>');
  }

  window.imprimirReporte = () => window.print();
  window.exportarPDF = async () => {
    if(!window.jspdf||!window.html2canvas) return alert('⚠️ Librerías no cargadas');
    const { jsPDF } = window.jspdf; const el = document.getElementById('reportContent'); if(!el) return;
    try {
      const btn = document.querySelector('.btn-pdf'); btn.innerHTML='⏳ Generando...'; btn.disabled=true;
      const canvas = await html2canvas(el, { scale:2, backgroundColor:'#fff' });
      const pdf = new jsPDF('p','mm','a4'); const w=210, h=(canvas.height*w)/canvas.width;
      pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,w,h);
      pdf.save(`Partes_Generales_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch(e) { console.error(e); alert('❌ Error al exportar'); }
    finally { const b=document.querySelector('.btn-pdf'); b.innerHTML='📄 Exportar PDF'; b.disabled=false; }
  };
});
