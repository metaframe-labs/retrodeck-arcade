/*
 * Copyright 2012 Kulikov Dmitriy
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

package javax.microedition.lcdui;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

/**
 * Class for centrally creating and modifying View.
 * Needed, because Android does not allow to change the View from different threads.
 */
public class ViewHandler {
	private static final String TAG = "ViewHandler";
	private static final Handler handler = new Handler(Looper.getMainLooper());

	public static void postEvent(Runnable event) {
		if (event == null) return;
		handler.post(() -> {
			try {
				event.run();
			} catch (Throwable t) {
				Log.e(TAG, "Uncaught exception in J2ME UI task", t);
			}
		});
	}

	public static void postDelayed(Runnable event, long delayMillis) {
		if (event == null) return;
		handler.postDelayed(() -> {
			try {
				event.run();
			} catch (Throwable t) {
				Log.e(TAG, "Uncaught exception in delayed J2ME UI task", t);
			}
		}, delayMillis);
	}
}