const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const requestIp = require('request-ip');
const geoip = require('geoip-lite');  // Thư viện để lấy thông tin địa lý từ IP
const userAgent = require('user-agent');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestIp.mw());  // Middleware để lấy địa chỉ IP

// Dữ liệu người dùng (thường thì bạn sẽ lưu vào cơ sở dữ liệu)
const users = {};

// Trang chủ (đổi hướng đến trang đăng ký)
app.get('/', (req, res) => {
    res.redirect('/register');
});

// Trang đăng ký
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Xử lý đăng ký
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (users[username]) {
        return res.send('Tên người dùng đã tồn tại!');
    }

    // Lưu người dùng vào bộ nhớ (có thể thay bằng cơ sở dữ liệu)
    users[username] = { password: password, loginHistory: [] };

    // Lấy địa chỉ IP từ middleware `request-ip`
    let ip = req.clientIp;  // IP từ middleware
    
    // Nếu ứng dụng chạy sau một proxy, kiểm tra header X-Forwarded-For
    if (req.headers['x-forwarded-for']) {
        ip = req.headers['x-forwarded-for'].split(',')[0];  // Lấy IP thật từ header
    }

    const userDevice = userAgent.parse(req.headers['user-agent']);  // Thông tin thiết bị từ user-agent

    // Lấy thông tin vị trí (kinh độ và vĩ độ) từ geoip
    const geo = geoip.lookup(ip);  // Sử dụng geoip để tra cứu thông tin vị trí từ IP

    const location = geo ? { latitude: geo.ll[0], longitude: geo.ll[1] } : { latitude: null, longitude: null };

    // Lưu lịch sử đăng nhập của người dùng (có thông tin IP, thiết bị và vị trí)
    users[username].loginHistory.push({
        loginTime: new Date().toLocaleString(),
        ip: ip,
        device: userDevice.os,
        location: location
    });

    // Chuyển hướng người dùng đến trang lịch sử đăng nhập
    res.redirect(`/history/${username}`);
});

// Trang lịch sử đăng nhập
app.get('/history/:username', (req, res) => {
    const { username } = req.params;
    const user = users[username];

    if (!user) {
        return res.send('Người dùng không tồn tại!');
    }

    // Hiển thị lịch sử đăng nhập của người dùng (kèm theo thông tin vị trí)
    res.send(`
        <h1>Lịch sử đăng nhập của ${username}</h1>
        <ul>
            ${user.loginHistory.map(entry => `
                <li>
                    Đăng nhập lúc: ${entry.loginTime}<br>
                    IP: ${entry.ip}<br>
                    Thiết bị: ${entry.device}<br>
                    Vị trí: Kinh độ: ${entry.location.latitude}, Vĩ độ: ${entry.location.longitude}
                </li>`).join('')}
        </ul>
    `);
});

// Chạy server
app.listen(3000, '0.0.0.0',   () => {
    console.log('Server is running on http://localhost:3000');
});
