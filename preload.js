const { contextBridge, ipcRenderer} = require('electron');

//let recCb;//创建多个设备，不然会覆盖

let devsManage = [];

contextBridge.exposeInMainWorld('createCommus', {
  //node: () => process.versions.node,
  //chrome: () => process.versions.chrome,
  //electron: () => process.versions.electron,
  //ping: () => ipcRenderer.invoke('ping'),
  // we can also expose variables, not just functions
  startCommu:(dev) => ipcRenderer.invoke('startCommu', dev).then((result) => {
  }),
  devCommu:(dev, info, cb) => {
    let dev_id = dev.id;

    devsManage[dev_id] = cb;

    ipcRenderer.invoke('devCommu', dev, info).then((result) => {
  });
  }
});

ipcRenderer.on('dataFromServer', function(event, message, dev_id) 
{
  //console.log("dataFromServer: " + message);
  
  devsManage[dev_id](message);
});




