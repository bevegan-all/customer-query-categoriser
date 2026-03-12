// IMPORTANT: Replace this URL with your deployed Google Apps Script Web App URL
// See README.md for deployment instructions.
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyVvmmcikSk5m3eFMHi93T__OraInyCZHjwxyDt3uqD52tEOp2IacM5jZqdv2xDABK2PQ/exec';

// Centralized fetch helper
async function apiRequest(action, data = {}) {
  // If it's a GET request
  if (['getQueries', 'getStats'].includes(action)) {
    const url = new URL(API_BASE_URL);
    url.searchParams.append('action', action);
    if (data.username) url.searchParams.append('username', data.username);

    try {
      const response = await fetch(url.toString(), { redirect: 'follow' });
      return await response.json();
    } catch (e) {
      console.error(e);
      throw new Error("Failed to fetch data. Check API configuration.");
    }
  }

  // If it's a POST request
  try {
    const payload = { action, ...data };
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // 'text/plain' helps avoid CORS preflight issues with Apps Script
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    return await response.json();
  } catch (e) {
    console.error(e);
    throw new Error("API request failed. Check your network or API URL.");
  }
}
