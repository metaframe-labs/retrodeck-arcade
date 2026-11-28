package com.nokia.mid.ui.gestures;

public class GestureInteractiveZone {
    public static final int GESTURE_TAP = GestureEvent.GESTURE_TAP;
    public static final int GESTURE_LONG_PRESS = GestureEvent.GESTURE_LONG_PRESS;
    public static final int GESTURE_DRAG = GestureEvent.GESTURE_DRAG;
    public static final int GESTURE_DROP = GestureEvent.GESTURE_DROP;
    public static final int GESTURE_FLICK = GestureEvent.GESTURE_FLICK;
    public static final int GESTURE_PINCH = GestureEvent.GESTURE_PINCH;
    public static final int GESTURE_ALL = GestureEvent.GESTURE_ALL;

    private int gestures;
    private int timeInterval;
    private int x;
    private int y;
    private int width;
    private int height;

    public GestureInteractiveZone(int gestures) {
        this(gestures, 0);
    }

    public GestureInteractiveZone(int gestures, int timeInterval) {
        this.gestures = gestures;
        this.timeInterval = timeInterval;
    }

    public int getGestures() {
        return gestures;
    }

    public void setGestures(int gestures) {
        this.gestures = gestures;
    }

    public int getTimeInterval() {
        return timeInterval;
    }

    public void setTimeInterval(int timeInterval) {
        this.timeInterval = timeInterval;
    }

    public void setRectangle(int x, int y, int width, int height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public boolean supports(int type) {
        return (gestures & type) != 0;
    }

    public boolean contains(int px, int py) {
        if (width <= 0 || height <= 0) return true;
        return px >= x && px < x + width && py >= y && py < y + height;
    }
}
