/*
 *  Copyright 2020 Yury Kharchenko
 *  Copyright 2022-2023 Arman Jussupgaliyev
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// RetroDeck modification: support MIDlet lifecycle when hosted outside MicroActivity.
package javax.microedition.shell;

import android.os.Handler;
import android.os.HandlerThread;
import android.os.Message;
import android.os.Process;
import android.util.Log;

import javax.microedition.lcdui.Canvas;
import javax.microedition.lcdui.Displayable;
import javax.microedition.midlet.MIDlet;
import javax.microedition.midlet.MIDletStateChangeException;
import javax.microedition.util.ContextHolder;

import androidx.annotation.NonNull;

import ru.playsoftware.j2meloader.config.Config;

public class MidletThread extends HandlerThread implements Handler.Callback {
	private static final String TAG = MidletThread.class.getName();
	private static volatile UncaughtExceptionHandler previousDefaultHandler;
	private static volatile boolean handlerInstalled;
	private static final UncaughtExceptionHandler uncaughtExceptionHandler = (t, e) -> {
		if (MidletThread.embeddedHost && t != null && t.getId() != android.os.Looper.getMainLooper().getThread().getId()) {
			if (isRunning() || isMidletThrowable(t, e)) {
				Log.e(TAG, "Suppressed uncaught exception in MIDlet worker thread: \"" + t + "\"", e);
				return;
			}
		}
		if (!MidletThread.embeddedHost) {
			Log.e(TAG, "Error in thread: \"" + t + "\" after destroy app called", e);
			return;
		}
		UncaughtExceptionHandler fallback = previousDefaultHandler;
		if (fallback != null && fallback != MidletThread.uncaughtExceptionHandler) {
			fallback.uncaughtException(t, e);
		} else {
			Log.e(TAG, "Uncaught exception in thread: \"" + t + "\"", e);
		}
	};

	private static boolean isMidletThrowable(Thread t, Throwable e) {
		if (t != null) {
			String name = t.getName();
			if (name != null && (name.contains("Midlet") || name.contains("MIDlet") || name.contains("J2me"))) {
				return true;
			}
			if (t.getContextClassLoader() instanceof AppClassLoader) {
				return true;
			}
		}
		Throwable cur = e;
		int depth = 0;
		while (cur != null && depth++ < 6) {
			for (StackTraceElement ste : cur.getStackTrace()) {
				String cls = ste.getClassName();
				String file = ste.getFileName();
				if ((file != null && file.startsWith("dex-id-"))
						|| cls.startsWith("javax.microedition.")
						|| cls.startsWith("com.nokia.mid.")
						|| cls.startsWith("com.mascotcapsule.")
						|| cls.startsWith("com.siemens.")
						|| cls.startsWith("ru.playsoftware.j2meloader.")
						|| cls.startsWith("ru.woesss.j2me.")) {
					return true;
				}
			}
			cur = cur.getCause();
		}
		return false;
	}

	static synchronized void installEmbeddedUncaughtExceptionHandler() {
		if (!handlerInstalled) {
			UncaughtExceptionHandler current = Thread.getDefaultUncaughtExceptionHandler();
			if (current != uncaughtExceptionHandler) {
				previousDefaultHandler = current;
				Thread.setDefaultUncaughtExceptionHandler(uncaughtExceptionHandler);
			}
			handlerInstalled = true;
		}
	}

	private static final int INIT = 0;
	private static final int START = 1;
	private static final int PAUSE = 2;
	private static final int DESTROY = 3;
	private static final int UNINITIALIZED = 0;
	private static final int STARTED = 1;
	private static final int PAUSED = 2;
	private static final int DESTROYED = 3;
	public static String[] startAfterDestroy;
	private static volatile MidletThread instance;
	private static volatile boolean embeddedHost;
	private final MicroLoader microLoader;
	private final String mainClass;
	private MIDlet midlet;
	private final Handler handler;
	private volatile int state;
	private volatile boolean forceCleared;

	private MidletThread(MicroLoader microLoader, String mainClass) {
		super("MidletMain");
		this.microLoader = microLoader;
		this.mainClass = mainClass;
		start();
		handler = new Handler(getLooper(), this);
		handler.obtainMessage(INIT).sendToTarget();
	}

	static void create(MicroLoader microLoader, String mainClass) {
		instance = new MidletThread(microLoader, mainClass);
	}

	static void setEmbeddedHost(boolean embedded) {
		embeddedHost = embedded;
		if (embedded) {
			installEmbeddedUncaughtExceptionHandler();
		}
	}

	public static void notifyDestroyed() {
		Thread caller = Thread.currentThread();
		if (caller instanceof MidletThread && ((MidletThread) caller).forceCleared) {
			Log.w(TAG, "Ignoring late notifyDestroyed() from force-cleared MIDlet thread");
			return;
		}
		Thread.setDefaultUncaughtExceptionHandler(uncaughtExceptionHandler);
		if (instance != null) {
			instance.state = DESTROYED;
		}
		MicroActivity activity = ContextHolder.getActivity();
		// An embedded MIDlet shares the host application's activity. Finishing it here
		// would close RetroDeck when the user exits the game or returns to its menu.
		if (!embeddedHost && activity != null) {
			activity.finish();
		}
		if (!embeddedHost && startAfterDestroy != null) {
			Config.startApp(ContextHolder.getActivity(), startAfterDestroy[0], startAfterDestroy[1], false, startAfterDestroy[2]);
		}
		if (embeddedHost) {
			MidletThread destroyed = instance;
			instance = null;
			if (destroyed != null) destroyed.quitSafely();
			startAfterDestroy = null;
			J2meHost.releaseEmbeddedResources();
		} else {
			Process.killProcess(Process.myPid());
		}
	}

	public static void notifyPaused() {
		MidletThread current = instance;
		if (current != null && current.state != DESTROYED) {
			current.state = PAUSED;
		}
	}

	static void pauseApp() {
		MidletThread current = instance;
		if (current != null)
			current.handler.obtainMessage(PAUSE).sendToTarget();
	}

	public static void resumeApp() {
		MicroActivity activity = ContextHolder.getActivity();
		boolean hostVisible = (activity != null && activity.isVisible()) || J2meHost.getContainer() != null;
		MidletThread current = instance;
		if (current != null && hostVisible)
			current.handler.obtainMessage(START).sendToTarget();
	}

	static void destroyApp() {
		Thread.setDefaultUncaughtExceptionHandler(uncaughtExceptionHandler);
		if (!embeddedHost) {
			new Thread(() -> {
				try {
					Thread.sleep(1000);
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
				Process.killProcess(Process.myPid());
			}, "ForceDestroyTimer").start();
		}
		MicroActivity activity = ContextHolder.getActivity();
		if (activity != null) {
			Displayable current = activity.getCurrent();
			if (current instanceof Canvas) {
				Canvas canvas = (Canvas) current;
				canvas.postKeyPressed(Canvas.KEY_END);
				canvas.postKeyReleased(Canvas.KEY_END);
			}
		}
		if (instance != null) {
			instance.handler.obtainMessage(DESTROY).sendToTarget();
		}
	}

	static void stopEmbedded() {
		MidletThread current = instance;
		if (current != null) {
			current.handler.obtainMessage(DESTROY).sendToTarget();
		}
	}

	static boolean isRunning() {
		return instance != null;
	}

	/** Forcefully detaches a hung embedded MIDlet thread so a new game can boot. */
	static void forceClearEmbedded() {
		MidletThread stuck = instance;
		instance = null;
		startAfterDestroy = null;
		if (stuck != null) {
			stuck.forceCleared = true;
			stuck.state = DESTROYED;
			try {
				stuck.quit();
			} catch (Throwable ignored) {}
			try {
				stuck.interrupt();
			} catch (Throwable ignored) {}
		}
		J2meHost.releaseEmbeddedResources();
	}

	@Override
	public boolean handleMessage(@NonNull Message msg) {
		switch (msg.what) {
			case INIT:
				if (state != UNINITIALIZED) {
					break;
				}
				try {
					midlet = microLoader.loadMIDlet(this.mainClass);
					state = PAUSED;
				} catch (Throwable t) {
					if (embeddedHost) {
						Log.e(TAG, "Embedded MIDlet initialization failed", t);
						state = DESTROYED;
						notifyDestroyed();
					} else {
						throw new RuntimeException("Init midlet failed", t);
					}
				}
				break;
			case START:
				if (state != PAUSED || midlet == null) {
					break;
				}
				try {
					state = STARTED;
					midlet.startApp();
				} catch (MIDletStateChangeException e) {
					state = PAUSED;
					Log.w(TAG, "Midlet doesn't want to start!", e);
				} catch (Throwable t) {
					if (embeddedHost) {
						// Keep a failed embedded resume recoverable. Calling destroyApp here
						// permanently drops the game's Canvas and class loader, leaving the
						// host screen stuck if the MIDlet can start successfully on retry.
						state = PAUSED;
						Log.e(TAG, "Embedded MIDlet startApp failed; keeping it alive for retry", t);
					} else {
						state = DESTROYED;
						throw new RuntimeException("Failed startApp", t);
					}
				} finally {
					if (embeddedHost) {
						javax.microedition.lcdui.Display.refreshEmbeddedDisplay();
					}
				}
				break;
			case PAUSE:
				if (state != STARTED || midlet == null) {
					break;
				}
				try {
					midlet.pauseApp();
					state = PAUSED;
				} catch (Throwable t) {
					if (embeddedHost) {
						// A broken pause callback must not tear down the embedded game. Mark it
						// paused so a later resume can invoke startApp() again.
						state = PAUSED;
						Log.e(TAG, "Embedded MIDlet pauseApp failed; keeping MIDlet alive", t);
					} else {
						state = DESTROYED;
						try {
							if (midlet != null) midlet.destroyApp(true);
						} catch (MIDletStateChangeException ignored) {}
						throw new RuntimeException("Filed pauseApp", t);
					}
				}
				break;
			case DESTROY:
				if (state == DESTROYED) {
					notifyDestroyed();
					break;
				}
				state = DESTROYED;
				try {
					if (midlet != null) {
						midlet.destroyApp(true);
					}
				} catch (MIDletStateChangeException e) {
					Log.w(TAG, "Midlet didn't want to die!", e);
				} catch (Throwable t) {
					Log.e(TAG, "Filed destroyApp:", t);
				}
				notifyDestroyed();
				break;
		}
		return true;
	}
}
