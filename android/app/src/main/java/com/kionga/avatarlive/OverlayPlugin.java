package com.kionga.avatarlive;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Pont entre l'application web et la fenêtre flottante (avatar par-dessus les autres applis). */
@CapacitorPlugin(
    name = "Overlay",
    permissions = {
        @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera"),
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class OverlayPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        Context c = getContext();
        if (!Settings.canDrawOverlays(c)) {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + c.getPackageName()));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(i);
            call.reject("overlay_permission");
            return;
        }
        if (getPermissionState("camera") != PermissionState.GRANTED) {
            requestPermissionForAliases(new String[] { "camera", "notifications" }, call, "permsDone");
            return;
        }
        launch(call);
    }

    @PermissionCallback
    private void permsDone(PluginCall call) {
        if (getPermissionState("camera") == PermissionState.GRANTED) launch(call);
        else call.reject("camera_permission");
    }

    private void launch(PluginCall call) {
        Intent i = new Intent(getContext(), OverlayService.class);
        i.putExtra("shape", call.getString("shape", "portrait"));
        i.putExtra("size", call.getInt("size", 45));
        i.putExtra("orient", call.getString("orient", "auto"));
        try {
            ContextCompat.startForegroundService(getContext(), i);
        } catch (Exception e) {
            call.reject("start_failed: " + e.getMessage());
            return;
        }
        getActivity().moveTaskToBack(true);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), OverlayService.class));
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("running", OverlayService.running);
        call.resolve(r);
    }

    @PluginMethod
    public void setOrientation(PluginCall call) {
        String m = call.getString("mode", "auto");
        final int o = "portrait".equals(m) ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
            : "landscape".equals(m) ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
            : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
        getActivity().runOnUiThread(() -> getActivity().setRequestedOrientation(o));
        call.resolve();
    }

    /** Revenir dans l'application ferme la fenêtre flottante : la caméra ne sert qu'à un seul endroit à la fois. */
    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        if (OverlayService.running) {
            getContext().stopService(new Intent(getContext(), OverlayService.class));
            notifyListeners("stopped", new JSObject());
        }
    }
}
