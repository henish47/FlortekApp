// Electron Preload Script
// Expose specific APIs to the renderer process if needed in the future

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
});
