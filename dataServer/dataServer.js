// 引入NET
const net = require('net');
const { Z_ASCII } = require('zlib');
const jsonParse_ = require('./json_parse');

let fake_dev = {};
fake_dev.value = 0;

// 创建TCP服务器
const server = net.createServer(function (client) {
    console.log('someones connects');

    // 接收客户端的数据
    client.on('data', function (data) {
        console.log('server recv client data:', data.toString('utf-8'));
        //client.write(data);
        handleClient(data.toString('utf-8'), client);
    });

    // 客户端连接关闭
    client.on('close', function (err) {
        console.log('clinet off');
    });

    // 客户端连接错误
    client.on('error', function (err) {
        console.log('client error');
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
function handleClient(req, client)
{
    handleFakeTcp508neth(req, client);
}