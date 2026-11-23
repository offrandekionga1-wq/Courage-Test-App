// ---------------------------------------------------------------------------
// Neon Clash — jeu à deux sur le même Wi-Fi.
//
// Transport : un plugin Capacitor natif ouvre un socket TCP et annonce la
// partie sur le réseau local (NSD). Dans un navigateur de bureau, où ce plugin
// n'existe pas, on retombe sur un relais WebSocket (outils de développement).
//
// Modèle : l'hôte fait autorité. L'invité envoie l'état de ses touches, l'hôte
// simule et renvoie un instantané ; personne ne peut diverger.
// ---------------------------------------------------------------------------
import type { CharId } from './art';

export type NetRole = 'host' | 'guest' | null;
export type NetState = 'idle' | 'hosting' | 'searching' | 'connecting' | 'connected' | 'error';

export interface Peer { name: string; host: string; port: number }

export interface FighterSnap {
  x: number; y: number; fc: number; fr: string;
  hp: number; me: number; wr: number; fl: number; tl: number; gh: number; cb: number;
}

export type NetEvent =
  | { k: 'hit'; x: number; y: number; i: 0 | 1; p: number; w: number; c: number }
  | { k: 'blk'; x: number; y: number; i: 0 | 1; g: number }
  | { k: 'fx'; i: 0 | 1; key: string; o: Record<string, unknown> }
  | { k: 'ban'; t: string; c: string }
  | { k: 'ko'; i: 0 | 1 }
  | { k: 'shk'; a: number }
  | { k: 'fls'; c: string; a: number; t: number }
  | { k: 'slo'; t: number; s: number }
  | { k: 'prj'; i: 0 | 1; x: number; y: number }
  | { k: 'sfx'; n: string; v?: number };

export interface ProjSnap { i: 0 | 1; x: number; y: number; w: number }

export interface Snapshot {
  t: number; ph: string; rd: number; tm: number;
  f: [FighterSnap, FighterSnap];
  pj: ProjSnap[];
  ev: NetEvent[];
}

export type NetMsg =
  | { m: 'hello'; name: string; ver: number }
  | { m: 'char'; id: CharId }          // personnage choisi par l'expéditeur
  | { m: 'start'; p1: CharId; p2: CharId }
  | { m: 'pad'; b: number }            // touches de l'invité, en bits
  | { m: 'snap'; s: Snapshot }
  | { m: 'bye' };

export const NET_VERSION = 3;

// ----------------------------------------------------------- transports ---
interface Transport {
  send(line: string): void;
  close(): void;
}

interface LanPluginShape {
  host(o: { port: number; name: string }): Promise<{ ip: string; port: number }>;
  discover(): Promise<void>;
  stopDiscover(): Promise<void>;
  connect(o: { host: string; port: number }): Promise<void>;
  send(o: { data: string }): Promise<void>;
  close(): Promise<void>;
  addListener(ev: string, fn: (d: Record<string, unknown>) => void): Promise<{ remove(): void }>;
}

let plugin: LanPluginShape | null | undefined;

async function lanPlugin(): Promise<LanPluginShape | null> {
  if (plugin !== undefined) return plugin;
  plugin = null;
  try {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; registerPlugin?: unknown } }).Capacitor;
    if (cap?.isNativePlatform?.()) {
      const mod = await import('@capacitor/core');
      plugin = mod.registerPlugin<LanPluginShape>('LanPlay');
    }
  } catch { plugin = null; }
  return plugin;
}

/** Vrai quand la partie en réseau local est réellement disponible. */
export async function lanAvailable(): Promise<boolean> {
  return (await lanPlugin()) !== null || location.protocol === 'http:';
}

// --------------------------------------------------------------- Session --
type Handler = (m: NetMsg) => void;

export class NetSession {
  role: NetRole = null;
  state: NetState = 'idle';
  peers: Peer[] = [];
  info = '';                       // adresse affichée à l'hôte
  onMessage: Handler | null = null;
  onState: ((s: NetState, info: string) => void) | null = null;
  onPeers: ((p: Peer[]) => void) | null = null;
  private tr: Transport | null = null;
  private devWs: WebSocket | null = null;
  private listeners: { remove(): void }[] = [];
  private buf = '';

  private set(s: NetState, info = this.info): void {
    this.state = s; this.info = info;
    this.onState?.(s, info);
  }

  private feed(chunk: string): void {
    this.buf += chunk;
    let i = this.buf.indexOf('\n');
    while (i >= 0) {
      const line = this.buf.slice(0, i);
      this.buf = this.buf.slice(i + 1);
      if (line) {
        try { this.onMessage?.(JSON.parse(line) as NetMsg); } catch { /* trame ignorée */ }
      }
      i = this.buf.indexOf('\n');
    }
  }

  private async bindPlugin(p: LanPluginShape): Promise<void> {
    this.listeners.push(await p.addListener('data', (d) => this.feed(String(d.data ?? ''))));
    this.listeners.push(await p.addListener('status', (d) => {
      const st = String(d.state ?? '');
      if (st === 'connected') this.set('connected');
      else if (st === 'closed') this.set('idle');
      else if (st === 'error') this.set('error', String(d.message ?? 'réseau'));
    }));
    this.listeners.push(await p.addListener('peer', (d) => {
      const peer: Peer = {
        name: String(d.name ?? 'Partie'), host: String(d.host ?? ''), port: Number(d.port ?? 0),
      };
      if (peer.host && !this.peers.some((x) => x.host === peer.host && x.port === peer.port)) {
        this.peers.push(peer);
        this.onPeers?.(this.peers);
      }
    }));
  }

