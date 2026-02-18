/**
 * ========================================
 * SISTEMA LOGÍSTICA - GESTIÓN DE USUARIOS
 * ========================================
 * Administración de usuarios del sistema
 */

// ==================== CONFIGURACIÓN ====================
const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// URLs para GitHub Pages
const LOGIN_URL = 'https://logisticazulia.github.io/sistema-logistica/index.html';
const DASHBOARD_URL = 'https://logisticazulia.github.io/sistema-logistica/dashboard.html';

// ==================== REFERENCIAS AL DOM ====================
const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const btnNewUser = document.getElementById('btnNewUser');
const usersTableBody = document.getElementById('usersTableBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchUser');
const filterRole = document.getElementById('filterRole');

// Estadísticas
const totalUsersEl = document.getElementById('totalUsers');
const activeUsersEl = document.getElementById('activeUsers');
const inactiveUsersEl = document.getElementById('inactiveUsers');
const adminUsersEl = document.getElementById('adminUsers');

// Modal Nuevo/Editar Usuario
const userModal = document.getElementById('userModal');
const modalTitle = document.getElementById('modalTitle');
const userForm = document.getElementById('userForm');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalSubmit = document.getElementById('modalSubmit');

// Inputs del formulario
const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmail');
const userPasswordInput = document.getElementById('userPassword');
const userRoleInput = document.getElementById('userRole');
const userStatusInput = document.getElementById('userStatus');

// Modal Eliminar
const deleteModal = document.getElementById('deleteModal');
const deleteModalClose = document.getElementById('deleteModalClose');
const deleteCancel = document.getElementById('deleteCancel');
const deleteConfirm = document.getElementById('deleteConfirm');
const deleteUserName = document.getElementById('deleteUserName');

// Estado global
let allUsers = [];
let userToDelete = null;
let editingUserId = null;

// ==================== FUNCIONES DE SEGURIDAD ====================

async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (!session || error) {
        console.log('❌ No hay sesión activa, redirigiendo al login...');
        window.location.href = LOGIN_URL;
        return;
    }
    
    userEmailElement.textContent = session.user.email;
    console.log('✅ Sesión activa para:', session.user.email);
}

async function handleLogout() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            alert('Error al cerrar sesión: ' + error.message);
            return;
        }
        window.location.href = LOGIN_URL;
    } catch (error) {
        console.error('Error en logout:', error);
        alert('Ocurrió un error al cerrar sesión');
    }
}

// ==================== FUNCIONES DE USUARIOS ====================

/**
 * Carga todos los usuarios desde Supabase
 */
