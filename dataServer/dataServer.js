// 引入NET
const net = require('net');

// 创建TCP服务器
const server = net.createServer(function (client) {
    console.log('someones connects');

    // 接收客户端的数据
    client.on('data', function (data) {
        console.log('server recv client data:', data.toString('utf-8'));
        client.write(data);
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

