
let devices = new Map();

//处理Tcp508neth设备
function handleTcp508neth(device)
{
  //console.log("new dev:" + device["name"] + " id is " + device["id"]);
  //当前设备是网络设备，创建网络连接
  createCommus.startCommu(device);

  devices.set(device.id, device);
}

function devCommu(info, cb)
{
  //根据按钮对应的设备id，得到设备
  let device;
  let dev_num = info.device_id[0];//取出按钮对应的设备id

  if (device = devices.get(dev_num))
  {
    createCommus.devCommu(device, info, cb);
  }
}