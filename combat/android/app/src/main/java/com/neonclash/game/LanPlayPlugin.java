package com.neonclash.game;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;

/**
 * Partie à deux sur le même Wi-Fi.
 *
 * Les deux appareils se parlent en TCP direct, sans serveur : l'hôte ouvre un
 * port et l'annonce sur le réseau local (NSD / mDNS), l'invité le découvre et
 * s'y connecte. Les messages sont des lignes UTF-8 terminées par « \n ».
 */
@CapacitorPlugin(name = "LanPlay")
public class LanPlayPlugin extends Plugin {

    private static final String SERVICE_TYPE = "_neonclash._tcp.";

    private ServerSocket server;
    private Socket socket;
    private BufferedWriter out;
    private Thread acceptThread;
    private Thread readThread;

    private NsdManager nsd;
    private NsdManager.RegistrationListener regListener;
    private NsdManager.DiscoveryListener discListener;

    // NsdManager ne résout qu'un service à la fois : on fait la queue.
    private final ArrayDeque<NsdServiceInfo> pending = new ArrayDeque<>();
    private boolean resolving = false;

    // ------------------------------------------------------------ outils --
    private void status(String state, String message) {
        JSObject o = new JSObject();
        o.put("state", state);
        if (message != null) o.put("message", message);
        notifyListeners("status", o);
    }

    private NsdManager nsd() {
        if (nsd == null) {
            Context c = getContext();
            nsd = (NsdManager) c.getSystemService(Context.NSD_SERVICE);
        }
        return nsd;
    }

