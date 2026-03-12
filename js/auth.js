let currentTab = 'user';

function switchTab(tab) {
  currentTab = tab;
  
  // Update UI tabs
  document.getElementById('tab-user').className = `tab-btn w-1/2 pb-3 font-medium ${tab === 'user' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 border-b-2 border-transparent'}`;
  document.getElementById('tab-admin').className = `tab-btn w-1/2 pb-3 font-medium ${tab === 'admin' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 border-b-2 border-transparent'}`;
  
  // Update inputs
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('error-msg').classList.add('hidden');
  
  // Update hint text
  const hint = document.getElementById('user-hint');
  if (tab === 'admin') {
    hint.classList.add('hidden');
  } else {
    hint.classList.remove('hidden');
  }
}

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const errorMsg = document.getElementById('error-msg');
  
  if (!username || !password) return;
  
  // Loading state
  btn.innerHTML = '<div class="spinner border-white border-t-transparent mx-auto"></div>';
  btn.disabled = true;
  errorMsg.classList.add('hidden');
  
  try {
    const result = await apiRequest('login', { username, password, role: currentTab });
    
    if (result.status === 'success') {
      sessionStorage.setItem('session', JSON.stringify({
        username: result.username,
        role: result.role
      }));
      
      window.location.href = result.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
    } else {
      showError(result.message || 'Login failed. Please verify credentials.');
    }
  } catch (err) {
    showError(err.message || 'API Connection Error.');
  } finally {
    // Reset button
    btn.innerHTML = '<span>Sign In</span><i class="ph ph-arrow-right ml-2 text-lg"></i>';
    btn.disabled = false;
  }
});

function showError(msg) {
  const errorMsg = document.getElementById('error-msg');
  errorMsg.textContent = msg;
  errorMsg.classList.remove('hidden');
}

// Session check utility for other pages
function checkSession(requiredRole = null) {
  const sessionData = sessionStorage.getItem('session');
  if (!sessionData) {
    window.location.href = 'index.html';
    return null;
  }
  
  const session = JSON.parse(sessionData);
  
  if (requiredRole && session.role !== requiredRole) {
    window.location.href = 'index.html';
    return null;
  }
  
  return session;
}

function handleLogout() {
  sessionStorage.removeItem('session');
  window.location.href = 'index.html';
}

// Check on load for login page
if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
  const existingSession = sessionStorage.getItem('session');
  if (existingSession) {
    const session = JSON.parse(existingSession);
    window.location.href = session.role === 'admin' ? 'admin-dashboard.html' : 'user-dashboard.html';
  }
}
