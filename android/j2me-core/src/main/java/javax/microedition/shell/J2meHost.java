package javax.microedition.shell;

import android.app.Application;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.view.KeyEvent;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.File;
import java.lang.ref.WeakReference;
import java.util.LinkedHashMap;
import javax.microedition.lcdui.keyboard.VirtualKeyboard;
import javax.microedition.lcdui.Canvas;
import javax.microedition.lcdui.Displayable;
import javax.microedition.lcdui.List;
import javax.microedition.lcdui.keyboard.KeyMapper;
import javax.microedition.lcdui.overlay.OverlayView;
import javax.microedition.util.ContextHolder;
import ru.woesss.j2me.installer.InstallerHelper;

public final class J2meHost {
    public interface ExitListener {
        void onMidletExit();
    }

    private static final Object sHostLock = new Object();
    private static final Object sBootWorkLock = new Object();
    private static final Handler sMainHandler = new Handler(Looper.getMainLooper());
    private static int sBootGeneration;
    private static volatile boolean sHostTriggeredStop;
    private static volatile ExitListener sExitListener;
    private static WeakReference<FrameLayout> sContainer = new WeakReference<>(null);
    private static WeakReference<OverlayView> sOverlayView = new WeakReference<>(null);
    private static WeakReference<Canvas> sCurrentCanvas = new WeakReference<>(null);
    private static WeakReference<Displayable> sCurrentDisplayable = new WeakReference<>(null);

    public static void setExitListener(ExitListener listener) {
        sExitListener = listener;
    }

    public static void setHostViews(FrameLayout container, OverlayView overlayView) {
        synchronized (sHostLock) {
            sContainer = new WeakReference<>(container);
            sOverlayView = new WeakReference<>(overlayView);
        }
    }

    public static FrameLayout getContainer() {
        return sContainer.get();
    }

    public static OverlayView getOverlayView() {
        return sOverlayView.get();
    }

    public static void setCurrentCanvas(Canvas canvas) {
        sCurrentCanvas = new WeakReference<>(canvas);
    }

    public static void setCurrentDisplayable(Displayable displayable) {
        sCurrentDisplayable = new WeakReference<>(displayable);
        setCurrentCanvas(displayable instanceof Canvas ? (Canvas) displayable : null);
    }

    public static void sendKeyEvent(int keyCode, boolean pressed) {
        Canvas canvas = sCurrentCanvas.get();
        KeyEvent event = new KeyEvent(
                pressed ? KeyEvent.ACTION_DOWN : KeyEvent.ACTION_UP,
                keyCode);
        int midpKeyCode = KeyMapper.convertAndroidKeyCode(keyCode, event);
        // KEYCODE_BACK is mapped to MIDP's valid KEY_OPTIONS_MENU value (0).
        if (midpKeyCode == 0 && keyCode != KeyEvent.KEYCODE_BACK) return;
        if (canvas == null) {
            Displayable displayable = sCurrentDisplayable.get();
            if (displayable == null) return;
            sMainHandler.post(() -> {
                if (sCurrentDisplayable.get() == displayable) {
                    displayable.handleHostKeyEvent(keyCode, pressed);
                }
            });
            return;
        }
        if (pressed) {
            canvas.postKeyPressed(midpKeyCode);
        } else {
            canvas.postKeyReleased(midpKeyCode);
        }
    }

    public static void sendCharacter(int codePoint) {
        Canvas canvas = sCurrentCanvas.get();
        if (canvas != null) {
            canvas.postKeyPressed(codePoint);
            canvas.postKeyReleased(codePoint);
            return;
        }
        Displayable displayable = sCurrentDisplayable.get();
        if (displayable == null) return;
        sMainHandler.post(() -> {
            if (sCurrentDisplayable.get() == displayable) {
                displayable.handleHostCharacter(codePoint);
            }
        });
    }

    public static void stop() {
        synchronized (sHostLock) {
            sBootGeneration++;
            sHostTriggeredStop = true;
            setCurrentDisplayable(null);
            MidletThread.stopEmbedded();
        }
    }

    public static void setPaused(boolean paused) {
        if (paused) {
            MidletThread.pauseApp();
        } else {
            MidletThread.resumeApp();
        }
    }

    public static void onHostViewDropped(FrameLayout container) {
        synchronized (sHostLock) {
            if (sContainer.get() != container) return;
            sBootGeneration++;
            sHostTriggeredStop = true;
            setCurrentDisplayable(null);
            MidletThread.stopEmbedded();
            sContainer = new WeakReference<>(null);
            sOverlayView = new WeakReference<>(null);
        }
    }

