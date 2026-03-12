// Google Apps Script Backend for Customer Support Query Categorizer
// Copy this entire file to your Google Apps Script editor.

// Securely retrieve the Gemini API key from Script Properties
// Do NOT hardcode the API key here!
const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-2.5-flash';

// Utility to create JSON responses with CORS headers
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Global Headers for CORS (handled automatically by Apps Script Web App mostly, but good practice)
function doOptions(e) {
  return createJsonResponse({ status: 'success' });
}

// ---------------------------------------------------------
// POST Handlers (Login, Submit Query, Update Status)
// ---------------------------------------------------------
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'login') {
      return createJsonResponse(handleLogin(data));
    } else if (data.action === 'submitQuery') {
      return createJsonResponse(handleSubmitQuery(data));
    } else if (data.action === 'updateStatus') {
      return createJsonResponse(handleUpdateStatus(data));
    } else {
      return createJsonResponse({ status: 'error', message: 'Unknown action' });
    }
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// ---------------------------------------------------------
// GET Handlers (Get Queries, Get Stats)
// ---------------------------------------------------------
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getQueries') {
      return createJsonResponse(handleGetQueries(e.parameter));
    } else if (action === 'getStats') {
      return createJsonResponse(handleGetStats());
    } else {
      // Default to returning a status message (helpful for verifying deployment)
      return ContentService.createTextOutput("Customer Support API is running successfully.");
    }
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

// ---------------------------------------------------------
// Core Business Logic
// ---------------------------------------------------------

function handleLogin(data) {
  const { username, password, role } = data;
  
  if (role === 'admin') {
    if (username === 'admin' && password === 'admin') {
      return { status: 'success', username: 'admin', role: 'admin' };
    }
    return { status: 'error', message: 'Invalid admin credentials' };
  }
  
  if (role === 'user') {
    // Auto-register logic
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Users');
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();
    
    let userExists = false;
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === username) {
        userExists = true;
        break;
      }
    }
    
    if (!userExists) {
      sheet.appendRow([username, 'user', new Date().toISOString()]);
    }
    
    return { status: 'success', username: username, role: 'user' };
  }
  
  return { status: 'error', message: 'Invalid role' };
}

function handleSubmitQuery(data) {
  const { username, query } = data;
  
  if (!username || !query) {
    return { status: 'error', message: 'Username and query are required' };
  }
  
  // Call Gemini API to classify
  const classification = classifyWithGemini(query);
  
  const id = generateUUID();
  const timestamp = new Date().toISOString();
  const status = 'pending';
  
  // Save to Sheet
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Queries');
  sheet.appendRow([
    id, 
    username, 
    query, 
    classification.category, 
    classification.confidence, 
    status, 
    timestamp
  ]);
  
  return { 
    status: 'success', 
    id: id,
    category: classification.category,
    confidence: classification.confidence
  };
}

function handleGetQueries(params) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Queries');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  const headers = values[0];
  let queries = [];
  
  for (let i = 1; i < values.length; i++) {
    let row = values[i];
    let queryObj = {
      id: row[0],
      username: row[1],
      query: row[2],
      category: row[3],
      confidence: row[4],
      status: row[5],
      timestamp: row[6]
    };
    
    // Filter by username if provided
    if (params.username && queryObj.username !== params.username) {
      continue;
    }
    
    queries.push(queryObj);
  }
  
  // Sort by timestamp descending
  queries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  return { status: 'success', data: queries };
}

function handleGetStats() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Queries');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  let totalQueries = 0;
  let resolvedCount = 0;
  let categories = {
    'Billing': 0,
    'Technical Support': 0,
    'General Inquiry': 0,
    'Account': 0,
    'Feedback': 0
  };
  
  for (let i = 1; i < values.length; i++) {
    totalQueries++;
    let category = values[i][3];
    let status = values[i][5];
    
    if (categories.hasOwnProperty(category)) {
      categories[category]++;
    } else {
      categories['General Inquiry'] = (categories['General Inquiry'] || 0) + 1; // Fallback
    }
    
    if (status === 'resolved') {
      resolvedCount++;
    }
  }
  
  const resolutionRate = totalQueries > 0 ? Math.round((resolvedCount / totalQueries) * 100) : 0;
  
  return {
    status: 'success',
    totalQueries: totalQueries,
    resolutionRate: resolutionRate,
    categories: categories
  };
}

function handleUpdateStatus(data) {
  const { id, status } = data;
  if (!id || !status) return { status: 'error', message: 'Missing parameters' };
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Queries');
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === id) {
      // Column F is index 6 (1-based index for getRange)
      sheet.getRange(i + 1, 6).setValue(status);
      return { status: 'success', message: 'Status updated' };
    }
  }
  
  return { status: 'error', message: 'Query not found' };
}

// ---------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------

function classifyWithGemini(query) {
  if (!GEMINI_API_KEY) {
    return { category: 'General Inquiry', confidence: 0 }; // Fallback if no API key
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  
  const prompt = `You are a highly accurate Customer Support Triage AI. 
Your job is to read a customer query and map it to exactly ONE of the following Support Categories.

### Categories & Definitions:
1. "Billing" - Issues related to payments, charges, refunds, invoices, subscriptions, pricing, or being double-charged.
2. "Technical Support" - Issues with the product not working, bugs, login errors, crashes, feature breakage, or API errors.
3. "Account" - Issues related to changing passwords, updating email, deleting account, Profile settings, or 2FA.
4. "Feedback" - Feature requests, general compliments or complaints about the product experience without needing immediate support.
5. "General Inquiry" - Questions about company policies, product capabilities before buying, "who are you", or anything that does NOT fit the above.

### Instructions:
- Analyze the user query carefully.
- Output ONLY valid JSON, unformatted (no markdown blocks like \`\`\`json).
- The JSON must have exactly two keys: "category" and "confidence".
- "category" must be exactly one of the five strings listed above.
- "confidence" must be an integer between 0 and 100 representing your certainty.

### Output Format:
{"category": "Category Name", "confidence": 95}

### Query to analyze:
"${query.replace(/"/g, '\\"')}"`;

  const payload = {
    "contents": [{
      "parts": [{
        "text": prompt
      }]
    }],
    "generationConfig": {
      "responseMimeType": "application/json"
    }
  };
  
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const content = response.getContentText();
    let jsonStr = JSON.parse(content).candidates[0].content.parts[0].text;
    
    // Clean markdown if Gemini hallucinates formatting
    jsonStr = jsonStr.replace(/^```json\n?/g, '').replace(/\n?```$/g, '').trim();
    
    const result = JSON.parse(jsonStr);
    
    // Validate category
    const validCategories = ['Billing', 'Technical Support', 'General Inquiry', 'Account', 'Feedback'];
    if (!validCategories.includes(result.category)) {
      result.category = 'General Inquiry';
    }
    
    return {
      category: result.category,
      confidence: result.confidence || 85
    };
  } catch (err) {
    console.error("Gemini API Error:", err);
    return { category: 'General Inquiry', confidence: 50 }; // Safe fallback
  }
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
