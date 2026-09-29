const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('forge', {
  openAudio:          () => ipcRenderer.invoke('dialog:openAudio'),
  readFile:           (p) => ipcRenderer.invoke('file:read', p),
  videoInfo:          (p) => ipcRenderer.invoke('file:videoInfo', p),
  version:            () => ipcRenderer.invoke('app:version'),

  downloadMedia:      (opts) => ipcRenderer.invoke('media:download', opts),
  openDownloadFolder: () => ipcRenderer.invoke('media:openFolder'),
  checkDeps:          () => ipcRenderer.invoke('media:checkDeps'),

  onMediaProgress: (cb) => {
    const h = (_e, data) => cb(data);
    ipcRenderer.on('media:progress', h);
    return () => ipcRenderer.removeListener('media:progress', h);
  },
  onMediaStatus: (cb) => {
    const h = (_e, data) => cb(data);
    ipcRenderer.on('media:status', h);
    return () => ipcRenderer.removeListener('media:status', h);
  },
});