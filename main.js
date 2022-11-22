const { app, BrowserWindow,ipcMain } = require('electron');
const path = require('path');
const net = require('net');

const Obj2json_ = require('./Obj2json');

// Enable live reload for Electron too
require('electron-reload')(__dirname, {
  // Note that the path to electron may vary according to the main file
  electron: require(`${__dirname}/node_modules/electron`)
});

let win;
const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  ipcMain.handle('startCommu', (event, dev) => {startCommu(dev)});
  ipcMain.handle('devCommu', (event, dev, info) => {devCommu(dev, info)});


  win.loadFile('index.html');
  win.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});



let devMap = new Map();
let clinetInit = false;


//根据dev的类型创建网络连接
function startCommu(dev)
{
  if (dev.name != "tcp508neth")
  {
    console.log("dev create error");
    return;
  }

  //用nodejs API创建tcp客户端
  socketClient = net.connect({host:'127.0.0.1', port:5000},  () => {
    console.log('connected to server!');
  });
  
  socketClient.on('end', () => {
    console.log('disconnected from server');
  });

  devMap.set(dev.name,socketClient);
}

//进行设备通信
function devCommu(dev, info)
{
  //根据设备名查找设备
  let socketClient;
  console.log("server devCommu :" + dev.name);
  if (socketClient = devMap.get(dev.name))
  {
    if (clinetInit == false)
    {
      //服务器来数据了，传递给回调函数
      socketClient.on('data', (data) => {
        console.log("recv server data:");
        console.log(data.toString());
        //cb(data.toString());//调用回调函数，让浏览器处理数据
        win.webContents.send('dataFromServer', data.toString());
      });

      clinetInit = true;
    }
    
    socketClient.write(Obj2json_.Obj2json(info));//向服务器发送请求
  }
}









