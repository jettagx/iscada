// 引入NET
const net = require('net');
const { Z_ASCII } = require('zlib');
const jsonParse_ = require('./json_parse');

let fake_dev = {};
fake_dev.value = 0;

let client;

// 创建TCP服务器
const server = net.createServer(function (client_) {
    console.log('someones connects');

    client = client_;

    // 接收客户端的数据
    client_.on('data', function (data) {
        //console.log('server recv client data:', data.toString('utf-8'));
        //client.write(data);
        handleClient(data.toString('utf-8'));
    });

    // 客户端连接关闭
    client_.on('close', function (err) {
        console.log('client off');
    });

    // 客户端连接错误
    client_.on('error', function (err) {
        console.log('client error',err);
    });
});

// 监听客户端的连接
server.listen(
    {
        port: 5000,
        host: '127.0.0.1',
    },
    function () {
        console.log('server start listening');
    }
);

//设置监听时的回调函数
server.on('listening', function () {
    const { address, port } = server.address();
    console.log('server is running: ' + address + ':' + port);
});

//假设备
function handleFakeTcp508neth(req, client)
{
    //从字符串构建js对象
    let req_js = jsonParse_.jsonParse(req);

    if (req_js)
    {
        if (req_js.type == "button")
        {
            //如果是按钮事件则，写变量
            fake_dev.value = req_js.value[0];

            //返回操作成功响应数据
            let reply = '{"result":"ok"}';
            client.write(reply);
        }
        else if(req_js.type == "label")
        {
            //如果是标签则，返回变量的值
            let tmp = fake_dev.value;
            let reply = '{"result":"' + tmp + '"}';
            client.write(reply);
        }
        else
        {
            throw "handleFakeTcp508neth type error";
        }
    }
    
}

//处理客户端请求
function handleClient(req)
{
    //handleFakeTcp508neth(req, client);
    handleTcp508neth(req);
}

let initTcp508neth = false;
let client_modbus;

let variable;

function connectTcp508neth(client)
{
  //用nodejs API创建tcp客户端
  //假设服务器为
  let socketClient = net.connect({host:'192.168.2.10', port:502},  () => {
    console.log('connected to modbus server!');
  });
  
  socketClient.on('end', () => {
    console.log('disconnected from modbus server');
  });

  socketClient.on('data', (data) => {
    //console.log('recv data from tcp508n');
    //收到tcp608n的返回数据

    if (data[7] == 0x01)
    {
        //如果是标签，返回变量的值
        //console.log('recv data from tcp508n: ', data);
        let tmp = (data[9] & (1 << variable)) >> variable;
        let replyRead = '{"result":"' + tmp + '"}';
        client.write(replyRead);
    }
    else if(data[7] == 0x05)
    {
        //如果是按钮，返回操作成功响应数据
        let replyWrite = '{"result":"ok"}';
        client.write(replyWrite);//返回数据给浏览器端
    }
});

  return socketClient;
}

function handleTcp508neth(req)
{
    //如果是第一次收到通信要求，首先创建到服务器的连接
    if (initTcp508neth == false)
    {
        initTcp508neth = true;
        client_modbus = connectTcp508neth();
    }
    

    //如果是按钮，则看看variable字段中值是多少并发送相应报文
    //从字符串构建js对象
    let req_js = jsonParse_.jsonParse(req);

    if (req_js)
    {
        if (req_js.type == "button")
        {
            //如果是按钮事件则，写变量
            let variable = req_js.variable[0];
            let value = req_js.value[0]; 
        
            sendDataToTcp508n(client_modbus, variable, value, 0x05);
        }
        else if(req_js.type == "label")
        {
            let variable = req_js.variable[0];
        
            sendDataToTcp508n(client_modbus, variable, null, 0x01);
        }
        else
        {
            throw "handleTcp508neth type error";
        }
    }
}


function sendDataToTcp508n(client_modbus, variable_, value, func)
{
    variable = variable_;

    if (func == 0x01)
    {
        let data = [0x00, 0x00 ,0x00, 0x00, 0x00, 0x06, 0x01, 0x01, 0x00, 0x00, 0x00, 0x08];
    
        client_modbus.write(Buffer.from(data));//发送读报文给modbus服务器
    }
    else if (func == 0x05)
    {
        let data = [0x00, 0x00 ,0x00, 0x00, 0x00, 0x06, 0x01, 0x05, 0x00, 0x00, 0x00, 0x00];

        data[9] = variable;

        if (value)
        {
            data[10] = 0xff;
        }
        else
        {
            data[10] = 0x00;
        }
    
        client_modbus.write(Buffer.from(data));//发送写报文给modbus服务器
    } 
}