package ru.murph.goblincartel;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoblinCartelVkIdPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