async function loadUsers() {
    try {
        // Nota: Supabase Auth no permite listar usuarios desde el frontend directamente
        // En producción, usarías una Edge Function o tabla de perfiles
        
        // Simulamos datos para demostración (reemplazar con llamada real)
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        // Datos de ejemplo (en producción vendrían de una tabla de perfiles)
        allUsers = [
            {
                id: '1',
                name: 'Administrador Principal',
                email: session?.user?.email || 'admin@institucion.com',
                role: 'admin',
                status: 'active',
                created_at: new Date().toISOString()
            }
            // Agrega más usuarios de ejemplo según necesites
        ];
        
        renderUsers(allUsers);
        updateStats();
        
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="loading-text">❌ Error cargando usuarios</td>
            </tr>
        `;
    }
}

/**
 * Renderiza la tabla de usuarios
 */
function renderUsers(users) {
    if (users.length === 0) {
        usersTableBody.parentElement.hidden = true;
        emptyState.hidden = false;
        return;
    }
    
    usersTableBody.parentElement.hidden = false;
    emptyState.hidden = true;
    
    usersTableBody.innerHTML = users.map(user => `
        <tr data-user-id="${user.id}">
            <td>
                <div class="user-info">
                    <strong>${user.name || 'Sin nombre'}</strong>
                </div>
            </td>
            <td>${user.email}</td>
            <td>
                <span class="badge badge-${user.role}">${user.role}</span>
            </td>
            <td>
                <span class="badge badge-${user.status}">${user.status === 'active' ? 'Activo' : 'Inactivo'}</span>
            </td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-edit" onclick="editUser('${user.id}')">✏️ Editar</button>
                    <button class="btn-action btn-delete" onclick="confirmDelete('${user.id}', '${user.name || user.email}')">🗑️ Eliminar</button>
                </div>
            </td>
        </tr>
    `).join('');
}

/**
 * Actualiza las estadísticas
 */
function updateStats() {
    totalUsersEl.textContent = allUsers.length;
    activeUsersEl.textContent = allUsers.filter(u => u.status === 'active').length;
    inactiveUsersEl.textContent = allUsers.filter(u => u.status === 'inactive').length;
    adminUsersEl.textContent = allUsers.filter(u => u.role === 'admin').length;
}

/**
 * Filtra usuarios por búsqueda y rol
 */
function filterUsers() {
    const searchTerm = searchInput.value.toLowerCase();
    const roleFilter = filterRole.value;
    
    const filtered = allUsers.filter(user => {
        const matchesSearch = user.email.toLowerCase().includes(searchTerm) ||
                            (user.name && user.name.toLowerCase().includes(searchTerm));
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        
        return matchesSearch && matchesRole;
    });
    
    renderUsers(filtered);
}

/**
 * Abre el modal para nuevo usuario
 */
function openNewUserModal() {
    editingUserId = null;
    modalTitle.textContent = '➕ Nuevo Usuario';
    userForm.reset();
    userPasswordInput.required = true;
   userModal.classList.remove('active');
    
}

/**
 * Abre el modal para editar usuario
 */
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    editingUserId = userId;
    modalTitle.textContent = '✏️ Editar Usuario';
    
    userNameInput.value = user.name || '';
    userEmailInput.value = user.email;
    userRoleInput.value = user.role;
    userStatusInput.value = user.status;
    userPasswordInput.required = false;
    userPasswordInput.placeholder = 'Dejar vacío para mantener la actual';
    
    userModal.hidden = false;
}

/**
 * Confirma eliminación de usuario
 */
function confirmDelete(userId, userName) {
    userToDelete = userId;
    deleteUserName.textContent = userName;
    deleteModal.hidden = false;
}

/**
 * Elimina un usuario
 */
async function deleteUser() {
    if (!userToDelete) return;
    
    try {
        // En producción: await supabaseClient.auth.admin.deleteUser(userToDelete);
        allUsers = allUsers.filter(u => u.id !== userToDelete);
        renderUsers(allUsers);
        updateStats();
        
        deleteModal.hidden = false;
        alert('✅ Usuario eliminado correctamente');
        
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('❌ Error al eliminar usuario: ' + error.message);
    }
    
    userToDelete = null;
}

/**
 * Guarda un usuario (nuevo o editado)
 */
async function saveUser(e) {
    e.preventDefault();
    
    const userData = {
        name: userNameInput.value.trim(),
        email: userEmailInput.value.trim(),
        role: userRoleInput.value,
        status: userStatusInput.value,
        password: userPasswordInput.value
    };
    
    try {
        if (editingUserId) {
            // Editar usuario existente
            // En producción: actualizar en Supabase
            const index = allUsers.findIndex(u => u.id === editingUserId);
            if (index !== -1) {
                allUsers[index] = { ...allUsers[index], ...userData };
            }
            alert('✅ Usuario actualizado correctamente');
        } else {
            // Crear nuevo usuario
            // En producción: await supabaseClient.auth.signUp({...})
            const newUser = {
                id: Date.now().toString(),
                ...userData,
                created_at: new Date().toISOString()
            };
            allUsers.push(newUser);
            alert('✅ Usuario creado correctamente');
        }
        
        userModal.hidden = true;
        renderUsers(allUsers);
        updateStats();
        
    } catch (error) {
        console.error('Error guardando usuario:', error);
        alert('❌ Error al guardar usuario: ' + error.message);
    }
}

/**
 * Formatea fecha para mostrar
 */
function formatDate(dateString) {
    if (!dateString) return '--/--/----';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
}

// ==================== EVENT LISTENERS ====================

// Cerrar sesión
logoutBtn.addEventListener('click', handleLogout);

// Nuevo usuario
btnNewUser.addEventListener('click', openNewUserModal);

// Cerrar modales
modalClose.addEventListener('click', () => userModal.hidden = true);
modalCancel.addEventListener('click', () => userModal.hidden = true);
deleteModalClose.addEventListener('click', () => deleteModal.hidden = true);
deleteCancel.addEventListener('click', () => deleteModal.hidden = true);

// Guardar usuario
userForm.addEventListener('submit', saveUser);

// Confirmar eliminación
deleteConfirm.addEventListener('click', deleteUser);

// Filtros
searchInput.addEventListener('input', filterUsers);
filterRole.addEventListener('change', filterUsers);

// Cerrar modal al hacer clic fuera
userModal.addEventListener('click', (e) => {
    if (e.target === userModal) userModal.hidden = true;
});

deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) deleteModal.hidden = true;
});

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadUsers();
    console.log('✅ Módulo de Usuarios inicializado');
});

// Hacer funciones globales para los onclick del HTML
window.editUser = editUser;
window.confirmDelete = confirmDelete;
