/**
 * PARTES GENERALES - REPORTES Y ESTADÍSTICAS
 * Muestra gráficos y estadísticas del parque automotor
 */

// Variables globales
let supabase;
let chartEstatus, chartTipos, chartUnidades, chartAnos;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializar Supabase
        supabase = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
        
        // Cargar datos
        await cargarDatos();
        
        // Establecer fecha del reporte
        document.getElementById('fechaReporte').textContent = new Date().toLocaleString('es-VE');
        
    } catch (error) {
        console.error('Error al inicializar:', error);
    }
});

// Cargar datos y generar estadísticas
async function cargarDatos() {
    try {
        // Obtener todos los vehículos
        const { data: vehiculos, error } = await supabase
            .from('vehiculos')
            .select('*');
        
        if (error) throw error;
        
        // Calcular estadísticas
        calcularEstadisticas(vehiculos);
        
        // Generar gráficos
        generarGraficos(vehiculos);
        
        // Generar tabla de resumen
        generarTablaResumen(vehiculos);
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        alert('Error al cargar los datos del reporte');
    }
}

// Calcular estadísticas principales
function calcularEstadisticas(vehiculos) {
    const total = vehiculos.length;
    
    const operativos = vehiculos.filter(v => v.estatus === 'OPERATIVA').length;
    const inoperativos = vehiculos.filter(v => v.estatus === 'INOPERATIVA').length;
    const mantenimiento = vehiculos.filter(v => 
        v.situacion === 'REPARACION' || v.situacion === 'TALLER'
    ).length;
    const asignados = vehiculos.filter(v => v.unidad_administrativa && v.unidad_administrativa !== 'NO').length;
    
    // Actualizar tarjetas
    document.getElementById('totalOperativos').textContent = operativos;
    document.getElementById('totalInoperativos').textContent = inoperativos;
    document.getElementById('totalMantenimiento').textContent = mantenimiento;
    document.getElementById('totalAsignados').textContent = asignados;
    
    // Calcular porcentajes
    const pctOperativos = total > 0 ? ((operativos / total) * 100).toFixed(1) : 0;
    const pctInoperativos = total > 0 ? ((inoperativos / total) * 100).toFixed(1) : 0;
    const pctMantenimiento = total > 0 ? ((mantenimiento / total) * 100).toFixed(1) : 0;
    const pctAsignados = total > 0 ? ((asignados / total) * 100).toFixed(1) : 0;
    
    document.getElementById('porcentajeOperativos').textContent = `${pctOperativos}% del total`;
    document.getElementById('porcentajeInoperativos').textContent = `${pctInoperativos}% del total`;
    document.getElementById('porcentajeMantenimiento').textContent = `${pctMantenimiento}% del total`;
    document.getElementById('porcentajeAsignados').textContent = `${pctAsignados}% del total`;
}

// Generar gráficos
function generarGraficos(vehiculos) {
    // Destruir gráficos existentes si los hay
    if (chartEstatus) chartEstatus.destroy();
    if (chartTipos) chartTipos.destroy();
    if (chartUnidades) chartUnidades.destroy();
    if (chartAnos) chartAnos.destroy();
    
    // Gráfico de Estatus
    const estatusData = {
        'OPERATIVA': vehiculos.filter(v => v.estatus === 'OPERATIVA').length,
        'INOPERATIVA': vehiculos.filter(v => v.estatus === 'INOPERATIVA').length,
        'REPARACION': vehiculos.filter(v => v.situacion === 'REPARACION').length,
        'TALLER': vehiculos.filter(v => v.situacion === 'TALLER').length,
        'DESINCORPORADA': vehiculos.filter(v => v.estatus === 'DESINCORPORADA').length
    };
    
    chartEstatus = new Chart(document.getElementById('chartEstatus'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(estatusData),
            datasets: [{
                data: Object.values(estatusData),
                backgroundColor: [
                    '#059669',
                    '#dc2626',
                    '#f59e0b',
                    '#d97706',
                    '#6b7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Gráfico por Tipo
    const tiposData = {};
    vehiculos.forEach(v => {
        const tipo = v.tipo || 'SIN TIPO';
        tiposData[tipo] = (tiposData[tipo] || 0) + 1;
    });
    
    chartTipos = new Chart(document.getElementById('chartTipos'), {
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
                        stepSize: 1
                    }
                }
            }
        }
    });
    
    // Gráfico por Unidad Administrativa (Top 10)
    const unidadesData = {};
    vehiculos.forEach(v => {
        const unidad = v.unidad_administrativa || 'SIN ASIGNAR';
        unidadesData[unidad] = (unidadesData[unidad] || 0) + 1;
    });
    
    const sortedUnidades = Object.entries(unidadesData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    chartUnidades = new Chart(document.getElementById('chartUnidades'), {
        type: 'pie',
        data: {
            labels: sortedUnidades.map(u => u[0]),
            datasets: [{
                data: sortedUnidades.map(u => u[1]),
                backgroundColor: [
                    '#003366', '#005b96', '#2a9d8f', '#e9c46a',
                    '#e76f51', '#9b5de5', '#f15bb5', '#00bbf4',
                    '#00f5d4', '#fee440'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
    
    // Gráfico por Año
    const anosData = {};
    vehiculos.forEach(v => {
        const ano = v.ano || 'SIN AÑO';
        anosData[ano] = (anosData[ano] || 0) + 1;
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
                tension: 0.4
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
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Generar tabla de resumen por unidad
function generarTablaResumen(vehiculos) {
    const unidadesData = {};
    
    vehiculos.forEach(v => {
        const unidad = v.unidad_administrativa || 'SIN ASIGNAR';
        
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

// Imprimir reporte
function imprimirReporte() {
    window.print();
}

// Exportar a PDF
async function exportarPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4'); // Horizontal
    
    try {
        // Capturar el contenido del reporte
        const element = document.getElementById('reportContent');
        
        // Mostrar mensaje de carga
        const btnPdf = document.querySelector('.btn-pdf');
        const originalText = btnPdf.innerHTML;
        btnPdf.innerHTML = '⏳ Generando PDF...';
        btnPdf.disabled = true;
        
        // Usar html2canvas para capturar el contenido
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 297; // A4 horizontal en mm
        const pageHeight = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;
        
        // Primera página
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        
        // Páginas adicionales si es necesario
        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }
        
        // Guardar PDF
        const fecha = new Date().toISOString().split('T')[0];
        pdf.save(`partes-generales-${fecha}.pdf`);
        
        // Restaurar botón
        btnPdf.innerHTML = originalText;
        btnPdf.disabled = false;
        
    } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar el PDF. Intente nuevamente.');
        
        // Restaurar botón
        const btnPdf = document.querySelector('.btn-pdf');
        btnPdf.innerHTML = '📄 Exportar a PDF';
        btnPdf.disabled = false;
    }
}