    static void releaseEmbeddedResources() {
        final boolean hostInitiated;
        synchronized (sHostLock) {
            hostInitiated = sHostTriggeredStop;
            sHostTriggeredStop = false;
        }
        final ExitListener exitListener = !hostInitiated ? sExitListener : null;

        setCurrentDisplayable(null);
        javax.microedition.lcdui.Display.shutdown();
        AppClassLoader.release();
        ContextHolder.setVk(null);

        final FrameLayout container = getContainer();
        final OverlayView overlay = getOverlayView();
        if (container == null) {
            if (exitListener != null) {
                sMainHandler.post(exitListener::onMidletExit);
            }
            return;
        }
        sMainHandler.post(() -> {
            if (getContainer() == container) {
                container.removeAllViews();
                if (overlay != null) {
                    if (overlay.getParent() instanceof ViewGroup && overlay.getParent() != container) {
                        ((ViewGroup) overlay.getParent()).removeView(overlay);
                    }
                    container.addView(overlay, new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT));
                }
            }
            if (exitListener != null) {
                exitListener.onMidletExit();
            }
        });
    }

    private static boolean isCurrentBoot(int generation) {
        synchronized (sHostLock) {
            return generation == sBootGeneration;
        }
    }

    private static WeakReference<VirtualKeyboard> sAttachedVk = new WeakReference<>(null);

    /** Keep the overlay in sync with the configured keyboard, if one is enabled. */
    private static void attachVirtualKeyboard() {
        final VirtualKeyboard vk = ContextHolder.getVk();
        final OverlayView overlay = getOverlayView();
        if (overlay == null) {
            android.util.Log.w("J2meHost", "attachVirtualKeyboard: no overlay view");
            return;
        }
        if (vk != null) {
            // Assign synchronously so it's set before any Canvas surface callback can run.
            vk.setView(overlay);
        }
        // Layer list is touched from the UI thread only; posting here is ordered before
        // Display.showCurrent()'s container.post(), so the layer exists before surfaceCreated().
        sMainHandler.post(() -> {
            VirtualKeyboard old = sAttachedVk.get();
            if (old != null && old != vk) {
                overlay.removeLayer(old);
            }
            if (vk != null) {
                overlay.addLayer(vk);
            }
            sAttachedVk = new WeakReference<>(vk);
        });
    }

    private static void toast(Context ctx, String msg) {
        sMainHandler.post(() ->
                Toast.makeText(ctx.getApplicationContext(), msg, Toast.LENGTH_LONG).show());
    }

    public static void boot(Context context, String jarPath, Runnable onError) {
        final int generation;
        synchronized (sHostLock) {
            generation = ++sBootGeneration;
        }
        Context appContext = context.getApplicationContext();
        if (appContext == null) appContext = context;
        final Context hostContext = appContext;
        ru.playsoftware.j2meloader.EmulatorApplication.init(hostContext);
        new Thread(() -> {
            synchronized (sBootWorkLock) {
                if (!isCurrentBoot(generation)) return;
                MidletThread.setEmbeddedHost(true);
                try {
                    if (MidletThread.isRunning()) {
                        sHostTriggeredStop = true;
                        MidletThread.stopEmbedded();
                        long deadline = System.currentTimeMillis() + 1500;
                        while (MidletThread.isRunning() && isCurrentBoot(generation)
                                && System.currentTimeMillis() < deadline) {
                            Thread.sleep(50);
                        }
                        if (!isCurrentBoot(generation)) return;
                        if (MidletThread.isRunning()) {
                            android.util.Log.w("J2meHost", "Previous MIDlet did not stop in time; force-clearing");
                            sHostTriggeredStop = true;
                            MidletThread.forceClearEmbedded();
                        }
                    }

                    File input = new File(jarPath);
                    String appDirPath = jarPath;
                    if (input.isFile() && jarPath.toLowerCase().endsWith(".jar")) {
                        Application app = (Application) hostContext.getApplicationContext();
                        appDirPath = InstallerHelper.installJar(app, jarPath);
                    }
                    try {
                        new File(appDirPath).setLastModified(System.currentTimeMillis());
                    } catch (Throwable ignored) {
                    }
                    if (!isCurrentBoot(generation)) return;

                    MicroLoader loader = new MicroLoader(hostContext, appDirPath);
                    if (!loader.init()) {
                        throw new IllegalStateException("MicroLoader.init() failed");
                    }
                    LinkedHashMap<String, String> midlets = loader.loadMIDletList();
                    if (midlets == null || midlets.isEmpty()) {
                        throw new IllegalStateException("No MIDlets found in selected JAR");
                    }
                    String firstMidlet = midlets.keySet().iterator().next();
                    loader.applyConfiguration();
                    // Legacy 128x128 Nokia Series 40 MIDlets (Bounce, Nature Park, etc.)
                    if ("com.nokia.mid.appl.boun.Bounce".equals(firstMidlet)
                            || "com.nokia.mid.appl.np.np".equals(firstMidlet)) {
                        Displayable.setVirtualSize(128, 128);
                    }
                    // Fill the complete RetroDeck LCD viewport, including its side bars.
                    // Scale type 2 stretches the MIDlet frame to the view bounds without cropping.
                    Canvas.setScale(2, 2, 100);
                    // RetroDeck supplies its own controller below the LCD. The fork's phone keyboard
                    // overlays the game and reserves part of the canvas height, so disable it here.
                    ContextHolder.setVk(null);
                    attachVirtualKeyboard();
                    if (!isCurrentBoot(generation)) {
                        releaseEmbeddedResources();
                        return;
                    }
                    synchronized (sHostLock) {
                        if (generation != sBootGeneration) {
                            releaseEmbeddedResources();
                            return;
                        }
                        sHostTriggeredStop = false;
                        MidletThread.create(loader, firstMidlet);
                        MidletThread.resumeApp();
                    }
                } catch (Throwable t) {
                    if (isCurrentBoot(generation)) {
                        Throwable root = t;
                        while (root.getCause() != null && root.getCause() != root) {
                            root = root.getCause();
                        }
                        String msg = root.getMessage() != null ? root.getMessage() : root.getClass().getSimpleName();
                        toast(hostContext, "J2ME ERR: " + msg);
                        android.util.Log.e("J2meHost", "boot error", t);
                        if (!MidletThread.isRunning()) {
                            releaseEmbeddedResources();
                            MidletThread.setEmbeddedHost(false);
                        }
                        if (onError != null) onError.run();
                    }
                }
            }
        }, "J2meBootThread").start();
    }
}
