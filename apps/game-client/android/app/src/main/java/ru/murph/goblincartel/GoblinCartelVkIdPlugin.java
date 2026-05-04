package ru.murph.goblincartel;

import android.app.Activity;
import android.util.Log;
import androidx.lifecycle.LifecycleOwner;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.vk.id.AccessToken;
import com.vk.id.VKID;
import com.vk.id.VKIDAuthFail;
import com.vk.id.auth.AuthCodeData;
import com.vk.id.auth.VKIDAuthCallback;
import com.vk.id.auth.VKIDAuthParams;

@CapacitorPlugin(name = "GoblinCartelVkId")
public class GoblinCartelVkIdPlugin extends Plugin {
    private static final String TAG = "GoblinCartelVKID";

    @PluginMethod
    public void requestVkIdentity(PluginCall call) {
        Activity activity = getActivity();
        if (!(activity instanceof LifecycleOwner)) {
            call.reject("Current activity is not a lifecycle owner", "native_error");
            return;
        }

        activity.runOnUiThread(() -> authorize((LifecycleOwner) activity, call));
    }

    private void authorize(LifecycleOwner lifecycleOwner, PluginCall call) {
        try {
            VKID.Companion.getInstance().authorize(
                lifecycleOwner,
                new VKIDAuthCallback() {
                    @Override
                    public void onAuth(AccessToken accessToken) {
                        JSObject result = new JSObject();
                        result.put("accessToken", accessToken.getToken());
                        result.put("providerUserId", String.valueOf(accessToken.getUserID()));
                        result.put("expiresAt", accessToken.getExpireTime());

                        String idToken = accessToken.getIdToken();
                        if (idToken != null && !idToken.trim().isEmpty()) {
                            result.put("idToken", idToken);
                        }

                        call.resolve(result);
                    }

                    @Override
                    public void onAuthCode(AuthCodeData data, boolean isCompletion) {
                        if (!isCompletion) {
                            return;
                        }

                        JSObject result = new JSObject();
                        result.put("authorizationCode", data.getCode());
                        result.put("deviceId", data.getDeviceId());
                        call.resolve(result);
                    }

                    @Override
                    public void onFail(VKIDAuthFail fail) {
                        String code = fail instanceof VKIDAuthFail.Canceled ? "cancelled" : "native_error";
                        call.reject(fail.getDescription(), code);
                    }
                },
                new VKIDAuthParams.Builder().build()
            );
        } catch (Throwable error) {
            Log.w(TAG, "VK ID auth failed", error);
            call.reject("VK ID auth failed", "native_error");
        }
    }
}