  async host(name: string): Promise<void> {
    await this.close();
    this.role = 'host';
    this.peers = [];
    const p = await lanPlugin();
    if (p) {
      await this.bindPlugin(p);
      const r = await p.host({ port: 8777, name });
      this.tr = { send: (l) => void p.send({ data: l }), close: () => void p.close() };
      this.set('hosting', r.ip ? `${r.ip}:${r.port}` : '');
      return;
    }
    await this.devSocket(true, name);
  }

  async search(): Promise<void> {
    await this.close();
    this.role = 'guest';
    this.peers = [];
    const p = await lanPlugin();
    if (p) {
      await this.bindPlugin(p);
      await p.discover();
      this.set('searching');
      return;
    }
    await this.devSocket(false, 'invité');
  }

  async join(peer: Peer): Promise<void> {
    const p = await lanPlugin();
    this.role = 'guest';
    if (p) {
      this.set('connecting');
      await p.stopDiscover().catch(() => {});
      await p.connect({ host: peer.host, port: peer.port });
      this.tr = { send: (l) => void p.send({ data: l }), close: () => void p.close() };
      return;
    }
    // relais de développement : le lien est déjà ouvert, on signale l'entrée
    this.set('connecting');
    if (this.devWs && this.devWs.readyState === 1) this.devWs.send('#join');
    else await this.devSocket(false, 'invité');
  }

  /** Secours de développement : relais WebSocket lancé par tools/lan-relay.cjs. */
  private devSocket(isHost: boolean, name: string): Promise<void> {
    return new Promise((resolve) => {
      const url = `ws://${location.hostname}:8778/?role=${isHost ? 'host' : 'guest'}&name=${encodeURIComponent(name)}`;
      let ws: WebSocket;
      try { ws = new WebSocket(url); } catch { this.set('error', 'relais indisponible'); resolve(); return; }
      ws.onopen = () => {
        this.devWs = ws;
        this.tr = { send: (l) => ws.readyState === 1 && ws.send(l), close: () => ws.close() };
        this.set(isHost ? 'hosting' : 'searching', isHost ? 'relais local' : '');
        resolve();
      };
      ws.onmessage = (e) => {
        const s = String(e.data);
        if (s.startsWith('#peer ')) {
          const [, host, port, nm] = s.trim().split(' ');
          this.peers.push({ name: nm ?? 'Partie', host, port: Number(port) });
          this.onPeers?.(this.peers);
          return;
        }
        if (s.startsWith('#joined')) { this.set('connected'); return; }
        this.feed(s.endsWith('\n') ? s : s + '\n');
      };
      ws.onerror = () => { this.set('error', 'relais indisponible'); resolve(); };
      ws.onclose = () => { if (this.state !== 'idle') this.set('idle'); };
    });
  }

  send(m: NetMsg): void { this.tr?.send(JSON.stringify(m) + '\n'); }

  async close(): Promise<void> {
    for (const l of this.listeners) { try { l.remove(); } catch { /* déjà retiré */ } }
    this.listeners = [];
    try { this.tr?.close(); } catch { /* déjà fermé */ }
    this.tr = null;
    this.devWs = null;
    const p = await lanPlugin();
    try { await p?.stopDiscover(); } catch { /* non démarré */ }
    this.role = null;
    this.buf = '';
    this.peers = [];
    this.set('idle', '');
  }
}

// ------------------------------------------------------- encodage touches -
export function padBits(p: { left: boolean; right: boolean; up: boolean; down: boolean;
                            atk: boolean; sp: boolean; ult: boolean;
                            atkEdge: boolean; spEdge: boolean; ultEdge: boolean; upEdge: boolean }): number {
  return (p.left ? 1 : 0) | (p.right ? 2 : 0) | (p.up ? 4 : 0) | (p.down ? 8 : 0)
    | (p.atk ? 16 : 0) | (p.sp ? 32 : 0) | (p.ult ? 64 : 0)
    | (p.atkEdge ? 128 : 0) | (p.spEdge ? 256 : 0) | (p.ultEdge ? 512 : 0) | (p.upEdge ? 1024 : 0);
}

export function bitsToPad(b: number, p: { left: boolean; right: boolean; up: boolean; down: boolean;
                                          atk: boolean; sp: boolean; ult: boolean;
                                          atkEdge: boolean; spEdge: boolean; ultEdge: boolean; upEdge: boolean }): void {
  p.left = !!(b & 1); p.right = !!(b & 2); p.up = !!(b & 4); p.down = !!(b & 8);
  p.atk = !!(b & 16); p.sp = !!(b & 32); p.ult = !!(b & 64);
  p.atkEdge = !!(b & 128); p.spEdge = !!(b & 256); p.ultEdge = !!(b & 512); p.upEdge = !!(b & 1024);
}
