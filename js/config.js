/**
 * ========================================
 * CONFIGURACIÓN GLOBAL DEL SISTEMA
 * ========================================
 */

// Reemplaza con tus credenciales reales de Supabase
window.SUPABASE_URL = 'https://wwrknqfyjelwbvfnfshq.supabase.co';
window.SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cmtucWZ5amVsd2J2Zm5mc2hxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNjAzMjIsImV4cCI6MjA4NjkzNjMyMn0.C7CmscpqBo5nuNbfvZCTQ9WlVT771maF1BFdEkhkzuQ';

console.log('✅ Configuración cargada');

if (typeof window.supabase !== 'undefined') {
  window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );
}
