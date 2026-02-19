/**
 * GESTIÓN DE USUARIOS Y PERMISOS
 */
const supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);

let usuarioActual = null;
let roles = [];
let modulos = [];
let botones = [];
let permisos = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando gestión de usuarios...');
    
    // Verificar que es administrador
    const autorizado = await RBAC.protegerPagina('gestion-usuarios.html');
    if (!autorizado) return;
    
    await cargarDatosIniciales();
    cargarUsuarios();
    cargarRoles();
    setupEventListeners();
    mostrarInfoUsuario();
});

async function cargarDatosIniciales() {
    await cargarRolesDB();
    await cargarModulos();
    await cargarBotones();
    await cargarPermisosDB();
}

async function cargarRolesDB() {
    const { data, error } = await supabaseClient.from('roles').select('*');
    if (!error && data) roles = data;
}

async function cargarModulos() {
    const { data, error } = await supabaseClient.from('modulos').select('*').order('orden');
    if (!error && data) modulos = data;
}

async function cargarBotones() {
    const { data, error } = await supabaseClient.from('botones').select('*, modulos(nombre)').order('orden');
    if (!error && data) botones = data;
}

async function cargarPermisosDB() {
    const { data, error } = await supabaseClient.from('permisos').select('*, roles(nombre), botones(nombre)');
    if (!error && data) permisos = data;
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
    
    if (tabName === 'permisos') {
        cargarPermisosRol();
    }
}

async function cargarUsuarios() {
    const tbody = document.getElementById('usuariosTableBody');
    
    const { data, error } = await supabaseClient
        .from('perfiles')
        .select('*, roles(nombre)')
        .order('creado_en', { ascending: false });
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #dc2626;">Error: ${error.message}</td></tr>`;
        return;
    }
    
    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #666;">No hay usuarios registrados</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.map(user => `
        <tr>
            <td>${user.email || 'N/A'}</td>
            <td>${user.nombre || 'N/A'}</td>
            <td><span class="role-badge role-${user.roles?.nombre || 'consultor'}">${user.roles?.nombre || 'Sin rol'}</span></td>
            <td>${user.activo ? '✅ Activo' : '❌ Inactivo'}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editarUsuario('${user.id}')">✏️</button>
                ${user.id !== usuarioActual?.id ? `<button class="btn-action btn-delete" onclick="eliminarUsuario('${user.id}')">🗑️</button>` : ''}
            </td>
        </tr>
    `).join('');
}

async function cargarPermisosRol() {
    const rolSeleccionado = document.getElementById('selectRolPermisos').value;
    const container = document.getElementById('permisosContainer');
    
    if (!rolSeleccionado) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #666;">Seleccione un rol para configurar sus permisos</div>`;
        return;
    }
    
    const rol = roles.find(r => r.nombre === rolSeleccionado);
    if (!rol) return;
    
    const permisosRol = permisos.filter(p => p.rol_id === rol.id);
    
    container.innerHTML = modulos.map(modulo => {
        const botonesModulo = botones.filter(b => b.modulo_id === modulo.id);
        if (botonesModulo.length === 0) return '';
        
        return `
            <div class="permiso-card">
                <div class="permiso-header">
                    <span class="permiso-icon">${modulo.icono || '📁'}</span>
                    <h3 class="permiso-title">${modulo.nombre}</h3>
                </div>
                <div class="permiso-botones">
                    ${botonesModulo.map(boton => {
                        const permiso = permisosRol.find(p => p.boton_id === boton.id);
                        return `
                            <div class="permiso-item">
                                <div class="permiso-item-info">
                                    <span class="permiso-item-icon">${boton.icono || '📄'}</span>
                                    <span class="permiso-item-name">${boton.nombre}</span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" 
                                        ${permiso?.puede_ver ? 'checked' : ''} 
                                        onchange="actualizarPermiso('${rol.id}', '${boton.id}', 'puede_ver', this.checked)">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }).join('');
}

async function actualizarPermiso(rolId, botonId, tipoPermiso, valor) {
    try {
        const existe = permisos.find(p => p.rol_id === rolId && p.boton_id === botonId);
        
        if (existe) {
            await supabaseClient.from('permisos').update({ [tipoPermiso]: valor }).eq('id', existe.id);
        } else {
            await supabaseClient.from('permisos').insert([{
                rol_id: rolId,
                boton_id: botonId,
                puede_ver: valor,
                puede_crear: false,
                puede_editar: false,
                puede_eliminar: false
            }]);
        }
        
        await cargarPermisosDB();
        showAlert('success', 'Permiso actualizado correctamente');
    } catch (error) {
        showAlert('error', 'Error: ' + error.message);
    }
}

async function cargarRoles() {
    const tbody = document.getElementById('rolesTableBody');
    const { data, error } = await supabaseClient.from('roles').select('*');
    
    if (error) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #dc2626;">Error</td></tr>`;
        return;
    }
    
    tbody.innerHTML = data.map(rol => `
        <tr>
            <td><span class="role-badge role-${rol.nombre}">${rol.nombre}</span></td>
            <td>${rol.descripcion || 'N/A'}</td>
            <td>-</td>
        </tr>
    `).join('');
}

function openModal(tipo) {
    document.getElementById(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(tipo) {
    document.getElementById(`modal${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`).style.display = 'none';
    document.body.style.overflow = 'auto';
}

function setupEventListeners() {
    document.getElementById('formUsuario')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarUsuario();
    });
    
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = '../../index.html';
    });
    
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
}

async function guardarUsuario() {
    const email = document.getElementById('usuarioEmail').value;
    const nombre = document.getElementById('usuarioNombre').value;
    const rol = document.getElementById('usuarioRol').value;
    const password = document.getElementById('usuarioPassword').value;
    const activo = document.getElementById('usuarioActivo').value === 'true';
    
    if (!email || !rol) {
        showAlert('error', 'Email y rol son obligatorios');
        return;
    }
    
    try {
        const {  userData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: email,
            password: password || 'Cambio123',
            email_confirm: true
        });
        
        if (authError) throw authError;
        
        const rolData = roles.find(r => r.nombre === rol);
        
        await supabaseClient.from('perfiles').insert([{
            id: userData.user.id,
            email: email,
            nombre: nombre,
            rol_id: rolData?.id,
            activo: activo
        }]);
        
        showAlert('success', 'Usuario creado exitosamente');
        closeModal('usuario');
        cargarUsuarios();
    } catch (error) {
        showAlert('error', 'Error: ' + error.message);
    }
}

function editarUsuario(id) {
    openModal('usuario');
    document.getElementById('modalUsuarioTitle').textContent = 'Editar Usuario';
    document.getElementById('usuarioId').value = id;
}

async function eliminarUsuario(id) {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;
    
    try {
        await supabaseClient.from('perfiles').delete().eq('id', id);
        showAlert('success', 'Usuario eliminado exitosamente');
        cargarUsuarios();
    } catch (error) {
        showAlert('error', 'Error: ' + error.message);
    }
}

function showAlert(type, message) {
    const alertSuccess = document.getElementById('alertSuccess');
    const alertError = document.getElementById('alertError');
    
    alertSuccess.style.display = 'none';
    alertError.style.display = 'none';
    
    if (type === 'success') {
        document.getElementById('successMessage').textContent = message;
        alertSuccess.style.display = 'flex';
        setTimeout(() => alertSuccess.style.display = 'none', 3000);
    } else {
        document.getElementById('errorMessage').textContent = message;
        alertError.style.display = 'flex';
        setTimeout(() => alertError.style.display = 'none', 3000);
    }
}
