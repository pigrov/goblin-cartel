package ru.murph.goblincartel;

import android.app.Application;
import android.util.Log;
import com.vk.id.VKID;

public class GoblinCartelApplication extends Application {
    private static final String TAG = "GoblinCartelVKID";

    @Override
    public void onCreate() {
        super.onCreate();

        try {
            VKID.Companion.init(this);
        } catch (IllegalStateException error) {
            Log.i(TAG, "VK ID already initialized");
        } catch (Throwable error) {
            Log.w(TAG, "VK ID init failed", error);
        }
    }
}
