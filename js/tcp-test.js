const { log } = require('console');
const http = require('http');
const net = require('net');

const Base64 = {
    encode(str) {
        // 首先，我们使用 encodeURIComponent 来获得百分比编码的UTF-8，然后我们将百分比编码转换为原始字节，最后存储到btoa里面
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode(Number('0x' + p1));
            }));
    },
    decode(str) {
        // 过程：从字节流到百分比编码，再到原始字符串
        return decodeURIComponent(atob(str).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }
}


// 序列化 HTTP 请求对象并通过 TCP 发送
function sendRequestOverTcp(req, callback) {
    const client = new net.Socket();
    // 序列化 HTTP 请求 (请求行 + 头部 + 请求体)
    const requestString = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
        Object.entries(req.headers).map(([key, value]) => `${key}: ${value}`).join('\r\n') +
        '\r\n\r\n' + (req.body || ''); // 注意：这里假设请求体已经完整读取
    // console.log(requestString, 'request string')
    console.log(req.body, 'request body')
    const reqStr = Base64.encode(requestString)
    client.connect(8080, '127.0.0.1', () => {
        console.log('Connected to TCP server');
        client.write(reqStr + '\n');  // 发送整个HTTP请求作为字符串
        // client.write(requestString);  // 发送整个HTTP请求作为字符串
    });

    // 处理来自TCP服务器的响应
    client.on('data', (data) => {
        console.log('data: ', data.toString())
        callback(null, data.toString());
        client.destroy();  // 关闭连接
    });

    client.on('error', (err) => {
        callback(err);
        client.destroy();
    });
}

function parseHttpResponse(responseString) {
    // 拆分响应字符串为头部和体部分
    const [rawHeaders, body] = responseString.split('\r\n\r\n');
    // console.log('rawHeaders: ', rawHeaders)
    // console.log('body: ', body)
    // 将状态行和头部分离
    const [statusLine, ...headerLines] = rawHeaders.split('\r\n');

    // 解析状态行 (HTTP版本, 状态码, 状态消息)
    const [httpVersion, statusCode, ...statusMessage] = statusLine.split(' ');

    // 解析头部
    const headers = {};
    headerLines.forEach(line => {
        const [key, value] = line.split(': ');
        headers[key] = value;
    });

    // 构造解析后的 HTTP 响应对象
    const httpResponse = {
        httpVersion,
        statusCode: parseInt(statusCode, 10),
        statusMessage: statusMessage.join(' '),
        headers,
        body
    };

    return httpResponse;
}

function doRequest(req, res) {
    // 将 HTTP 请求序列化并通过 TCP 发送
    sendRequestOverTcp(req, (err, tcpResponse) => {
        if (err) {
            res.writeHead(500);
            res.end(`Error communicating with TCP server: ${err.message}`);
            return;
        }
        // console.log(new Buffer(tcpResponse, 'base64').toString())
        // console.log(parseHttpResponse(new Buffer(tcpResponse, "base64").toString()))

        // 将 TCP 响应返回给 HTTP 客户端
        const resp = parseHttpResponse(Base64.decode(tcpResponse))
        res.writeHead(resp.statusCode, resp.headers)
        res.statusMessage = resp.statusMessage
        res.end(resp.body);
    });
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    if (req.method !== 'GET') {
        req.on('data', function (data) {
            req.body = data;
            // console.log('服务器端接收到数据：' + decodeURIComponent(req.data));
            doRequest(req, res)
        });
    } else {
        doRequest(req, res)
    }
}).listen(9999, () => {
    console.log('HTTP server is listening on port 9999');
});


