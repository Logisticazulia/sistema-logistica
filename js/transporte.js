/**
 * ========================================
 * SISTEMA LOGÍSTICA - MÓDULO DE TRANSPORTE
 * ========================================
 */

// ==================== CONFIGURACIÓN ====================
const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';
const SUPABASE_KEY = 'TU_SUPABASE_ANON_KEY_AQUI';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LOGIN_URL = 'https://logisticazulia.github.io/sistema-logistica/index.html';

// ==================== REFERENCIAS AL DOM ====================
const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const dynamicSection = document.getElementById('dynamicSection');
const sectionTitle = document.getElementById('sectionTitle');
const sectionContent = document.getElementById('sectionContent');

const formModal = document.getElementById('formModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalClose = document.getElementById('modalClose');

// Estadísticas
const totalVehiclesEl = document.getElementById('totalVehicles');
const availableVehiclesEl = document.getElementById('availableVehicles');
const maintenanceVehiclesEl = document.getElementById('maintenanceVehicles');
const assignedVehiclesEl = document.getElementById('assignedVehicles');

// Datos de ejemplo
let vehiclesData = [];

// ==================== SEGURIDAD ====================

async function checkSession() {
    const {  { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session || error) {
        window.location.href = LOGIN_URL;
        return;
    }
    
    userEmailElement.textContent = session.user.email;
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = LOGIN_URL;
}

// ==================== CARGA DE DATOS ====================

function loadVehiclesData() {
    // Datos de ejemplo para demostración
    vehiclesData = [
        {
            id: '1',
            placa: 'AB-123-CD',
            marca: 'Toyota',
            modelo: 'Hilux',
            año: '2022',
            color: 'Blanco',
            tipo: 'Camioneta',
            estado: 'disponible',
            kilometraje: '45000',
            asignado_a: ''
        },
        {
            id: '2',
            placa: 'EF-456-GH',
            marca: 'Nissan',
            modelo: 'Frontier',
            año: '2021',
            color: 'Gris',
            tipo: 'Camioneta',
            estado: 'asignado',
            kilometraje: '62000',
            asignado_a: 'Departamento de Operaciones'
        },
        {
            id: '3',
            placa: 'IJ-789-KL',
            marca: 'Ford',
            modelo: 'Ranger',
            año: '2020',
            color: 'Azul',
            tipo: 'Camioneta',
            estado: 'mantenimiento',
            kilometraje: '78000',
            asignado_a: ''
        },
        {
            id: '4',
            placa: 'MN-012-OP',
            marca: 'Chevrolet',
            modelo: 'D-Max',
            año: '2023',
            color: 'Blanco',
            tipo: 'Camioneta',
            estado: 'disponible',
            kilometraje: '15000',
            asignado_a: ''
        }
    ];
    
    updateStats();
}

function updateStats() {
    totalVehiclesEl.textContent = vehiclesData.length;
    availableVehiclesEl.textContent = vehiclesData.filter(v => v.estado === 'disponible').length;
    maintenanceVehiclesEl.textContent = vehiclesData.filter(v => v.estado === 'mantenimiento').length;
    assignedVehiclesEl.textContent = vehiclesData.filter(v => v.estado === 'asignado').length;
}

// ==================== SECCIONES DINÁMICAS ====================

function openSection(section) {
    dynamicSection.hidden = false;
    
    switch(section) {
        case 'planilla':
            showPlanillaSection();
            break;
        case 'ficha':
            showFichaSection();
            break;
        case 'acta':
            showActaSection();
            break;
        case 'inspeccion':
            showInspeccionSection();
            break;
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeSection() {
    dynamicSection.hidden = true;
    sectionContent.innerHTML = '';
}

// ==================== SECCIÓN 1: PLANILLA DE DATOS ====================

function showPlanillaSection() {
    sectionTitle.textContent = '📋 Planilla de Datos de Vehículos';
    
    sectionContent.innerHTML = `
        <div class="filters-section">
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" id="searchVehicle" class="search-input" placeholder="Buscar por placa o modelo...">
            </div>
            <button class="btn btn-primary" onclick="openNewVehicleModal()">
                <span class="btn-icon">➕</span>
                <span class="btn-text">Nuevo Vehículo</span>
            </button>
        </div>
        
        <div class="table-section">
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Placa</th>
                            <th>Marca</th>
                            <th>Modelo</th>
                            <th>Año</th>
                            <th>Tipo</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="vehiclesTableBody">
                        ${renderVehiclesTable()}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Agregar listener de búsqueda
    const searchInput = document.getElementById('searchVehicle');
    if (searchInput) {
        searchInput.addEventListener('input', filterVehicles);
    }
}

function renderVehiclesTable() {
    if (vehiclesData.length === 0) {
        return '<tr><td colspan="7" class="loading-text">No hay vehículos registrados</td></tr>';
    }
    
    return vehiclesData.map(v => `
        <tr>
            <td><strong>${v.placa}</strong></td>
            <td>${v.marca}</td>
            <td>${v.modelo}</td>
            <td>${v.año}</td>
            <td>${v.tipo}</td>
            <td><span class="badge badge-${v.estado}">${v.estado}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editVehicle('${v.id}')">✏️</button>
                    <button class="btn-action btn-view" onclick="viewVehicle('${v.id}')">👁️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function filterVehicles() {
    const searchTerm = document.getElementById('searchVehicle').value.toLowerCase();
    const filtered = vehiclesData.filter(v => 
        v.placa.toLowerCase().includes(searchTerm) ||
        v.marca.toLowerCase().includes(searchTerm) ||
        v.modelo.toLowerCase().includes(searchTerm)
    );
    
    document.getElementById('vehiclesTableBody').innerHTML = filtered.map(v => `
        <tr>
            <td><strong>${v.placa}</strong></td>
            <td>${v.marca}</td>
            <td>${v.modelo}</td>
            <td>${v.año}</td>
            <td>${v.tipo}</td>
            <td><span class="badge badge-${v.estado}">${v.estado}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editVehicle('${v.id}')">✏️</button>
                    <button class="btn-action btn-view" onclick="viewVehicle('${v.id}')">👁️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openNewVehicleModal() {
    modalTitle.textContent = '➕ Nuevo Vehículo';
    modalBody.innerHTML = `
        <form id="vehicleForm" class="modal-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Placa</label>
                    <input type="text" id="vPlaca" class="form-input" placeholder="AB-123-CD" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Marca</label>
                    <input type="text" id="vMarca" class="form-input" placeholder="Toyota" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Modelo</label>
                    <input type="text" id="vModelo" class="form-input" placeholder="Hilux" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Año</label>
                    <input type="number" id="vAno" class="form-input" placeholder="2022" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <input type="text" id="vColor" class="form-input" placeholder="Blanco" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo</label>
                    <select id="vTipo" class="form-input" required>
                        <option value="Camioneta">Camioneta</option>
                        <option value="Automóvil">Automóvil</option>
                        <option value="Moto">Moto</option>
                        <option value="Camión">Camión</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Kilometraje</label>
                    <input type="number" id="vKm" class="form-input" placeholder="0" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Estado</label>
                    <select id="vEstado" class="form-input" required>
                        <option value="disponible">Disponible</option>
                        <option value="asignado">Asignado</option>
                        <option value="mantenimiento">Mantenimiento</option>
                    </select>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar Vehículo</button>
            </div>
        </form>
    `;
    
    document.getElementById('vehicleForm').addEventListener('submit', saveVehicle);
    openModal();
}

function saveVehicle(e) {
    e.preventDefault();
    
    const newVehicle = {
        id: Date.now().toString(),
        placa: document.getElementById('vPlaca').value,
        marca: document.getElementById('vMarca').value,
        modelo: document.getElementById('vModelo').value,
        año: document.getElementById('vAno').value,
        color: document.getElementById('vColor').value,
        tipo: document.getElementById('vTipo').value,
        estado: document.getElementById('vEstado').value,
        kilometraje: document.getElementById('vKm').value,
        asignado_a: ''
    };
    
    vehiclesData.push(newVehicle);
    updateStats();
    showPlanillaSection();
    closeModal();
    alert('✅ Vehículo registrado correctamente');
}

function editVehicle(id) {
    const vehicle = vehiclesData.find(v => v.id === id);
    if (!vehicle) return;
    
    modalTitle.textContent = '✏️ Editar Vehículo';
    modalBody.innerHTML = `
        <form id="vehicleForm" class="modal-form">
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Placa</label>
                    <input type="text" id="vPlaca" class="form-input" value="${vehicle.placa}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Marca</label>
                    <input type="text" id="vMarca" class="form-input" value="${vehicle.marca}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Modelo</label>
                    <input type="text" id="vModelo" class="form-input" value="${vehicle.modelo}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Año</label>
                    <input type="number" id="vAno" class="form-input" value="${vehicle.año}" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Color</label>
                    <input type="text" id="vColor" class="form-input" value="${vehicle.color}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo</label>
                    <select id="vTipo" class="form-input" required>
                        <option value="Camioneta" ${vehicle.tipo === 'Camioneta' ? 'selected' : ''}>Camioneta</option>
                        <option value="Automóvil" ${vehicle.tipo === 'Automóvil' ? 'selected' : ''}>Automóvil</option>
                        <option value="Moto" ${vehicle.tipo === 'Moto' ? 'selected' : ''}>Moto</option>
                        <option value="Camión" ${vehicle.tipo === 'Camión' ? 'selected' : ''}>Camión</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">Kilometraje</label>
                    <input type="number" id="vKm" class="form-input" value="${vehicle.kilometraje}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Estado</label>
                    <select id="vEstado" class="form-input" required>
                        <option value="disponible" ${vehicle.estado === 'disponible' ? 'selected' : ''}>Disponible</option>
                        <option value="asignado" ${vehicle.estado === 'asignado' ? 'selected' : ''}>Asignado</option>
                        <option value="mantenimiento" ${vehicle.estado === 'mantenimiento' ? 'selected' : ''}>Mantenimiento</option>
                    </select>
                </div>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Actualizar Vehículo</button>
            </div>
        </form>
    `;
    
    document.getElementById('vehicleForm').addEventListener('submit', (e) => {
        e.preventDefault();
        vehicle.placa = document.getElementById('vPlaca').value;
        vehicle.marca = document.getElementById('vMarca').value;
        vehicle.modelo = document.getElementById('vModelo').value;
        vehicle.año = document.getElementById('vAno').value;
        vehicle.color = document.getElementById('vColor').value;
        vehicle.tipo = document.getElementById('vTipo').value;
        vehicle.kilometraje = document.getElementById('vKm').value;
        vehicle.estado = document.getElementById('vEstado').value;
        
        updateStats();
        showPlanillaSection();
        closeModal();
        alert('✅ Vehículo actualizado correctamente');
    });
    
    openModal();
}

function viewVehicle(id) {
    const vehicle = vehiclesData.find(v => v.id === id);
    if (!vehicle) return;
    
    modalTitle.textContent = '👁️ Ver Vehículo';
    modalBody.innerHTML = `
        <div class="vehicle-details">
            <div class="detail-row"><strong>Placa:</strong> ${vehicle.placa}</div>
            <div class="detail-row"><strong>Marca:</strong> ${vehicle.marca}</div>
            <div class="detail-row"><strong>Modelo:</strong> ${vehicle.modelo}</div>
            <div class="detail-row"><strong>Año:</strong> ${vehicle.año}</div>
            <div class="detail-row"><strong>Color:</strong> ${vehicle.color}</div>
            <div class="detail-row"><strong>Tipo:</strong> ${vehicle.tipo}</div>
            <div class="detail-row"><strong>Kilometraje:</strong> ${vehicle.kilometraje} km</div>
            <div class="detail-row"><strong>Estado:</strong> <span class="badge badge-${vehicle.estado}">${vehicle.estado}</span></div>
            <div class="detail-row"><strong>Asignado a:</strong> ${vehicle.asignado_a || 'No asignado'}</div>
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
        </div>
    `;
    
    openModal();
}

// ==================== SECCIÓN 2: FICHA TÉCNICA ====================

function showFichaSection() {
    sectionTitle.textContent = '🔧 Ficha Técnica';
    
    sectionContent.innerHTML = `
        <div class="filters-section">
            <div class="search-box">
                <span class="search-icon">🔍</span>
                <input type="text" id="searchFicha" class="search-input" placeholder="Buscar vehículo por placa...">
            </div>
        </div>
        
        <div class="ficha-grid">
            ${vehiclesData.map(v => `
                <div class="ficha-card">
                    <div class="ficha-header">
                        <span class="ficha-placa">${v.placa}</span>
                        <span class="badge badge-${v.estado}">${v.estado}</span>
                    </div>
                    <div class="ficha-body">
                        <div class="ficha-item"><strong>Marca:</strong> ${v.marca}</div>
                        <div class="ficha-item"><strong>Modelo:</strong> ${v.modelo}</div>
                        <div class="ficha-item"><strong>Año:</strong> ${v.año}</div>
                        <div class="ficha-item"><strong>Motor:</strong> 3.5L V6</div>
                        <div class="ficha-item"><strong>Transmisión:</strong> Automática</div>
                        <div class="ficha-item"><strong>Tracción:</strong> 4x4</div>
                        <div class="ficha-item"><strong>Combustible:</strong> Gasolina</div>
                        <div class="ficha-item"><strong>Capacidad:</strong> 5 pasajeros</div>
                    </div>
                    <div class="ficha-footer">
                        <button class="btn btn-primary btn-sm" onclick="viewFicha('${v.id}')">Ver Completa</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function viewFicha(id) {
    const vehicle = vehiclesData.find(v => v.id === id);
    if (!vehicle) return;
    
    modalTitle.textContent = `🔧 Ficha Técnica - ${vehicle.placa}`;
    modalBody.innerHTML = `
        <div class="ficha-completa">
            <h3>Datos Generales</h3>
            <div class="detail-row"><strong>Placa:</strong> ${vehicle.placa}</div>
            <div class="detail-row"><strong>Marca:</strong> ${vehicle.marca}</div>
            <div class="detail-row"><strong>Modelo:</strong> ${vehicle.modelo}</div>
            <div class="detail-row"><strong>Año:</strong> ${vehicle.año}</div>
            <div class="detail-row"><strong>Color:</strong> ${vehicle.color}</div>
            
            <h3>Especificaciones Técnicas</h3>
            <div class="detail-row"><strong>Motor:</strong> 3.5L V6</div>
            <div class="detail-row"><strong>Potencia:</strong> 280 HP</div>
            <div class="detail-row"><strong>Transmisión:</strong> Automática 6 velocidades</div>
            <div class="detail-row"><strong>Tracción:</strong> 4x4</div>
            <div class="detail-row"><strong>Combustible:</strong> Gasolina</div>
            <div class="detail-row"><strong>Tanque:</strong> 80 litros</div>
            <div class="detail-row"><strong>Consumo:</strong> 12 km/L</div>
            
            <h3>Dimensiones</h3>
            <div class="detail-row"><strong>Largo:</strong> 5330 mm</div>
            <div class="detail-row"><strong>Ancho:</strong> 1855 mm</div>
            <div class="detail-row"><strong>Alto:</strong> 1815 mm</div>
            <div class="detail-row"><strong>Peso:</strong> 2100 kg</div>
            <div class="detail-row"><strong>Capacidad:</strong> 5 pasajeros</div>
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            <button type="button" class="btn btn-primary" onclick="alert('📄 Imprimiendo ficha técnica...')">🖨️ Imprimir</button>
        </div>
    `;
    
    openModal();
}

// ==================== SECCIÓN 3: ACTA DE ASIGNACIÓN ====================

function showActaSection() {
    sectionTitle.textContent = '📝 Acta de Asignación';
    
    sectionContent.innerHTML = `
        <div class="acta-list">
            <button class="btn btn-primary" onclick="openNewActaModal()" style="margin-bottom: 20px;">
                <span class="btn-icon">➕</span>
                <span class="btn-text">Nueva Acta de Asignación</span>
            </button>
            
            <div class="table-section">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>N° Acta</th>
                                <th>Vehículo</th>
                                <th>Asignado a</th>
                                <th>Fecha</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>ACT-2025-001</td>
                                <td>EF-456-GH</td>
                                <td>Departamento de Operaciones</td>
                                <td>15/01/2025</td>
                                <td><span class="badge badge-active">Activa</span></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-action btn-view" onclick="viewActa()">👁️</button>
                                        <button class="btn-action btn-delete" onclick="closeActa()">🔒</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function openNewActaModal() {
    modalTitle.textContent = '📝 Nueva Acta de Asignación';
    modalBody.innerHTML = `
        <form id="actaForm" class="modal-form">
            <div class="form-group">
                <label class="form-label">Vehículo</label>
                <select id="actaVehiculo" class="form-input" required>
                    ${vehiclesData.filter(v => v.estado === 'disponible').map(v => `
                        <option value="${v.placa}">${v.placa} - ${v.marca} ${v.modelo}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Asignar a</label>
                <input type="text" id="actaAsignado" class="form-input" placeholder="Departamento o Personal" required>
            </div>
            <div class="form-group">
                <label class="form-label">Fecha de Asignación</label>
                <input type="date" id="actaFecha" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Motivo</label>
                <textarea id="actaMotivo" class="form-input" rows="3" placeholder="Describa el motivo de la asignación" required></textarea>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Generar Acta</button>
            </div>
        </form>
    `;
    
    document.getElementById('actaForm').addEventListener('submit', (e) => {
        e.preventDefault();
        closeModal();
        alert('✅ Acta de asignación generada correctamente');
        showActaSection();
    });
    
    openModal();
}

function viewActa() {
    modalTitle.textContent = '📝 Ver Acta de Asignación';
    modalBody.innerHTML = `
        <div class="acta-document">
            <div class="acta-header">
                <h3>REPÚBLICA BOLIVARIANA DE VENEZUELA</h3>
                <h4>Cuerpo de Policía Nacional Bolivariana</h4>
                <h5>ACTA DE ASIGNACIÓN DE VEHÍCULO</h5>
            </div>
            <div class="acta-body">
                <p><strong>N° Acta:</strong> ACT-2025-001</p>
                <p><strong>Fecha:</strong> 15 de Enero de 2025</p>
                <p><strong>Vehículo:</strong> EF-456-GH - Nissan Frontier 2021</p>
                <p><strong>Asignado a:</strong> Departamento de Operaciones</p>
                <p><strong>Motivo:</strong> Servicios operativos de rutina</p>
                <p><strong>Kilometraje inicial:</strong> 62000 km</p>
                <p><strong>Combustible:</strong> 3/4 de tanque</p>
            </div>
            <div class="acta-signatures">
                <div class="signature-box">
                    <p>_________________________</p>
                    <p>Entregado Por</p>
                </div>
                <div class="signature-box">
                    <p>_________________________</p>
                    <p>Recibido Por</p>
                </div>
            </div>
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            <button type="button" class="btn btn-primary" onclick="alert('📄 Imprimiendo acta...')">🖨️ Imprimir</button>
        </div>
    `;
    
    openModal();
}

function closeActa() {
    if (confirm('¿Cerrar esta acta de asignación?')) {
        alert('✅ Acta cerrada correctamente');
        showActaSection();
    }
}

// ==================== SECCIÓN 4: INSPECCIÓN PVR ====================

function showInspeccionSection() {
    sectionTitle.textContent = '🔍 Inspección de PVR Individual';
    
    sectionContent.innerHTML = `
        <div class="inspeccion-list">
            <button class="btn btn-primary" onclick="openNewInspeccionModal()" style="margin-bottom: 20px;">
                <span class="btn-icon">➕</span>
                <span class="btn-text">Nueva Inspección PVR</span>
            </button>
            
            <div class="table-section">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>N° PVR</th>
                                <th>Vehículo</th>
                                <th>Inspector</th>
                                <th>Fecha</th>
                                <th>Resultado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>PVR-2025-001</td>
                                <td>AB-123-CD</td>
                                <td>Oficial Rodríguez</td>
                                <td>14/01/2025</td>
                                <td><span class="badge badge-active">Aprobado</span></td>
                                <td>
                                    <div class="action-buttons">
                                        <button class="btn-action btn-view" onclick="viewInspeccion()">👁️</button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

function openNewInspeccionModal() {
    modalTitle.textContent = '🔍 Nueva Inspección PVR';
    modalBody.innerHTML = `
        <form id="inspeccionForm" class="modal-form">
            <div class="form-group">
                <label class="form-label">Vehículo</label>
                <select id="inspeccionVehiculo" class="form-input" required>
                    ${vehiclesData.map(v => `
                        <option value="${v.placa}">${v.placa} - ${v.marca} ${v.modelo}</option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Inspector</label>
                <input type="text" id="inspeccionInspector" class="form-input" placeholder="Nombre del inspector" required>
            </div>
            <div class="form-group">
                <label class="form-label">Fecha de Inspección</label>
                <input type="date" id="inspeccionFecha" class="form-input" required>
            </div>
            
            <h4 style="margin: 20px 0 10px; color: #003366;">Lista de Verificación</h4>
            
            <div class="checklist">
                <label class="checklist-item">
                    <input type="checkbox" checked> Carrocería (sin daños)
                </label>
                <label class="checklist-item">
                    <input type="checkbox" checked> Pintura (en buen estado)
                </label>
                <label class="checklist-item">
                    <input type="checkbox" checked> Vidrios (sin roturas)
                </label>
                <label class="checklist-item">
                    <input type="checkbox" checked> Luces (funcionando)
                </label>
                <label class="checklist-item">
                    <input type="checkbox" checked> Frenos (correctos)
                </label>
                <label class="checklist-item">
                    <input type="checkbox" checked> Neumáticos (buen estado)
                </label>
                <label class="checklist-item">
                    <input type="checkbox" checked> Motor (sin fallas)
                </label>
                <label class="checklist-item">
                    <input type="checkbox" checked> Documentación (completa)
                </label>
            </div>
            
            <div class="form-group" style="margin-top: 20px;">
                <label class="form-label">Observaciones</label>
                <textarea id="inspeccionObs" class="form-input" rows="3" placeholder="Observaciones adicionales"></textarea>
            </div>
            
            <div class="form-group">
                <label class="form-label">Resultado</label>
                <select id="inspeccionResultado" class="form-input" required>
                    <option value="aprobado">Aprobado</option>
                    <option value="observaciones">Con Observaciones</option>
                    <option value="rechazado">Rechazado</option>
                </select>
            </div>
            
            <div class="modal-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar Inspección</button>
            </div>
        </form>
    `;
    
    document.getElementById('inspeccionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        closeModal();
        alert('✅ Inspección PVR guardada correctamente');
        showInspeccionSection();
    });
    
    openModal();
}

function viewInspeccion() {
    modalTitle.textContent = '🔍 Ver Inspección PVR';
    modalBody.innerHTML = `
        <div class="inspeccion-document">
            <div class="acta-header">
                <h3>INSPECCIÓN FÍSICA VEHICULAR (PVR)</h3>
                <p>N° PVR-2025-001</p>
            </div>
            <div class="acta-body">
                <p><strong>Vehículo:</strong> AB-123-CD - Toyota Hilux 2022</p>
                <p><strong>Inspector:</strong> Oficial Rodríguez</p>
                <p><strong>Fecha:</strong> 14 de Enero de 2025</p>
                <p><strong>Kilometraje:</strong> 45000 km</p>
            </div>
            <h4>Lista de Verificación</h4>
            <div class="checklist-result">
                <div class="check-item ✅">✅ Carrocería</div>
                <div class="check-item ✅">✅ Pintura</div>
                <div class="check-item ✅">✅ Vidrios</div>
                <div class="check-item ✅">✅ Luces</div>
                <div class="check-item ✅">✅ Frenos</div>
                <div class="check-item ✅">✅ Neumáticos</div>
                <div class="check-item ✅">✅ Motor</div>
                <div class="check-item ✅">✅ Documentación</div>
            </div>
            <p><strong>Resultado:</strong> <span class="badge badge-active">APROBADO</span></p>
            <p><strong>Observaciones:</strong> Sin novedades. Vehículo en óptimas condiciones.</p>
        </div>
        <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cerrar</button>
            <button type="button" class="btn btn-primary" onclick="alert('📄 Imprimiendo PVR...')">🖨️ Imprimir</button>
        </div>
    `;
    
    openModal();
}

// ==================== MODALES ====================

function openModal() {
    formModal.hidden = false;
    formModal.classList.add('active');
    formModal.style.display = 'flex';
}

function closeModal() {
    formModal.hidden = true;
    formModal.classList.remove('active');
    formModal.style.display = 'none';
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadVehiclesData();
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    if (modalClose) modalClose.addEventListener('click', closeModal);
    
    if (formModal) {
        formModal.addEventListener('click', (e) => {
            if (e.target === formModal) closeModal();
        });
    }
    
    console.log('✅ Módulo de Transporte inicializado');
});

// Funciones globales
window.openSection = openSection;
window.closeSection = closeSection;
window.openNewVehicleModal = openNewVehicleModal;
window.editVehicle = editVehicle;
window.viewVehicle = viewVehicle;
window.viewFicha = viewFicha;
window.openNewActaModal = openNewActaModal;
window.viewActa = viewActa;
window.closeActa = closeActa;
window.openNewInspeccionModal = openNewInspeccionModal;
window.viewInspeccion = viewInspeccion;
window.closeModal = closeModal;
