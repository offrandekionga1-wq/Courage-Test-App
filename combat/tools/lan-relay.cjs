#!/usr/bin/env node
/**
 * Relais de développement pour le mode deux joueurs.
 *
 * Sur téléphone, les deux appareils se parlent directement en TCP grâce au
 * plugin Android (android/app/src/main/java/.../LanPlayPlugin.java). Dans un
 * navigateur de bureau ce plugin n'existe pas : ce petit serveur WebSocket
 * tient lieu de lien, le temps de tester le protocole.
 *
 *   node tools/lan-relay.cjs      # écoute sur ws://localhost:8778
 */
const http = require('http');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8778);
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** @type {{sock: import('net').Socket, role: string, name: string}[]} */
let clients = [];

function frame(data) {
  const buf = Buffer.from(data, 'utf8');
  const len = buf.length;
  let head;
  if (len < 126) head = Buffer.from([0x81, len]);
  else if (len < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([head, buf]);
}

function* unframe(buf) {
  let i = 0;
  while (i + 2 <= buf.length) {
    const op = buf[i] & 0x0f;
    const masked = (buf[i + 1] & 0x80) !== 0;
    let len = buf[i + 1] & 0x7f;
    let off = i + 2;
    if (len === 126) { len = buf.readUInt16BE(off); off += 2; }
    else if (len === 127) { len = Number(buf.readBigUInt64BE(off)); off += 8; }
    let mask = null;
    if (masked) { mask = buf.slice(off, off + 4); off += 4; }
    if (off + len > buf.length) return;           // trame incomplète
    const payload = buf.slice(off, off + len);
    if (mask) for (let k = 0; k < payload.length; k++) payload[k] ^= mask[k % 4];
    i = off + len;
    yield { op, text: payload.toString('utf8') };
  }
  buf.consumed = i;
}

const server = http.createServer((_, res) => { res.writeHead(404); res.end(); });

server.on('upgrade', (req, sock) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  sock.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );
  const url = new URL(req.url, 'http://x');
  const me = { sock, role: url.searchParams.get('role') || 'guest', name: url.searchParams.get('name') || 'Partie' };
  clients.push(me);
  console.log(`+ ${me.role} (${me.name}) — ${clients.length} connecté(s)`);

  const host = clients.find((c) => c.role === 'host');
  if (me.role === 'guest' && host) {
    sock.write(frame(`#peer 127.0.0.1 8777 ${host.name}`));
  }
  if (me.role === 'host') {
    for (const c of clients) if (c.role === 'guest') c.sock.write(frame(`#peer 127.0.0.1 8777 ${me.name}`));
  }

  let acc = Buffer.alloc(0);
  sock.on('data', (chunk) => {
    acc = Buffer.concat([acc, chunk]);
    const out = [];
    for (const f of unframe(acc)) {
      if (f.op === 8) { sock.end(); return; }
      if (f.op === 1) out.push(f.text);
    }
    if (acc.consumed) acc = acc.slice(acc.consumed);
    for (const text of out) {
      if (text === '#join') {
        for (const c of clients) c.sock.write(frame('#joined'));
        continue;
      }
      for (const c of clients) {
        if (c === me) continue;
        c.sock.write(frame(text));
      }
    }
  });
  const bye = () => {
    clients = clients.filter((c) => c !== me);
    console.log(`- ${me.role} — ${clients.length} restant(s)`);
  };
  sock.on('close', bye);
  sock.on('error', bye);
});

server.listen(PORT, () => console.log(`relais prêt sur ws://localhost:${PORT}`));
