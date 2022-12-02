const { app, BrowserWindow,ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs').promises;

const Obj2json_ = require('./Obj2json');

// Enable live reload for Electron too
require('electron-reload')(__dirname, {
  // Note that the path to electron may vary according to the main file
  electron: require(`${__dirname}/node_modules/electron`)
});

let win;
let winIsclosed = false;
const createWindow = () => {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.on('close', function() {
    winIsclosed = true;
  });

  ipcMain.handle('startCommu', (event, dev) => {startCommu(dev)});
  ipcMain.handle('devCommu', (event, dev, info) => {devCommu(dev, info)});
  ipcMain.handle('readLuaFile', async (event, fileName) => {
    //调用fs读取文件，返回文件数组
    const data = await fs.readFile(fileName);
    return data;
  })

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

let devsManage = [];

function newDev()
{
  let dev = {};
  dev.socketClient = null;

  return dev;
}


//根据dev的类型创建网络连接
//有多少个设备，创建多少个tcp连接
function startCommu(dev)
{

  //根据设备id，创建设备
  let device = devsManage[dev.id];

  if (device == undefined)
  {
    devsManage[dev.id] = newDev();

    device = devsManage[dev.id];

    let socketClient = net.connect({host:'127.0.0.1', port:5000},  () => {
      console.log('connected to server!');
    });
    
    socketClient.on('end', () => {
      console.log('disconnected from server');
    });

    //服务器来数据了，传递给回调函数
    socketClient.on('data', (data) => {
      //console.log("recv server data:");
      //console.log(data.toString());

      //bugfix当退出时，浏览器端被析构，导致主进程报错
      //修复方法，判断浏览器端是否存在
      if (winIsclosed == false)
      {
        win.webContents.send('dataFromServer', data.toString(), dev.id);
      }
    });

    device.socketClient = socketClient;

    //devMap.set(dev.name,socketClient);//修改为根据id来找到设备了，这句可以不要了
  }
}

//进行设备通信
function devCommu(dev, info)
{
  //根据设备名查找设备
  
  //console.log("server devCommu :" + dev.name);

  let device = devsManage[dev.id];
  let socketClient = device.socketClient;

  info.dev_name = dev.name;//将设备名附加到请求中
  socketClient.write(Obj2json_.Obj2json(info));//向服务器发送请求
  
}









