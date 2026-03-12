let session = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  session = checkSession('user');
  if (!session) return;
  
  // Set UI data
  document.getElementById('welcome-name').textContent = session.username;
  document.getElementById('user-avatar').textContent = session.username.charAt(0).toUpperCase();
  
  loadHistory();
  
  // Form listener
  document.getElementById('query-form').addEventListener('submit', handleQuerySubmit);
});

async function handleQuerySubmit(e) {
  e.preventDefault();
  
  const queryText = document.getElementById('query-text').value;
  if (!queryText) return;
  
  const btn = e.target.querySelector('button[type="submit"]');
  btn.disabled = true;
  
  // Show modal and start animation
  const modal = document.getElementById('progress-modal');
  modal.classList.add('active');
  
  document.getElementById('state-analyzing').classList.remove('hidden');
  document.getElementById('state-success').classList.add('hidden');
  document.getElementById('state-error').classList.add('hidden');
  
  const progressBar = document.getElementById('progress-bar');
  // Simulate progress
  requestAnimationFrame(() => {
    progressBar.style.width = '10%';
    setTimeout(() => { progressBar.style.width = '40%'; }, 500);
    setTimeout(() => { progressBar.style.width = '70%'; }, 1500);
    setTimeout(() => { progressBar.style.width = '90%'; }, 2500);
  });
  
  try {
    const result = await apiRequest('submitQuery', { 
      username: session.username, 
      query: queryText 
    });
    
    // Complete progress
    progressBar.style.width = '100%';
    
    setTimeout(() => {
      document.getElementById('state-analyzing').classList.add('hidden');
      if (result.status === 'success') {
        document.getElementById('state-success').classList.remove('hidden');
        document.getElementById('result-category').textContent = result.category;
        
        // Dynamic badge color
        const badge = document.getElementById('result-category');
        badge.className = 'badge ' + getCategoryBadgeClass(result.category);
        
        document.getElementById('result-confidence').textContent = `${result.confidence}%`;
        
        // Reset form and reload history
        e.target.reset();
        loadHistory();
        
        // Auto dismiss success
        setTimeout(() => closeModal(), 3500);
      } else {
        document.getElementById('state-error').classList.remove('hidden');
        document.getElementById('error-text').textContent = result.message || 'Server error';
      }
      btn.disabled = false;
    }, 600); // Wait for bar to hit 100%
    
  } catch (err) {
    progressBar.style.width = '100%';
    document.getElementById('state-analyzing').classList.add('hidden');
    document.getElementById('state-error').classList.remove('hidden');
    document.getElementById('error-text').textContent = err.message;
    btn.disabled = false;
  }
}

function closeModal() {
  const modal = document.getElementById('progress-modal');
  modal.classList.remove('active');
  document.getElementById('progress-bar').style.width = '0%';
}

async function loadHistory() {
  const tbody = document.getElementById('history-tbody');
  
  try {
    const result = await apiRequest('getQueries', { username: session.username });
    
    if (result.status === 'success') {
      const queries = result.data;
      
      if (queries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">No queries found. Submit one above!</td></tr>`;
        return;
      }
      
      tbody.innerHTML = queries.map(q => {
        const date = new Date(q.timestamp).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        const shortId = q.id.split('-')[0];
        const statusClass = q.status === 'resolved' ? 'status-resolved' : 'status-pending';
        const badgeClass = getCategoryBadgeClass(q.category);
        
        return `
          <tr>
            <td class="font-medium text-gray-900 overflow-hidden text-ellipsis whitespace-nowrap align-middle" style="max-width: 100px;">
              <span class="text-xstext-gray-500 font-mono bg-gray-100 p-1 rounded border border-gray-200" title="${q.id}">#${shortId}</span>
            </td>
            <td class="align-middle">
              <div class="truncate text-gray-800" title="${q.query}">${q.query}</div>
            </td>
            <td class="align-middle"><span class="badge ${badgeClass}">${q.category}</span></td>
            <td class="align-middle">
              <div class="flex items-center gap-2">
                <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div class="h-full bg-primary rounded-full transition-all" style="width: ${q.confidence}%"></div>
                </div>
                <span class="text-xs font-medium text-gray-500">${q.confidence}%</span>
              </div>
            </td>
            <td class="align-middle"><span class="status-badge cursor-default ${statusClass} capitalize">${q.status}</span></td>
            <td class="align-middle text-sm text-gray-500">${date}</td>
          </tr>
        `;
      }).join('');
      
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-error">Failed to load history</td></tr>`;
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-error">${err.message}</td></tr>`;
  }
}

function getCategoryBadgeClass(cat) {
  if (cat === 'Billing') return 'badge-billing';
  if (cat === 'Technical Support') return 'badge-tech';
  if (cat === 'Account') return 'badge-account';
  if (cat === 'Feedback') return 'badge-feedback';
  return 'badge-general';
}
