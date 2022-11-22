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

//button控件的创建
function handleButton(button)
{
  //console.log("new button:" + button["name"] + " x: " + button["x"] + " y: " + button["y"]);
  //画图,按钮默认为150*100
  ctx.fillStyle = "blue";
  ctx.fillRect(button["x"],button["y"],BUTTON_WIDTH,BUTTON_HEIGHT);

  //记录当前按钮
  button.width = BUTTON_WIDTH;
  button.height = BUTTON_HEIGHT;
  clickThings.push(button);
}

//label控件的创建
function handleLabel(label)
{
  //console.log("new label:" + label["name"] + " x: " + label["x"] + " y: " + label["y"]);
  ctx.fillText("#",label["x"],label["y"]);
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
      devCommu(clickedThing, (data)=>{
        console.log("browser server data:");
        console.log(data);
      });
    }
  });
}

whoClick(c);

