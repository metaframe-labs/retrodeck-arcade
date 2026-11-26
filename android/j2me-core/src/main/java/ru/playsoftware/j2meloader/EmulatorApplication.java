package ru.playsoftware.j2meloader;

import android.content.Context;

public class EmulatorApplication {
    private static Context sContext;

    public static void init(Context context) {
        sContext = context.getApplicationContext();
    }

    public static Context getInstance() {
        return sContext;
    }
}
