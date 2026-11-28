package com.nokia.mid.ui.gestures;

public interface GestureEvent {
    int GESTURE_TAP = 0x1;
    int GESTURE_LONG_PRESS = 0x2;
    int GESTURE_DRAG = 0x4;
    int GESTURE_DROP = 0x8;
    int GESTURE_FLICK = 0x10;
    int GESTURE_PINCH = 0x20;
    int GESTURE_ALL = 0x3F;

    int getType();

    int getStartX();

    int getStartY();

    int getDragDistanceX();

    int getDragDistanceY();

    float getFlickDirection();

    int getFlickSpeed();

    int getFlickSpeedX();

    int getFlickSpeedY();

    int getPinchDistanceStarting();

    int getPinchDistanceCurrent();

    int getPinchCenterX();

    int getPinchCenterY();
}
