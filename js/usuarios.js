/**
 * ========================================
 * SISTEMA LOGÍSTICA - GESTIÓN DE USUARIOS
 * ========================================
 */

// ==================== CONFIGURACIÓN ====================
const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const LOGIN_URL = 'https://logisticazulia.github.io/sistema-logistica/index.html';

// ==================== REFERENCIAS AL DOM ====================
const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const btnNewUser = document.getElementById('btnNewUser');
const usersTableBody = document.getElementById('usersTableBody');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchUser');
const filterRole = document.getElementById('filterRole');

const totalUsersEl = document.getElementById('totalUsers');
const activeUsersEl = document.getElementById('activeUsers');
const inactiveUsersEl = document.getElementById('inactiveUsers');
const adminUsersEl = document.getElementById('adminUsers');

const userModal = document.getElementById('userModal');
const modalTitle = document.getElementById('modalTitle');
const userForm = document.getElementById('userForm');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');

const userNameInput = document.getElementById('userName');
const userEmailInput = document.getElementById('userEmailForm');
const userPasswordInput = document.getElementById('userPassword');
const userRoleInput = document.getElementById('userRole');
const userStatusInput = document.getElementById('userStatus');

const deleteModal = document.getElementById('deleteModal');
const deleteModalClose = document.getElementById('deleteModalClose');
const deleteCancel = document.getElementById('deleteCancel');
const deleteConfirm = document.getElementById('deleteConfirm');
const deleteUserName = document.getElementById('deleteUserName');

let allUsers = [];
let userToDelete = null;
let editingUserId = null;

// ==================== SEGURIDAD ====================

async function checkSession() {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
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

// ==================== FUNCIONES PRINCIPALES ====================

async function loadUsers() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // Datos de ejemplo
    allUsers = [
        {
            id: '1',
            name: 'Administrador Principal',
            email: session?.user?.email || 'admin@institucion.com',
            role: 'admin',
            status: 'active',
            created_at: new Date().toISOString()
        },
        {
            id: '2',
            name: 'Juan Pérez',
            email: 'juan.perez@institucion.com',
            role: 'user',
            status: 'active',
            created_at: new Date('2025-01-10').toISOString()
        },
        {
            id: '3',
            name: 'María González',
            email: 'maria.gonzalez@institucion.com',
            role: 'user',
            status: 'inactive',
            created_at: new Date('2025-01-08').toISOString()
        }
    ];
    
    renderUsers(allUsers);
    updateStats();
}

function renderUsers(users) {
    if (users.length === 0) {
        if (usersTableBody.parentElement) usersTableBody.parentElement.hidden = true;
        emptyState.hidden = false;
        return;
    }
    
    if (usersTableBody.parentElement) usersTableBody.parentElement.hidden = false;
    emptyState.hidden = true;
    
    usersTableBody.innerHTML = users.map(user => `
        <tr data-user-id="${user.id}">
            <td><strong>${user.name || 'Sin nombre'}</strong></td>
            <td>${user.email}</td>
            <td><span class="badge badge-${user.role}">${user.role}</span></td>
            <td><span class="badge badge-${user.status}">${user.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
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

function updateStats() {
    totalUsersEl.textContent = allUsers.length;
    activeUsersEl.textContent = allUsers.filter(u => u.status === 'active').length;
    inactiveUsersEl.textContent = allUsers.filter(u => u.status === 'inactive').length;
    adminUsersEl.textContent = allUsers.filter(u => u.role === 'admin').length;
}

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

// ==================== MODALES ====================

function openNewUserModal() {
    editingUserId = null;
    modalTitle.textContent = '➕ Nuevo Usuario';
    userForm.reset();
    userPasswordInput.required = true;
    userModal.hidden = false;
    userModal.classList.add('active');
}

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
    userModal.classList.add('active');
}

function confirmDelete(userId, userName) {
    userToDelete = userId;
    deleteUserName.textContent = userName;
    deleteModal.hidden = false;
    deleteModal.classList.add('active');
}

function deleteUser() {
    if (!userToDelete) return;
    
    allUsers = allUsers.filter(u => u.id !== userToDelete);
    renderUsers(allUsers);
    updateStats();
    
    closeModal(deleteModal);
    userToDelete = null;
}

function saveUser(e) {
    e.preventDefault();
    
    const userData = {
        name: userNameInput.value.trim(),
        email: userEmailInput.value.trim(),
        role: userRoleInput.value,
        status: userStatusInput.value,
        password: userPasswordInput.value
    };
    
    if (editingUserId) {
        const index = allUsers.findIndex(u => u.id === editingUserId);
        if (index !== -1) {
            allUsers[index] = { ...allUsers[index], ...userData };
        }
    } else {
        const newUser = {
            id: Date.now().toString(),
            ...userData,
            created_at: new Date().toISOString()
        };
        allUsers.push(newUser);
    }
    
    closeModal(userModal);
    renderUsers(allUsers);
    updateStats();
}

function closeModal(modal) {
    if (!modal) return;
    modal.hidden = true;
    modal.classList.remove('active');
}

function formatDate(dateString) {
    if (!dateString) return '--/--/----';
    return new Date(dateString).toLocaleDateString('es-ES');
}

// ==================== EVENT LISTENERS ====================

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadUsers();
    
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (btnNewUser) btnNewUser.addEventListener('click', openNewUserModal);
    
    if (modalClose) modalClose.addEventListener('click', () => closeModal(userModal));
    if (modalCancel) modalCancel.addEventListener('click', () => closeModal(userModal));
    if (deleteModalClose) deleteModalClose.addEventListener('click', () => closeModal(deleteModal));
    if (deleteCancel) deleteCancel.addEventListener('click', () => closeModal(deleteModal));
    if (deleteConfirm) deleteConfirm.addEventListener('click', deleteUser);
    
    if (userForm) userForm.addEventListener('submit', saveUser);
    
    if (searchInput) searchInput.addEventListener('input', filterUsers);
    if (filterRole) filterRole.addEventListener('change', filterUsers);
    
    if (userModal) {
        userModal.addEventListener('click', (e) => {
            if (e.target === userModal) closeModal(userModal);
        });
    }
    
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) closeModal(deleteModal);
        });
    }
});

// Funciones globales
window.editUser = editUser;
window.confirmDelete = confirmDelete;
