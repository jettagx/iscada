

function sysCtl(info)
{
    let myMap = new Map();
    myMap.set("device",handleDevices);
    myMap.set("button",handleButtons);
    myMap.set("label", handleLabels);
    
    //设备处理函数
    let myDevice = new Map();
    myDevice.set("tcp508neth", handleTcp508neth);
    
    
    
    function handleDevices(devices)
    {
      for (let key in devices)
      {
        let device_func;
        if (device_func = myDevice.get(devices[key]["name"]))//不同的设备名采用不同处理函数
        {
          device_func(devices[key]);
        }
      }
    }
    
    
    
    //button控件的创建
    function handleButtons(buttons)
    {
      for (let key in buttons)
      {
        //给每个按钮添加类别为button，这样在后续处理上方便一些
        buttons[key]["type"] = "button";
        handleButton(buttons[key]);
      }
    }
    
    
    
    function handleLabels(labels)
    {
      for (let key in labels)
      {
        //给每个标签添加类别为label，这样在后续处理上方便一些
        labels[key]["type"] = "label";
        handleLabel(labels[key]);
      }
    }
    
    //根据解析得到的js对象初始化设备和构建界面
    for (let key in info) {
      let handle;
    
      if (handle = myMap.get(key))
      {
        //根据key的不同采用不同的处理函数。
        handle(result[key]);
      }
    }

    //开始标签的读操作
    //循环采集showThings中的数据
    let index = 0;

    if (showThings.length)
    {
        //如果有读的数据
        //取出读数据
        function cb(data)
        {
            //设置标签控件的显示
            //data为字符串，先转换为js对象
            let tmp;
            if(tmp = jsonParse(data))
            {
                //再去读下一个数据，直到读到所有数据，再重头读
                index++;
                if (index == showThings.length)
                {
                    index = 0;
                }

                //更新标签
                let showThing = showThings[index];
                showThing.value = tmp.result;
                updateGui();//更新渲染标签

                devStartCommu(showThings[index],cb);
            }
        }

        devStartCommu(showThings[index],cb);
    }
    
}

let prjFile_ = '\
{\
  "device":[\
  {"name":"tcp508neth","id":1}],\
  \
  "button":[\
  {"name":"button_on","device_id":[1],"variable":[1],"value":[1],"x":120,"y":0},\
  {"name":"button_off","device_id":[1],"variable":[1],"value":[0],"x":287,"y":16}],\
  \
  "label":[\
  {"name":"led1","device_id":[1],"variable":[1],"x":201,"y":227}]\
  }\
';
// let prjFile_ = '\
// {\
//   "device":[\
//   {"name":"tcp508neth","id":1}],\
//   \
//   "button":[\
//   {"name":"button_on","device_id":[1],"variable":[1],"value":[1],"x":120,"y":0},\
//   {"name":"button_off","device_id":[1],"variable":[1],"value":[0],"x":287,"y":16}]\
// }\
// ';


let result = jsonParse(prjFile_);
console.log(result);

sysCtl(result);

