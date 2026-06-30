const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// Determine log path in the app's user data directory
const logPath = path.join(app.getPath('userData'), 'app-error.log');

function logToFile(message) {
  const formattedMsg = `[${new Date().toISOString()}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, formattedMsg);
  } catch (e) {
    console.error('Failed to write log to file:', e);
  }
  console.log(formattedMsg);
}

// Global process error handlers to prevent silent crashes
process.on('uncaughtException', (error) => {
  logToFile(`Uncaught Exception: ${error.stack || error}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logToFile(`Unhandled Rejection at Promise: ${reason?.stack || reason}`);
});

let mainWindow;
let server;

function startLocalServer() {
  const distPath = path.join(__dirname, '../dist');
  logToFile(`Starting local server from dist folder: ${distPath}`);

  if (!fs.existsSync(distPath)) {
    logToFile(`CRITICAL ERROR: dist folder does not exist at ${distPath}`);
  } else {
    try {
      const files = fs.readdirSync(distPath);
      logToFile(`Found files in dist directory: ${JSON.stringify(files)}`);
    } catch (e) {
      logToFile(`Error listing files in dist folder: ${e.message}`);
    }
  }
  
  server = http.createServer((req, res) => {
    // Strip query parameters
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(distPath, urlPath === '/' ? 'index.html' : urlPath);
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        // Fall back to index.html for Single Page Routing (SPA)
        filePath = path.join(distPath, 'index.html');
      }
      
      // Determine content type
      const ext = path.extname(filePath).toLowerCase();
      let contentType = 'text/html';
      switch (ext) {
        case '.js': contentType = 'text/javascript'; break;
        case '.css': contentType = 'text/css'; break;
        case '.json': contentType = 'application/json'; break;
        case '.png': contentType = 'image/png'; break;
        case '.jpg': case '.jpeg': contentType = 'image/jpeg'; break;
        case '.svg': contentType = 'image/svg+xml'; break;
        case '.ico': contentType = 'image/x-icon'; break;
      }
      
      const stream = fs.createReadStream(filePath);
      stream.on('error', (streamErr) => {
        logToFile(`Stream error for file ${filePath}: ${streamErr.message}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      });

      res.writeHead(200, { 'Content-Type': contentType });
      stream.pipe(res);
    });
  });

  return new Promise((resolve) => {
    // Listen on port 0 to allow OS to assign any free port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      logToFile(`Local HTTP server listening on http://127.0.0.1:${port}`);
      resolve(port);
    });
  });
}

async function createWindow() {
  logToFile(`Initializing main window. Log path: ${logPath}`);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // We fall back to assets/logo.png
    icon: path.join(__dirname, '../assets/logo.png'),
    title: "Flortek Industries PVT LTD",
  });

  // Remove default menu bar
  mainWindow.removeMenu();

  if (app.isPackaged) {
    try {
      const port = await startLocalServer();
      mainWindow.loadURL(`http://127.0.0.1:${port}`);
      logToFile(`Loaded local server URL on port ${port}`);
    } catch (e) {
      logToFile(`Failed to start server/load URL: ${e.stack || e}`);
    }
  } else {
    // Load local expo web dev server in development
    mainWindow.loadURL('http://localhost:8081');
    logToFile(`Loaded dev server URL http://localhost:8081`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  logToFile('Application closing.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
  if (server) {
    server.close();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
