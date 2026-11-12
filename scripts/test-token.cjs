const https = require('https');
const token = process.env.TOKEN;
if (!token) { console.log('No TOKEN'); process.exit(1); }
const req = https.get('https://api.github.com/user', { headers: { 'Authorization': *** ' + token, 'User-Agent': 'test' } }, (res) => {
  let d = ''; res.on('data', c => d += c); res.on('end', () => { const r = JSON.parse(d); console.log(r.login || r.message); });
});
req.end();
