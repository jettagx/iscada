const { contextBridge, ipcRenderer} = require('electron');

let recCb;

contextBridge.exposeInMainWorld('createCommus', {
  //node: () => process.versions.node,
  //chrome: () => process.versions.chrome,
  //electron: () => process.versions.electron,
  //ping: () => ipcRenderer.invoke('ping'),
  // we can also expose variables, not just functions
  startCommu:(dev) => ipcRenderer.invoke('startCommu', dev).then((result) => {
  }),
  devCommu:(dev, info, cb) => {
    recCb = cb;
    ipcRenderer.invoke('devCommu', dev, info).then((result) => {
  });
  }
});

ipcRenderer.on('dataFromServer', function(event, message) 
{
  console.log("dataFromServer: " + message);
  recCb(message);
});




