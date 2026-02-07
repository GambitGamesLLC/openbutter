const WebSocket = require('ws');

// The Browser Connector uses this URL
const token = 'c41df81f4efbf047b6aa0b0cb297536033274be12080dbe1';
const url = `ws://127.0.0.1:18789/?token=${token}`;

console.log('Connecting to', url);

try {
  const ws = new WebSocket(url);

  ws.on('open', () => {
    console.log('Connected');
    
    // Mimic Browser Connector: Send JSON ping immediately
    console.log('Sending JSON ping...');
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    
    // Keep alive for 15s to observe disconnect behavior
    setTimeout(() => {
        console.log('15s elapsed. Closing.');
        ws.close();
    }, 15000);
  });

  ws.on('message', (data) => {
    console.log('Received:', data.toString());
  });

  ws.on('close', (code, reason) => {
    console.log(`Closed: ${code} ${reason}`);
  });

  ws.on('error', (err) => {
    console.error('Error:', err);
  });
} catch (e) {
  console.error('Setup error:', e);
}
