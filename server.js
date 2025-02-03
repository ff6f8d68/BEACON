// server.js
const express = require('express');
const cors = require('cors');
const thumbmark = require('thumbmark');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Mock API Links
let apiLinks = [
  { _id: '1', name: 'Example Link', callbackUrl: 'http://localhost:3000/callback' }
];

// Serve static files from React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
} else {
  // In development, serve the embedded HTML
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BEACON Auth System</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #333; }
          ul { list-style-type: none; padding: 0; }
          li { margin: 10px 0; }
          form { margin-bottom: 20px; }
          label { display: block; margin-bottom: 5px; }
          input { width: 100%; padding: 8px; margin-bottom: 10px; }
          button { padding: 10px 15px; background-color: #007BFF; color: white; border: none; cursor: pointer; }
          button:hover { background-color: #0056b3; }
          .success, .error { margin-top: 10px; }
          .success { color: green; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1>BEACON Auth System</h1>
        <h2>API Links</h2>
        <ul id="api-links">
          <!-- API Links will be inserted here -->
        </ul>
        <h2>Create API Link</h2>
        <form id="api-link-form">
          <label>Name:</label>
          <input type="text" id="name" required>
          <label>Callback URL:</label>
          <input type="text" id="callback-url" required>
          <button type="submit">Create</button>
          <div id="form-messages" class="success"></div>
        </form>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            const apiLinksContainer = document.getElementById('api-links');
            const form = document.getElementById('api-link-form');
            const formMessages = document.getElementById('form-messages');

            // Fetch API Links
            const fetchApiLinks = async () => {
              try {
                const response = await fetch('/api/links');
                const apiLinks = await response.json();
                apiLinksContainer.innerHTML = '';
                apiLinks.forEach(link => {
                  const li = document.createElement('li');
                  li.innerHTML = \`<a href="/api/link/\${link._id}">\${link.name}</a>\`;
                  apiLinksContainer.appendChild(li);
                });
              } catch (error) {
                console.error('Fetch API links error:', error);
              }
            };

            fetchApiLinks();

            // Handle Form Submission
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              formMessages.textContent = '';
              const name = document.getElementById('name').value;
              const callbackUrl = document.getElementById('callback-url').value;

              try {
                const response = await fetch('/api/links', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ name, callbackUrl })
                });

                if (response.ok) {
                  const data = await response.json();
                  formMessages.textContent = \`API link created: \${data.name}\`;
                  formMessages.className = 'success';
                  document.getElementById('name').value = '';
                  document.getElementById('callback-url').value = '';
                  fetchApiLinks();
                } else {
                  throw new Error('Failed to create API link');
                }
              } catch (error) {
                console.error('Create API link error:', error);
                formMessages.textContent = 'Failed to create API link';
                formMessages.className = 'error';
              }
            });
          });
        </script>
      </body>
      </html>
    `);
  });
}

// API Link Handling
app.get('/auth', async (req, res) => {
  const callbackUrl = req.query.cb;
  if (!callbackUrl) {
    return res.status(400).send('Callback URL is required');
  }

  try {
    // Generate device fingerprint
    const fingerprint = await thumbmark.getFingerprint();

    // Post fingerprint to callback URL
    await axios.post(callbackUrl, { fingerprint });

    // Redirect to a success page or show a success message
    res.send('Fingerprint sent successfully');
  } catch (err) {
    console.error('Fingerprint generation or POST error:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Mock API Endpoints
app.post('/api/links', (req, res) => {
  const { name, callbackUrl } = req.body;
  const newLink = {
    _id: (apiLinks.length + 1).toString(),
    name,
    callbackUrl
  };
  apiLinks.push(newLink);
  res.status(201).json(newLink);
});

app.get('/api/links', (req, res) => {
  res.json(apiLinks);
});

app.get('/api/link/:id', (req, res) => {
  const link = apiLinks.find(l => l._id === req.params.id);
  if (!link) {
    return res.status(404).json({ message: 'API link not found' });
  }
  res.json(link);
});

// Callback Handler (simulated)
app.post('/callback', (req, res) => {
  const { fingerprint } = req.body;
  if (fingerprint) {
    console.log('Fingerprint received:', fingerprint);
    res.send('Fingerprint received successfully');
  } else {
    res.status(400).send('Fingerprint not provided');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
