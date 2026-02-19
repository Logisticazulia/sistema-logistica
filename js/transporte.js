/**
 * MÓDULO DE TRANSPORTE - PÁGINA PRINCIPAL
 */

const SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const LOGIN_URL = 'https://logisticazulia.github.io/sistema-logistica/index.html';

const userEmailElement = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');
const totalVehiclesEl = document.getElementById('totalVehicles');
const availableVehiclesEl = document.getElementById('availableVehicles');
const maintenanceVehiclesEl = document.getElementById('maintenanceVehicles');
const assignedVehiclesEl = document.getElementById('assignedVehicles');

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

function loadStats() {
    // Datos de ejemplo
    const vehicles = [
        { estado: 'disponible' },
        { estado: 'asignado' },
        { estado: 'mantenimiento' },
        { estado: 'disponible' }
    ];
    
    totalVehiclesEl.textContent = vehicles.length;
    availableVehiclesEl.textContent = vehicles.filter(v => v.estado === 'disponible').length;
    maintenanceVehiclesEl.textContent = vehicles.filter(v => v.estado === 'mantenimiento').length;
    assignedVehiclesEl.textContent = vehicles.filter(v => v.estado === 'asignado').length;
}

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    loadStats();
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    console.log('✅ Transporte - Página principal cargada');
});
