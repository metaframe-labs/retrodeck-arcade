package com.nokia.mid.ui.gestures;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.WeakHashMap;

public final class GestureRegistrationManager {
    private static final Map<Object, List<GestureInteractiveZone>> sZones = new WeakHashMap<>();
    private static final Map<Object, GestureListener> sListeners = new WeakHashMap<>();

    private GestureRegistrationManager() {
    }

    public static synchronized boolean register(Object target, GestureInteractiveZone zone) {
        if (target == null || zone == null) return false;
        List<GestureInteractiveZone> list = sZones.get(target);
        if (list == null) {
            list = new ArrayList<>();
            sZones.put(target, list);
        }
        if (!list.contains(zone)) {
            list.add(zone);
        }
        return true;
    }

    public static synchronized void unregister(Object target, GestureInteractiveZone zone) {
        List<GestureInteractiveZone> list = sZones.get(target);
        if (list != null) {
            list.remove(zone);
        }
    }

    public static synchronized void unregisterAll(Object target) {
        sZones.remove(target);
        sListeners.remove(target);
    }

    public static synchronized void setListener(Object target, GestureListener listener) {
        if (target == null) return;
        if (listener == null) {
            sListeners.remove(target);
        } else {
            sListeners.put(target, listener);
        }
    }

    public static synchronized GestureInteractiveZone[] getInteractiveZones(Object target) {
        List<GestureInteractiveZone> list = sZones.get(target);
        if (list == null) return new GestureInteractiveZone[0];
        return list.toArray(new GestureInteractiveZone[0]);
    }
}
