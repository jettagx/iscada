// const information = document.getElementById('info');
// information.innerText = `This app is using Chrome (v${versions.chrome()}), Node.js (v${versions.node()}), and Electron (v${versions.electron()})`;
// const func = async () => {
//   const response = await window.versions.ping()
//   console.log(response) // prints out 'pong'
// }

// func()

const BUTTON_WIDTH = 150;
const BUTTON_HEIGHT = 100;
var c=document.getElementById("myCanvas");
var ctx=c.getContext("2d");

let clickThings = [];
let showFunctions = [];
let showParam = [];


//button控件的创建
function handleButton(button)
{
  //console.log("new button:" + button["name"] + " x: " + button["x"] + " y: " + button["y"]);
  //画图,按钮默认为150*100
  showFunctions.push(showButton);
  showParam.push(button);

  showButton(button);
  

  //记录当前按钮
  button.width = BUTTON_WIDTH;
  button.height = BUTTON_HEIGHT;
  clickThings.push(button);
}

function showButton(button)
{
  ctx.fillStyle = "blue";
  ctx.fillRect(button["x"],button["y"],BUTTON_WIDTH,BUTTON_HEIGHT);
}

//初始显示为"#",后面根据值来显示
function showLabel(label)
{
  ctx.fillText(label.value ? label.value :"#",label["x"],label["y"]);
}

//更新标签，目前只支持更新标签
function updateGui()
{
  //清屏，然后按照showFunctions顺序依次画图

  ctx.clearRect(0,0,800,600);
  let index = 0;

  while(index < showFunctions.length)
  {
    let showf = showFunctions[index];
    let showp = showParam[index];
    index++;

    showf(showp);
  }
}

//label控件的创建
function handleLabel(label)
{
  //console.log("new label:" + label["name"] + " x: " + label["x"] + " y: " + label["y"]);
  showFunctions.push(showLabel);
  showParam.push(label);

  showLabel(label);
  showThings.push(label);
}

function findClickedThing(mouse)
{
  for (let key in clickThings)
  {
    let tmp = clickThings[key];

    let left = tmp.x;
    let top = tmp.y;
    let right = tmp.x + tmp.width;
    let buttom = tmp.y + tmp.height;

    if (mouse.x >= left && mouse.x <= right &&
      mouse.y >= top && mouse.y <= buttom)
    {
      return tmp;
    }
  }

  return null;
}

//当按钮被按下时触发事件
function whoClick(canvas)
{
  let mouse = { x: 0, y: 0 } // 存储鼠标位置信息
  canvas.addEventListener('mousedown', e => {
    let x = e.pageX;
    let y = e.pageY;
    // 计算鼠标在canvas画布中的相对位置
    mouse.x = x - canvas.offsetLeft;
    mouse.y = y - canvas.offsetTop;
  });

  canvas.addEventListener('mousedown', () => {
    let clickedThing = findClickedThing(mouse);
    if (clickedThing)
    {
      console.log(clickedThing.name + " clicked");

      //调用设备通信函数，进行通信
      devWriteCommu(clickedThing, (data)=>{
        //console.log("browser server data:");
        //console.log(data);
        let tmp;
        if (tmp = jsonParse(data))
        {
            if(tmp.result == "ok")
            {
                console.log(clickedThing.name + "成功");
            }
        }
      });
    }
  });
}

whoClick(c);

