let allQueriesData = [];

document.addEventListener('DOMContentLoaded', () => {
  const session = checkSession('admin');
  if (!session) return;
  
  refreshAdminData();
});

function switchAdminTab(tab) {
  if (tab === 'dashboard') {
    document.getElementById('view-dashboard').classList.remove('hidden');
    document.getElementById('view-queries').classList.add('hidden');
    document.getElementById('header-title').textContent = 'Dashboard Overview';
  } else {
    document.getElementById('view-dashboard').classList.add('hidden');
    document.getElementById('view-queries').classList.remove('hidden');
    document.getElementById('header-title').textContent = 'All Queries';
  }
}

async function refreshAdminData() {
  document.getElementById('global-spinner').classList.remove('hidden');
  
  try {
    // Parallel Fetch
    const [statsResult, queriesResult] = await Promise.all([
      apiRequest('getStats'),
      apiRequest('getQueries')
    ]);
    
    if (statsResult.status === 'success') {
      updateStats(statsResult);
    }
    
    if (queriesResult.status === 'success') {
      allQueriesData = queriesResult.data;
      renderTableData(allQueriesData, 'all-queries-tbody');
      
      // Render top 5 pending for the dashboard table
      const pending = allQueriesData.filter(q => q.status === 'pending').slice(0, 5);
      renderTableData(pending, 'recent-pending-tbody');
    }
  } catch (err) {
    console.error("Failed to load admin data", err);
    alert("Error loading admin data. Check console.");
  } finally {
    document.getElementById('global-spinner').classList.add('hidden');
  }
}

function updateStats(data) {
  document.getElementById('stat-total').textContent = data.totalQueries;
  document.getElementById('stat-rate').textContent = `${data.resolutionRate}%`;
  
  const cats = data.categories;
  document.getElementById('stat-billing').textContent = cats['Billing'] || 0;
  document.getElementById('stat-tech').textContent = cats['Technical Support'] || 0;
  
  // Build CSS Charts
  const chartContainer = document.getElementById('analytics-charts');
  
  if (data.totalQueries === 0) {
    chartContainer.innerHTML = '<p class="text-sm text-gray-500">No data available yet.</p>';
    return;
  }
  
  const colors = {
    'Billing': 'var(--cat-billing)',
    'Technical Support': 'var(--cat-tech)',
    'General Inquiry': 'var(--cat-general)',
    'Account': 'var(--cat-account)',
    'Feedback': 'var(--cat-feedback)'
  };
  
  let html = '';
  for (const [cat, count] of Object.entries(cats)) {
    if (count === 0) continue;
    
    const percentage = Math.round((count / data.totalQueries) * 100);
    const color = colors[cat] || 'var(--cat-general)';
    
    html += `
      <div class="mb-4">
        <div class="chart-label">
          <span>${cat}</span>
          <span class="text-gray-500 font-normal">${count} (${percentage}%)</span>
        </div>
        <div class="chart-bar">
          <div class="chart-fill" style="width: 0%; background-color: ${color};" data-width="${percentage}%"></div>
        </div>
      </div>
    `;
  }
  
  chartContainer.innerHTML = html;
  
  // Animate bars
  setTimeout(() => {
    chartContainer.querySelectorAll('.chart-fill').forEach(el => {
      el.style.width = el.getAttribute('data-width');
    });
  }, 100);
}

function renderTableData(data, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center p-8 text-gray-500">No queries found.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = data.map(q => {
    const date = new Date(q.timestamp).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' });
    const statusClass = q.status === 'resolved' ? 'status-resolved' : 'status-pending';
    const badgeClass = getCategoryBadgeClass(q.category);
    
    return `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="p-4 align-middle">
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded bg-gray-100 flex-center text-xs font-bold text-gray-600 border border-gray-200">${q.username.charAt(0).toUpperCase()}</div>
            <span class="font-medium text-gray-900">${q.username}</span>
          </div>
        </td>
        <td class="p-4 align-middle">
          <div class="truncate text-gray-800" style="max-width: 300px;" title="${q.query}">${q.query}</div>
        </td>
        <td class="p-4 align-middle"><span class="badge ${badgeClass}">${q.category}</span></td>
        <td class="p-4 align-middle font-medium text-gray-600">${q.confidence}%</td>
        <td class="p-4 align-middle">
          <span class="status-badge ${statusClass} capitalize" onclick="toggleStatus('${q.id}', '${q.status}')" title="Click to toggle status">
            ${q.status} <i class="ph ph-arrows-left-right text-xs ml-1 opacity-50"></i>
          </span>
        </td>
        <td class="p-4 align-middle text-sm text-gray-500">${date}</td>
      </tr>
    `;
  }).join('');
}

async function toggleStatus(id, currentStatus) {
  const newStatus = currentStatus === 'pending' ? 'resolved' : 'pending';
  document.getElementById('global-spinner').classList.remove('hidden');
  
  try {
    const result = await apiRequest('updateStatus', { id, status: newStatus });
    if (result.status === 'success') {
      // Optimistic update locally to avoid full refresh
      const idx = allQueriesData.findIndex(q => q.id === id);
      if (idx !== -1) {
        allQueriesData[idx].status = newStatus;
        filterTable(); // Re-render filtered list
      }
      refreshAdminData(); // Background refresh to sync stats
    } else {
      alert("Failed to update status: " + result.message);
    }
  } catch (err) {
    alert("Network error: " + err.message);
  } finally {
    document.getElementById('global-spinner').classList.add('hidden');
  }
}

function filterTable() {
  const search = document.getElementById('search-input').value.toLowerCase();
  const cat = document.getElementById('filter-category').value;
  const status = document.getElementById('filter-status').value;
  
  const filtered = allQueriesData.filter(q => {
    const matchSearch = q.query.toLowerCase().includes(search) || q.username.toLowerCase().includes(search);
    const matchCat = cat === 'all' || q.category === cat;
    const matchStatus = status === 'all' || q.status === status;
    return matchSearch && matchCat && matchStatus;
  });
  
  renderTableData(filtered, 'all-queries-tbody');
}

function getCategoryBadgeClass(cat) {
  if (cat === 'Billing') return 'badge-billing';
  if (cat === 'Technical Support') return 'badge-tech';
  if (cat === 'Account') return 'badge-account';
  if (cat === 'Feedback') return 'badge-feedback';
  return 'badge-general';
}
