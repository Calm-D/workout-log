package com.local.workoutlog;

import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SafeArea")
public class SafeAreaPlugin extends Plugin {

    @PluginMethod
    public void getInsets(PluginCall call) {
        if (getActivity() == null) {
            call.reject("Activity is not available");
            return;
        }

        View decorView = getActivity().getWindow().getDecorView();
        WindowInsetsCompat windowInsets = ViewCompat.getRootWindowInsets(decorView);

        int top = 0;
        int bottom = 0;

        if (windowInsets != null) {
            Insets systemBars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            Insets displayCutout = windowInsets.getInsets(WindowInsetsCompat.Type.displayCutout());
            top = Math.max(systemBars.top, displayCutout.top);
            bottom = Math.max(systemBars.bottom, displayCutout.bottom);
        }

        if (top == 0) {
            int statusBarId = getActivity()
                .getResources()
                .getIdentifier("status_bar_height", "dimen", "android");
            if (statusBarId > 0) {
                top = getActivity().getResources().getDimensionPixelSize(statusBarId);
            }
        }

        float density = getActivity().getResources().getDisplayMetrics().density;
        JSObject result = new JSObject();
        result.put("top", (double) top / density);
        result.put("bottom", (double) bottom / density);
        call.resolve(result);
    }
}
