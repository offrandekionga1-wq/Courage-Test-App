package com.kionga.avatarlive;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.util.DisplayMetrics;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.OrientationEventListener;
import android.view.ScaleGestureDetector;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Fenêtre flottante : l'avatar reste affiché par-dessus les autres applications (un jeu, par exemple).
 * Elle héberge la même application web, en mode « overlay », avec un fond transparent.
 */
public class OverlayService extends Service {

    public static final String ACTION_STOP = "com.kionga.avatarlive.STOP_OVERLAY";
    public static volatile boolean running = false;

    private WindowManager wm;
    private WindowManager.LayoutParams lp;
    private Root root;
    private WebView web;
    private LinearLayout bar;
    private SharedPreferences prefs;
    private int baseW, baseH;
    private float scale = 1f;
    private String mode = "auto";
    private int phys = 0, lastLand = 270;
    private volatile int rot = 0;
    private OrientationEventListener sensor;
    private final Runnable hideBar = () -> { if (bar != null) bar.setVisibility(View.GONE); };

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String shape = intent != null && intent.getStringExtra("shape") != null ? intent.getStringExtra("shape") : "portrait";
        int size = intent != null ? intent.getIntExtra("size", 45) : 45;
        mode = intent != null && intent.getStringExtra("orient") != null ? intent.getStringExtra("orient") : "auto";
        try {
            goForeground();
            prefs = getSharedPreferences("overlay", MODE_PRIVATE);
            wm = (WindowManager) getSystemService(WINDOW_SERVICE);
            computeBase(shape, size);
            if (root == null) createWindow();
            watchOrientation();
            updateRot();
            applySize();
            running = true;
        } catch (Exception e) {
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private void goForeground() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel("overlay", "Avatar par-dessus les autres applis", NotificationManager.IMPORTANCE_LOW));
        }
        int pi = Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT : PendingIntent.FLAG_UPDATE_CURRENT;
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK), pi);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, OverlayService.class).setAction(ACTION_STOP), pi);
        Notification n = new NotificationCompat.Builder(this, "overlay")
            .setSmallIcon(android.R.drawable.ic_menu_camera)
            .setContentTitle("Avatar Live — superposition active")
            .setContentText("Touchez pour revenir à l'application.")
            .setOngoing(true)
            .setContentIntent(open)
            .addAction(0, "Arrêter", stop)
            .build();
        if (Build.VERSION.SDK_INT >= 30) {
            int type = ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA;
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                type |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
            }
            startForeground(1, n, type);
        } else {
            startForeground(1, n);
        }
    }

    private void computeBase(String shape, int size) {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        float side = Math.min(dm.widthPixels, dm.heightPixels) * Math.max(20, Math.min(90, size)) / 100f;
        if ("landscape".equals(shape)) { baseW = (int) side; baseH = (int) (side * 0.72f); }
        else if ("square".equals(shape)) { baseW = (int) (side * 0.85f); baseH = (int) (side * 0.85f); }
        else { baseW = (int) (side * 0.72f); baseH = (int) side; }
        scale = 1f;
    }

    /** Suit la position réelle du téléphone (capteur), même quand l'écran ne tourne pas. */
    private void watchOrientation() {
        if (sensor != null) return;
        sensor = new OrientationEventListener(this) {
            @Override
            public void onOrientationChanged(int deg) {
                if (deg == ORIENTATION_UNKNOWN) return;
                int near = ((deg + 45) / 90 * 90) % 360;
                int diff = Math.abs(deg - near);
                if (diff > 180) diff = 360 - diff;
                if (diff < 30 && near != phys) {
                    phys = near;
                    if (near == 90 || near == 270) lastLand = near;
                    updateRot();
                }
            }
        };
        if (sensor.canDetectOrientation()) sensor.enable();
    }

    /** rot = rotation du téléphone (sens horaire) que l'écran n'a pas déjà compensée ; la page tourne l'avatar d'autant. */
    private void updateRot() {
        int shown = (360 - wm.getDefaultDisplay().getRotation() * 90) % 360;
        int wanted = "portrait".equals(mode) ? 0 : "landscape".equals(mode) ? lastLand : phys;
        int r = ((wanted - shown) % 360 + 360) % 360;
        if (r != rot) {
            rot = r;
            if (root != null) applySize();
        }
    }

    private class Host {
        @JavascriptInterface
        public int rot() {
            return rot;
        }
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    private TextView button(String label, View.OnClickListener l) {
        TextView t = new TextView(this);
        t.setText(label);
        t.setTextColor(Color.WHITE);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        t.setGravity(Gravity.CENTER);
        t.setPadding(dp(10), dp(6), dp(10), dp(6));
        t.setOnClickListener(v -> { l.onClick(v); showBar(); });
        return t;
    }

    private void createWindow() {
        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        WebSettings ws = web.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new Host(), "OverlayHost");
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return serve(request.getUrl());
            }
        });

        root = new Root(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        bar = new LinearLayout(this);
        bar.setOrientation(LinearLayout.HORIZONTAL);
        bar.setBackgroundColor(Color.argb(190, 0, 0, 0));
        bar.setClickable(true);
        bar.addView(button("－", v -> resize(0.87f)));
        bar.addView(button("＋", v -> resize(1.15f)));
        bar.addView(button("Appli", v -> startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))));
        bar.addView(button("✕", v -> stopSelf()));
        bar.setVisibility(View.GONE);
        FrameLayout.LayoutParams bp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        bp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        root.addView(bar, bp);

        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        lp = new WindowManager.LayoutParams(baseW, baseH, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS | WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = prefs.getInt("x", dp(16));
        lp.y = prefs.getInt("y", dp(120));
        clamp();
        wm.addView(root, lp);
        web.loadUrl("https://localhost/index.html?overlay=1");
    }

    /** Sert les fichiers de l'application depuis l'APK, sous la même adresse que l'appli principale (réglages et modèles partagés). */
    private WebResourceResponse serve(Uri u) {
        if (u == null || !"localhost".equals(u.getHost())) return null;
        String path = u.getPath();
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-cache");
        try {
            InputStream in = getAssets().open("public" + path);
            String mime = mime(path);
            boolean text = mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json");
            WebResourceResponse r = new WebResourceResponse(mime, text ? "UTF-8" : null, in);
            r.setResponseHeaders(headers);
            return r;
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", headers, new ByteArrayInputStream(new byte[0]));
        }
    }

    private static String mime(String p) {
        String s = p.toLowerCase();
        if (s.endsWith(".html")) return "text/html";
        if (s.endsWith(".js") || s.endsWith(".mjs")) return "text/javascript";
        if (s.endsWith(".wasm")) return "application/wasm";
        if (s.endsWith(".json")) return "application/json";
        if (s.endsWith(".css")) return "text/css";
        if (s.endsWith(".png")) return "image/png";
        if (s.endsWith(".jpg") || s.endsWith(".jpeg")) return "image/jpeg";
        if (s.endsWith(".svg")) return "image/svg+xml";
        return "application/octet-stream";
    }

    private void clamp() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        lp.x = Math.max(-lp.width / 2, Math.min(lp.x, dm.widthPixels - lp.width / 2));
        lp.y = Math.max(0, Math.min(lp.y, dm.heightPixels - lp.height / 2));
    }

    private void applySize() {
        boolean side = rot % 180 != 0;                 // avatar tourné : la fenêtre garde le format choisi, vu par l'utilisateur
        lp.width = (int) ((side ? baseH : baseW) * scale);
        lp.height = (int) ((side ? baseW : baseH) * scale);
        clamp();
        wm.updateViewLayout(root, lp);
    }

    private void resize(float f) {
        scale = Math.max(0.4f, Math.min(2.6f, scale * f));
        applySize();
    }

    private void showBar() {
        bar.setVisibility(View.VISIBLE);
        root.removeCallbacks(hideBar);
        root.postDelayed(hideBar, 4000);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        if (root != null) { updateRot(); applySize(); }
    }

    @Override
    public void onDestroy() {
        running = false;
        if (sensor != null) { sensor.disable(); sensor = null; }
        if (root != null) {
            try { wm.removeView(root); } catch (Exception ignored) {}
            root = null;
        }
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }

    /** Conteneur tactile : glisser pour déplacer, pincer pour redimensionner, double appui pour afficher les boutons. */
    private class Root extends FrameLayout {
        private float lastX, lastY;
        private boolean moved;
        private long lastTap;
        private final ScaleGestureDetector pinch;

        Root(Context c) {
            super(c);
            pinch = new ScaleGestureDetector(c, new ScaleGestureDetector.SimpleOnScaleGestureListener() {
                @Override
                public boolean onScale(ScaleGestureDetector d) {
                    resize(d.getScaleFactor());
                    return true;
                }
            });
        }

        @Override
        public boolean onInterceptTouchEvent(MotionEvent ev) {
            return !(bar.getVisibility() == View.VISIBLE && ev.getY() <= bar.getBottom() && ev.getX() >= bar.getLeft() && ev.getX() <= bar.getRight());
        }

        @Override
        public boolean onTouchEvent(MotionEvent ev) {
            pinch.onTouchEvent(ev);
            switch (ev.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    lastX = ev.getRawX();
                    lastY = ev.getRawY();
                    moved = false;
                    break;
                case MotionEvent.ACTION_POINTER_DOWN:
                    moved = true;
                    break;
                case MotionEvent.ACTION_MOVE:
                    if (ev.getPointerCount() == 1 && !pinch.isInProgress()) {
                        float dx = ev.getRawX() - lastX, dy = ev.getRawY() - lastY;
                        if (moved || Math.abs(dx) + Math.abs(dy) > dp(6)) {
                            moved = true;
                            lp.x += (int) dx;
                            lp.y += (int) dy;
                            lastX = ev.getRawX();
                            lastY = ev.getRawY();
                            wm.updateViewLayout(this, lp);
                        }
                    }
                    break;
                case MotionEvent.ACTION_UP:
                    if (moved) {
                        prefs.edit().putInt("x", lp.x).putInt("y", lp.y).apply();
                    } else {
                        long now = SystemClock.uptimeMillis();
                        if (now - lastTap < 350) showBar();
                        lastTap = now;
                    }
                    break;
                default:
                    break;
            }
            return true;
        }
    }
}
