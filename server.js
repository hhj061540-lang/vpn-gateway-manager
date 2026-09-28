// server.js
/**
 * VPN Gateway Manager API Server
 * - Serves a static HTML frontend with embedded styles/fonts
 * - Provides API endpoints:
 *   - GET /api/countries: fetches countries list from remote JSON
 *   - POST /api/vpn/connect: simulate VPN connect
 *   - POST /api/vpn/disconnect: simulate VPN disconnect
 *   - GET /api/vpn/status: current VPN connection status
 *   - GET /api/vpn/countries: same as /api/countries
 *   - GET /api/vpn/ip: returns simulated VPN IP (10.x.x.x)
 *   - GET /api/test?ms=: latency test with delay
 *   - GET /api/healthz: health check
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 5900;

app.use(cors());
app.use(express.json());

const COUNTRIES_URL = 'https://hhj061540-lang.github.io/silver-train/api/countries.json';

// In-memory VPN state
let vpnState = {
  connected: false,
  country: null,
  flag: null,
  ip: null,
  connectedAt: null,
};

// Helper to generate random VPN IP in 10.x.x.x range
function generateVpnIp() {
  const rand = () => Math.floor(Math.random() * 256);
  return `10.${rand()}.${rand()}.${rand()}`;
}

// Fetch countries list from remote JSON
async function fetchCountries() {
  const res = await fetch(COUNTRIES_URL);
  if (!res.ok) throw new Error(`Failed to fetch countries: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Countries data is not an array');
  return data;
}

// Serve static HTML page with embedded CSS/fonts and interactive frontend
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>VPN Gateway Manager</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Cormorant+Garamond:wght@600;700&display=swap" rel="stylesheet" />
<style>
:root{
  --bg: #f5efe6;
  --paper: rgba(255,255,255,0.6);
  --ink: #1b1a18;
  --muted: #6e685f;
  --line: rgba(27,26,24,0.12);
  --accent: #b44f2f;
  --accent-2: #254441;
  --shadow: 0 20px 60px rgba(38, 30, 18, 0.12);
  --radius: 26px;
  --max: 1180px;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  margin:0;
  color:var(--ink);
  background: radial-gradient(circle at 15% 20%, rgba(180,79,47,0.11), transparent 0 26%), radial-gradient(circle at 85% 15%, rgba(37,68,65,0.12), transparent 0 24%), linear-gradient(180deg, #f7f1e8 0%, #f0e7da 100%);
  font-family:"Space Grotesk", sans-serif;
  min-height:100vh;
  overflow-x:hidden;
  padding: 2rem;
}
h1 {
  font-family: 'Cormorant Garamond', serif;
  font-weight: 700;
  font-size: 3rem;
  margin-bottom: 1rem;
}
p {
  font-size: 1.1rem;
  color: var(--muted);
  margin-bottom: 2rem;
}
label {
  display: block;
  margin: 1rem 0 0.5rem;
  font-weight: 600;
}
select, input {
  padding: 0.5rem;
  font-size: 1rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  width: 100%;
  max-width: 300px;
}
button {
  margin-top: 1rem;
  padding: 0.6rem 1.2rem;
  font-size: 1rem;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  background: var(--accent);
  color: white;
  font-weight: 700;
  transition: background 0.3s ease;
}
button:hover {
  background: var(--accent-2);
}
.status {
  margin-top: 1rem;
  font-weight: 700;
}
.output {
  margin-top: 1rem;
  white-space: pre-wrap;
  background: var(--paper);
  padding: 1rem;
  border-radius: 12px;
  max-width: 600px;
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--ink);
}
</style>
</head>
<body>
  <h1>VPN Gateway Manager</h1>
  <p>Select a country and manage your VPN connection using the API endpoints.</p>

  <label for="countrySelect">Select VPN Country:</label>
  <select id="countrySelect"><option>Loading countries...</option></select>

  <button id="connectBtn">Connect VPN</button>
  <button id="disconnectBtn">Disconnect VPN</button>

  <label for="latencyInput">Latency Test (ms):</label>
  <input type="number" id="latencyInput" value="300" min="0" max="5000" step="50" />
  <button id="testLatencyBtn">Run Latency Test</button>

  <button id="statusBtn">Get VPN Status</button>
  <button id="ipBtn">Get VPN IP</button>
  <button id="healthBtn">Health Check</button>

  <div class="status" id="vpnStatus">Status: Unknown</div>
  <div class="output" id="apiOutput">API output will appear here...</div>

  <script>
    const countrySelect = document.getElementById('countrySelect');
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    const latencyInput = document.getElementById('latencyInput');
    const testLatencyBtn = document.getElementById('testLatencyBtn');
    const statusBtn = document.getElementById('statusBtn');
    const ipBtn = document.getElementById('ipBtn');
    const healthBtn = document.getElementById('healthBtn');
    const vpnStatus = document.getElementById('vpnStatus');
    const apiOutput = document.getElementById('apiOutput');

    async function fetchCountries() {
      try {
        const res = await fetch('/api/countries');
        const data = await res.json();
        if (data.ok && Array.isArray(data.countries)) {
          countrySelect.innerHTML = '';
          data.countries.forEach(c => {
            const option = document.createElement('option');
            option.value = c.country;
            option.textContent = \`\${c.flag} \${c.country}\`;
            countrySelect.appendChild(option);
          });
        } else {
          countrySelect.innerHTML = '<option>Error loading countries</option>';
        }
      } catch (err) {
        countrySelect.innerHTML = '<option>Error loading countries</option>';
      }
    }

    async function apiRequest(path, options = {}) {
      try {
        const res = await fetch(path, options);
        const data = await res.json();
        apiOutput.textContent = JSON.stringify(data, null, 2);
        if (path === '/api/vpn/status' || path === '/api/vpn/connect' || path === '/api/vpn/disconnect') {
          if (data.vpn && typeof data.vpn.connected === 'boolean') {
            vpnStatus.textContent = 'Status: ' + (data.vpn.connected ? \`Connected (\${data.vpn.country})\` : 'Disconnected');
          }
        }
      } catch (err) {
        apiOutput.textContent = 'Error: ' + err.message;
      }
    }

    connectBtn.addEventListener('click', () => {
      const country = countrySelect.value;
      apiRequest('/api/vpn/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      });
    });

    disconnectBtn.addEventListener('click', () => {
      apiRequest('/api/vpn/disconnect', { method: 'POST' });
    });

    testLatencyBtn.addEventListener('click', () => {
      const ms = Math.min(Math.max(parseInt(latencyInput.value) || 0, 0), 5000);
      apiRequest(\`/api/test?ms=\${ms}\`);
    });

    statusBtn.addEventListener('click', () => {
      apiRequest('/api/vpn/status');
    });

    ipBtn.addEventListener('click', () => {
      apiRequest('/api/vpn/ip');
    });

    healthBtn.addEventListener('click', () => {
      apiRequest('/api/healthz');
    });

    // Load countries on page load
    fetchCountries();
  </script>
</body>
</html>
`;

// Routes

// Serve static HTML page
app.get('/', (req, res) => {
  res.type('html').send(htmlContent);
});

// Health check
app.get('/api/healthz', (req, res) => {
  res.json({ ok: true, service: 'vpn-gateway-manager', port: PORT, timestamp: new Date().toISOString() });
});

// Latency test with delay (ms query param)
app.get('/api/test', async (req, res) => {
  const ms = Math.min(Math.max(parseInt(req.query.ms) || 0, 0), 5000);
  await new Promise(r => setTimeout(r, ms));
  res.json({ ok: true, delayed: ms, timestamp: new Date().toISOString() });
});

// Fetch countries list (proxy)
app.get(['/api/countries', '/api/vpn/countries'], async (req, res) => {
  try {
    const countries = await fetchCountries();
    res.json({ ok: true, count: countries.length, countries });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// VPN status
app.get('/api/vpn/status', (req, res) => {
  res.json({ ok: true, vpn: vpnState });
});

// VPN IP
app.get('/api/vpn/ip', (req, res) => {
  if (!vpnState.ip) {
    vpnState.ip = generateVpnIp();
  }
  res.json({ ok: true, ip: vpnState.ip, connected: vpnState.connected });
});

// Connect VPN (POST with JSON body { country: "Country Name" })
app.post('/api/vpn/connect', async (req, res) => {
  const { country } = req.body;
  if (!country) return res.status(400).json({ ok: false, error: 'Missing country in request body' });

  try {
    const countries = await fetchCountries();
    const match = countries.find(c => c.country === country);
    if (!match) return res.status(404).json({ ok: false, error: 'Country not found' });

    vpnState = {
      connected: true,
      country: match.country,
      flag: match.flag,
      ip: generateVpnIp(),
      connectedAt: new Date().toISOString(),
    };
    res.json({ ok: true, message: 'VPN connected', vpn: vpnState });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Disconnect VPN
app.post('/api/vpn/disconnect', (req, res) => {
  vpnState = {
    connected: false,
    country: null,
    flag: null,
    ip: null,
    connectedAt: null,
  };
  res.json({ ok: true, message: 'VPN disconnected', vpn: vpnState });
});

// Start server
app.listen(PORT, () => {
  console.log('VPN Gateway Manager listening on http://localhost:'+ PORT);
});