    /** Adresse IPv4 de l'appareil sur le réseau local, pour l'afficher. */
    private String localIp() {
        try {
            List<NetworkInterface> ifs = Collections.list(NetworkInterface.getNetworkInterfaces());
            for (NetworkInterface nif : ifs) {
                if (nif.isLoopback() || !nif.isUp()) continue;
                Enumeration<InetAddress> addrs = nif.getInetAddresses();
                while (addrs.hasMoreElements()) {
                    InetAddress a = addrs.nextElement();
                    if (!a.isLoopbackAddress() && a.getHostAddress() != null
                            && a.getHostAddress().indexOf(':') < 0) {
                        return a.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return "";
    }

    private void attach(Socket s) {
        try {
            socket = s;
            socket.setTcpNoDelay(true);   // les touches ne doivent pas attendre
            out = new BufferedWriter(new OutputStreamWriter(s.getOutputStream(), StandardCharsets.UTF_8));
            status("connected", null);
            readThread = new Thread(() -> {
                try {
                    BufferedReader in = new BufferedReader(
                            new InputStreamReader(s.getInputStream(), StandardCharsets.UTF_8));
                    String line;
                    while ((line = in.readLine()) != null) {
                        JSObject o = new JSObject();
                        o.put("data", line + "\n");
                        notifyListeners("data", o);
                    }
                } catch (Exception e) {
                    // rupture de lien : traitée comme une fermeture
                } finally {
                    status("closed", null);
                }
            }, "lanplay-read");
            readThread.start();
        } catch (Exception e) {
            status("error", e.getMessage());
        }
    }

    // ------------------------------------------------------------- hôte ---
    @PluginMethod
    public void host(final PluginCall call) {
        final int port = call.getInt("port", 8777);
        final String name = call.getString("name", "Neon Clash");
        closeQuietly();
        try {
            server = new ServerSocket(port);
            server.setReuseAddress(true);
        } catch (Exception e) {
            call.reject("port occupé : " + e.getMessage());
            return;
        }
        acceptThread = new Thread(() -> {
            try {
                Socket s = server.accept();
                attach(s);
                try { server.close(); } catch (Exception ignored) { }
                server = null;
            } catch (Exception e) {
                // serveur fermé pendant l'attente : normal à l'annulation
            }
        }, "lanplay-accept");
        acceptThread.start();

        try {
            NsdServiceInfo info = new NsdServiceInfo();
            info.setServiceName(name);
            info.setServiceType(SERVICE_TYPE);
            info.setPort(port);
            regListener = new NsdManager.RegistrationListener() {
                @Override public void onServiceRegistered(NsdServiceInfo i) { }
                @Override public void onRegistrationFailed(NsdServiceInfo i, int code) { }
                @Override public void onServiceUnregistered(NsdServiceInfo i) { }
                @Override public void onUnregistrationFailed(NsdServiceInfo i, int code) { }
            };
            nsd().registerService(info, NsdManager.PROTOCOL_DNS_SD, regListener);
        } catch (Exception e) {
            // sans annonce, l'invité peut toujours saisir l'adresse à la main
            regListener = null;
        }

        JSObject ret = new JSObject();
        ret.put("ip", localIp());
        ret.put("port", port);
        call.resolve(ret);
    }

    // --------------------------------------------------------- découverte -
    private void resolveNext() {
        if (resolving) return;
        final NsdServiceInfo next = pending.poll();
        if (next == null) return;
        resolving = true;
        try {
            nsd().resolveService(next, new NsdManager.ResolveListener() {
                @Override public void onResolveFailed(NsdServiceInfo info, int code) {
                    resolving = false;
                    resolveNext();
                }
                @Override public void onServiceResolved(NsdServiceInfo info) {
                    JSObject o = new JSObject();
                    o.put("name", info.getServiceName());
                    o.put("host", info.getHost() != null ? info.getHost().getHostAddress() : "");
                    o.put("port", info.getPort());
                    notifyListeners("peer", o);
                    resolving = false;
                    resolveNext();
                }
            });
        } catch (Exception e) {
            resolving = false;
        }
    }

    @PluginMethod
    public void discover(final PluginCall call) {
        stopDiscovery();
        try {
            discListener = new NsdManager.DiscoveryListener() {
                @Override public void onDiscoveryStarted(String type) { }
                @Override public void onDiscoveryStopped(String type) { }
                @Override public void onStartDiscoveryFailed(String type, int code) {
                    status("error", "découverte indisponible");
                }
                @Override public void onStopDiscoveryFailed(String type, int code) { }
                @Override public void onServiceFound(NsdServiceInfo info) {
                    if (info.getServiceType() != null && info.getServiceType().contains("neonclash")) {
                        pending.add(info);
                        resolveNext();
                    }
                }
                @Override public void onServiceLost(NsdServiceInfo info) { }
            };
            nsd().discoverServices(SERVICE_TYPE, NsdManager.PROTOCOL_DNS_SD, discListener);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    private void stopDiscovery() {
        if (discListener != null) {
            try { nsd().stopServiceDiscovery(discListener); } catch (Exception ignored) { }
            discListener = null;
        }
        pending.clear();
        resolving = false;
    }

    @PluginMethod
    public void stopDiscover(PluginCall call) {
        stopDiscovery();
        call.resolve();
    }

    // ------------------------------------------------------------ invité --
    @PluginMethod
    public void connect(final PluginCall call) {
        final String host = call.getString("host", "");
        final int port = call.getInt("port", 8777);
        stopDiscovery();
        new Thread(() -> {
            try {
                Socket s = new Socket();
                s.connect(new java.net.InetSocketAddress(host, port), 6000);
                attach(s);
            } catch (Exception e) {
                status("error", "connexion refusée");
            }
        }, "lanplay-connect").start();
        call.resolve();
    }

    // ------------------------------------------------------------ échange -
    @PluginMethod
    public void send(PluginCall call) {
        String data = call.getString("data", "");
        BufferedWriter w = out;
        if (w == null) { call.resolve(); return; }
        try {
            w.write(data);
            w.flush();
        } catch (Exception e) {
            status("closed", null);
        }
        call.resolve();
    }

    private void closeQuietly() {
        stopDiscovery();
        if (regListener != null) {
            try { nsd().unregisterService(regListener); } catch (Exception ignored) { }
            regListener = null;
        }
        try { if (out != null) out.close(); } catch (Exception ignored) { }
        try { if (socket != null) socket.close(); } catch (Exception ignored) { }
        try { if (server != null) server.close(); } catch (Exception ignored) { }
        out = null;
        socket = null;
        server = null;
    }

    @PluginMethod
    public void close(PluginCall call) {
        closeQuietly();
        status("closed", null);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        closeQuietly();
        super.handleOnDestroy();
    }
}
