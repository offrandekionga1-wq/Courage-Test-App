package com.neonclash.game;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // partie à deux sur le même Wi-Fi
        registerPlugin(LanPlayPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
