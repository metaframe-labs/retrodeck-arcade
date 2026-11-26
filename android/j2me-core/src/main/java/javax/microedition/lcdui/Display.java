/*
 * Copyright 2012 Kulikov Dmitriy
 * Copyright 2017-2018 Nikita Shakarun
 * Copyright 2023-2024 Arman Jussupgaliyev
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// RetroDeck modification: route embedded MIDlet displayables into the host container.
package javax.microedition.lcdui;

import androidx.appcompat.app.AlertDialog;

import javax.microedition.lcdui.event.Event;
import javax.microedition.lcdui.event.EventQueue;
import javax.microedition.lcdui.event.RunnableEvent;
import javax.microedition.midlet.MIDlet;
import javax.microedition.util.ContextHolder;

import java.util.concurrent.atomic.AtomicLong;

import ru.woesss.j2me.jar.Descriptor;

@SuppressWarnings("unused")
public class Display {
	public static final int LIST_ELEMENT = 1;
	public static final int CHOICE_GROUP_ELEMENT = 2;
	public static final int ALERT = 3;

	public static final int COLOR_BACKGROUND = 0;
	public static final int COLOR_FOREGROUND = 1;
	public static final int COLOR_HIGHLIGHTED_BACKGROUND = 2;
	public static final int COLOR_HIGHLIGHTED_FOREGROUND = 3;
	public static final int COLOR_BORDER = 4;
	public static final int COLOR_HIGHLIGHTED_BORDER = 5;

	private static final int[] COLORS =
			{
					0xFFD0D0D0,
					0xFF000080,
					0xFF000080,
					0xFFFFFFFF,
					0xFFFFFFFF,
					0xFF000080
			};

	private static Display instance;
	private static final AtomicLong viewGeneration = new AtomicLong();
	static EventQueue queue = new EventQueue();
	private static boolean multiTouchSupported;
	private static String pointerNumber;

	static {
		queue.startProcessing();
	}

	private volatile Displayable current;

	public static Display getDisplay(MIDlet midlet) {
		if (instance == null && midlet != null) {
			String nokiaUiEnhancement = midlet.getAppProperty(Descriptor.NOKIA_UI_ENHANCEMENT);
			if (nokiaUiEnhancement != null) {
				multiTouchSupported = nokiaUiEnhancement.contains("EnableMultiPointTouchEvents");
			}
			instance = new Display();
		}
		return instance;
	}

	/** Returns whether this displayable is the active screen in the embedded host. */
	public static boolean isCurrentDisplayable(Displayable displayable) {
		Display display = instance;
		return display != null && display.current == displayable;
	}

	/** Reattach and redraw the active displayable after an embedded host resume. */
	public static void refreshEmbeddedDisplay() {
		Display display = instance;
		if (display == null) {
			return;
		}
		Displayable active = display.current;
		if (active == null) {
			return;
		}
		display.showCurrent();
		if (active instanceof Canvas) {
			((Canvas) active).repaint();
		}
	}

	private Display() {
	}

	public static void initDisplay() {
		shutdown();
	}

	/** Clears references retained by the current MIDlet's display. */
	public static void shutdown() {
		viewGeneration.incrementAndGet();
		Display oldDisplay = instance;
		instance = null;
		if (oldDisplay != null) {
			if (oldDisplay.current instanceof Canvas) {
				((Canvas) oldDisplay.current).setInvisible();
			}
			oldDisplay.current = null;
		}
		javax.microedition.shell.J2meHost.setCurrentDisplayable(null);
	}

	public static void postEvent(Event event) {
		queue.postEvent(event);
	}

	static EventQueue getEventQueue() {
		return queue;
	}

	public static boolean isMultiTouchSupported() {
		return multiTouchSupported;
	}

	static void setPointerNumber(int pointerNumber) {
		Display.pointerNumber = String.valueOf(pointerNumber);
	}

	static void resetPointerNumber() {
		pointerNumber = null;
	}

	public static String getPointerNumber() {
		return pointerNumber;
	}

	public void setCurrent(Displayable disp) {
		if (disp == current) {
			return;
		}
		if (current instanceof Canvas) {
			Canvas c = (Canvas) current;
			c.setInvisible();
		}
		if (disp instanceof Alert) {
			Alert alert = (Alert) disp;
			alert.setReturnScreen(current);
			showAlert(alert);
		}
		current = disp;
		showCurrent();
	}

	public void setCurrent(final Alert alert, Displayable disp) {
		if (disp == null) {
			throw new NullPointerException();
		}
		alert.setReturnScreen(disp);
		showAlert(alert);
		current = alert;
		showCurrent();
	}

	private void showAlert(Alert alert) {
		ViewHandler.postEvent(() -> {
			AlertDialog alertDialog = alert.prepareDialog();
			alertDialog.show();
			if (alert.finiteTimeout()) {
				ViewHandler.postDelayed(alert::dismiss, alert.getTimeout());
			}
		});
	}

	private void showCurrent() {
		final Displayable next = current;
		final long generation = viewGeneration.incrementAndGet();
		javax.microedition.shell.J2meHost.setCurrentDisplayable(next);
		javax.microedition.shell.MicroActivity activity = ContextHolder.getActivity();
		if (activity != null) {
			activity.setCurrent(next);
			return;
		}
		android.widget.FrameLayout container = javax.microedition.shell.J2meHost.getContainer();
		if (container != null && next != null) {
			container.post(() -> {
				if (generation != viewGeneration.get() || current != next) {
					return;
				}
				container.removeAllViews();
				android.view.View view = next.getDisplayableView();
				if (view != null) {
					container.addView(view, new android.widget.FrameLayout.LayoutParams(
							android.view.ViewGroup.LayoutParams.MATCH_PARENT,
							android.view.ViewGroup.LayoutParams.MATCH_PARENT));
				}
				javax.microedition.lcdui.overlay.OverlayView overlay = javax.microedition.shell.J2meHost.getOverlayView();
				if (overlay != null) {
					container.addView(overlay, new android.widget.FrameLayout.LayoutParams(
							android.view.ViewGroup.LayoutParams.MATCH_PARENT,
							android.view.ViewGroup.LayoutParams.MATCH_PARENT));
				}
				int w = container.getWidth();
				int h = container.getHeight();
				if (w > 0 && h > 0) {
					container.measure(
							android.view.View.MeasureSpec.makeMeasureSpec(w, android.view.View.MeasureSpec.EXACTLY),
							android.view.View.MeasureSpec.makeMeasureSpec(h, android.view.View.MeasureSpec.EXACTLY));
					container.layout(container.getLeft(), container.getTop(), container.getRight(), container.getBottom());
				}
			});
		}
	}

	public Displayable getCurrent() {
		return current;
	}

	public void callSerially(Runnable r) {
		postEvent(RunnableEvent.getInstance(r));
	}

	public boolean flashBacklight(int duration) {
		return false;
	}

	/**
	 * @since MIDP 2.0
	 */
	public boolean vibrate(int duration) {
		return ContextHolder.vibrate(duration);
	}

	public void setCurrentItem(Item item) {
		if (item.hasOwner()) {
			setCurrent(item.getOwner());
		}
	}

	public int numAlphaLevels() {
		return 256;
	}

	public int numColors() {
		return Integer.MAX_VALUE;
	}

	public int getBestImageHeight(int imageType) {
		return 0;
	}

	public int getBestImageWidth(int imageType) {
		return 0;
	}

	public int getBorderStyle(boolean highlighted) {
		return highlighted ? Graphics.SOLID : Graphics.DOTTED;
	}

	public int getColor(int colorSpecifier) {
		return COLORS[colorSpecifier];
	}

	public boolean isColor() {
		return true;
	}
}
