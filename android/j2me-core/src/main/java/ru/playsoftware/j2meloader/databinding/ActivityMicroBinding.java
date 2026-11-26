package ru.playsoftware.j2meloader.databinding;

import android.view.LayoutInflater;
import android.view.View;
import android.widget.FrameLayout;
import androidx.appcompat.widget.Toolbar;
import javax.microedition.lcdui.overlay.OverlayView;

public final class ActivityMicroBinding {
    private final FrameLayout rootView;
    public final OverlayView overlayView;
    public final FrameLayout displayableContainer;
    public final FrameLayout midletFrame;
    public final View statusbarView;
    public final Toolbar toolbar;

    private ActivityMicroBinding(FrameLayout rootView) {
        this.rootView = rootView;
        this.overlayView = new OverlayView(rootView.getContext(), null);
        this.displayableContainer = new FrameLayout(rootView.getContext());
        this.midletFrame = rootView;
        this.statusbarView = new View(rootView.getContext());
        this.toolbar = new Toolbar(rootView.getContext());
    }

    public FrameLayout getRoot() {
        return rootView;
    }

    public static ActivityMicroBinding inflate(LayoutInflater inflater) {
        return new ActivityMicroBinding(new FrameLayout(inflater.getContext()));
    }
}
