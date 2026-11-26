package ru.playsoftware.j2meloader.databinding;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;

public final class SoftButtonBarBinding {
    private final LinearLayout rootView;
    public final LinearLayout rootLayout;
    public final Button leftButton;
    public final Button middleButton;
    public final Button rightButton;

    private SoftButtonBarBinding(LinearLayout rootView) {
        this.rootView = rootView;
        this.rootLayout = rootView;
        this.leftButton = new Button(rootView.getContext());
        this.middleButton = new Button(rootView.getContext());
        this.rightButton = new Button(rootView.getContext());
    }

    public LinearLayout getRoot() {
        return rootView;
    }

    public static SoftButtonBarBinding inflate(LayoutInflater inflater, ViewGroup parent, boolean attachToParent) {
        LinearLayout layout = new LinearLayout(inflater.getContext());
        if (attachToParent && parent != null) {
            parent.addView(layout);
        }
        return new SoftButtonBarBinding(layout);
    }
}
