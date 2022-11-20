let prjFile = '\
{\
  "device":[\
  {"name":"tcp508neth","id":1}],\
  \
  "button":[\
  {"name":"button_on","device_id":[1],"variable":[1],"value":[1],"x":120,"y":0},\
  {"name":"button_off","device_id":[1],"variable":[1],"value":[0],"x":287,"y":16}],\
  \
  "label":[\
  {"name":"led1","device_id":[1],"variable":[1],"x":531,"y":127}]\
  }\
';

let curIndex = 0;
let parsedObj = {};

//如果当前值和byte值不同会抛出异常
//为了确认工程文件字符串中关键处要符合json的格式
function expect(byte)
{
  if (prjFile[curIndex] == byte)
  {
    return true;
  }
  else
  {
    throw "not expect byte";
  }
}

//从当前位置跳过空白字符，如空格号和换符
function jmpBlank()
{
  while(prjFile[curIndex] == ' ' || prjFile[curIndex] == '\n')
  {
    curIndex++;
  }
}

function eatByte()
{
  if (curIndex < prjFile.length - 1)
  {
    curIndex++;
  }
}

function jsonParse()
{
  try {
    jmpBlank();//跳过开头可能有的空字符

    if(expect('{'))
    {
      eatByte();//将字符吃掉，即处理掉
      return parseObj(parsedObj);
    }
  } catch (error) {
    console.log("parseerror", error);
  }
  
  return null;
}

//解析对象的函数
function parseObj(parsedObj)
{
  jmpBlank();//跳过开头可能有的空字符

  if(expect('"'))
  {
    eatByte();//将字符吃掉，即处理掉

    let key = parseKey();

    jmpBlank();//跳过开头可能有的空字符
    expect(':');//key与value之间肯定是:号分隔，如果不是，直接报错
    jmpBlank();//跳过开头可能有的空字符

    eatByte();//将字符吃掉，即处理掉

    let value = parseValue();

    newObj(parsedObj, key, value);//创建新对象

    jmpBlank();

    //如果下一个字符为',',则递归调用，解析下一个对象
    if (prjFile[curIndex] == ',')
    {
      eatByte();//将字符吃掉，即处理掉

      return parseObj(parsedObj);//继续解析下一条数据
    }
    else if (prjFile[curIndex] == '}')//结束对象的解析
    {
      eatByte();//将字符吃掉，即处理掉

      return parsedObj;
    }
  }

  return null;
}

//创建新对象
function newObj(parsedObj, key, value)
{
  parsedObj[key] = value;
}

//解析Key
//读到下一个"号处
function parseKey()
{
  let key = null;
  let start = curIndex;
  let end;

  while (prjFile[curIndex] != '"') 
  {
    curIndex++;
  }

  end = curIndex;
  length = end - start;

  key = prjFile.substr(start, length);

  eatByte();//将"字符吃掉，即处理掉

  return key;
}

//解析值
//值有三种格式，数字，字符串，对象，分别处理
function parseValue()
{
  if (prjFile[curIndex] >= '0' && prjFile[curIndex] <= '9')
  {
    //是数字，直接解析后返回数字
    return parseNumber();
  }
  else if (prjFile[curIndex] == '"')
  {
    //是字符串，直接调用parseKey，因为key和字符串是一样的，key也是字符串
    eatByte();//将"字符吃掉，即处理掉

    return parseKey();
  }
  else if (prjFile[curIndex] == '[')
  {
    //是数组,调用
    eatByte();//将[字符吃掉，即处理掉

    let parsedArray = [];

    return parseArray(parsedArray);
  }

  throw 'undefined value type';
}

//解析数字
//暂时只支持整数
function parseNumber()
{
  let key = null;
  let start = curIndex;
  let end;

  while (prjFile[curIndex] >= '0' && prjFile[curIndex] <= '9') 
  {
    curIndex++;
  }

  end = curIndex;
  length = end - start;

  num_str = prjFile.substr(start, length);

  return parseInt(num_str);
}

//解析数组
//数组由两种格式，1是对象，2是数字
function parseArray(parsedArray)
{
  jmpBlank();

  if (prjFile[curIndex] == '{')
  {
    //如果是对象
    eatByte();//将{'字符吃掉，即处理掉

    let parsedObj = {};

    parsedArray.push(parseObj(parsedObj));//直接调用解析obj处理
  }
  else if (prjFile[curIndex] >= '0' && prjFile[curIndex] <= '9')
  {
    //如果是数字
    parsedArray.push(parseNumber());
  }

  jmpBlank();

  //如果下一个字符为',',则递归调用，解析下一个数组对象
  if (prjFile[curIndex] == ',')
  {
    eatByte();//将,字符吃掉，即处理掉

    return parseArray(parsedArray);
  }
  else if (prjFile[curIndex] == ']')//数组解析结束
  {
    eatByte();//将字符吃掉，即处理掉

    return parsedArray;
  }

  throw 'undefined array type';
}


let result = jsonParse(prjFile);
console.log(result);

let myMap = new Map();
myMap.set("device",handleDevices);
myMap.set("button",handleButtons);
myMap.set("label", handleLabels);

//设备处理函数
let myDevice = new Map();
myDevice.set("tcp508neth", handleTcp508neth);

//处理Tcp508neth设备
function handleTcp508neth(device)
{
  console.log("new dev:" + device["name"] + " id is " + device["id"]);
}

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
    handleButton(buttons[key]);
  }
}



function handleLabels(labels)
{
  for (let key in labels)
  {
    handleLabel(labels[key]);
  }
}

//根据解析得到的js对象初始化设备和构建界面
for (let key in result) {
  let handle;

  if (handle = myMap.get(key))
  {
    //根据key的不同采用不同的处理函数。
    handle(result[key]);
  }
 }
 