/*
 * Copyright 2012 Kulikov Dmitriy
 * Copyright 2015-2016 Nickolay Savchenko
 * Copyright 2017-2020 Nikita Shakarun
 * Copyright 2020-2023 Yriy Kharchenko
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

// RetroDeck modification: route controller keys to embedded non-Canvas MIDP screens.
package javax.microedition.lcdui;

import android.content.Context;
import android.text.Editable;
import android.text.TextUtils;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewGroup.LayoutParams;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.ArrayList;

import javax.microedition.lcdui.commands.AbstractSoftKeysBar;
import javax.microedition.lcdui.event.CommandActionEvent;
import javax.microedition.lcdui.event.SimpleEvent;
import javax.microedition.shell.MicroActivity;
import javax.microedition.util.ContextHolder;

public abstract class Displayable {
	private static final int TICKER_NO_ACTION = 0;
	private static final int TICKER_SHOW = 1;
	private static final int TICKER_HIDE = 2;

	protected static int virtualWidth;
	protected static int virtualHeight;

	final ArrayList<Command> commands = new ArrayList<>();
	CommandListener listener;
	AbstractSoftKeysBar softBar;

	private String title;
	private int tickerMode;
	private Ticker ticker;
	private LinearLayout layout;
	private TextView marquee;

	private final SimpleEvent msgSetTicker = new SimpleEvent() {
		@Override
		public void process() {
			if (ticker != null) {
				marquee.setText(ticker.getString());
			}
			switch (tickerMode) {
				case TICKER_SHOW:
					layout.addView(marquee, 0);
					break;
				case TICKER_HIDE:
					layout.removeView(marquee);
					break;
			}
			tickerMode = TICKER_NO_ACTION;
		}
	};

	public static void setVirtualSize(int virtualWidth, int virtualHeight) {
		if (virtualWidth <= 0) {
			if (virtualHeight <= 0) {
				virtualWidth = ContextHolder.getDisplayWidth();
				virtualHeight = ContextHolder.getDisplayHeight();
			} else {
				virtualWidth = virtualHeight * ContextHolder.getDisplayWidth() / ContextHolder.getDisplayHeight();
			}
		} else if (virtualHeight <= 0) {
			virtualHeight = virtualWidth * ContextHolder.getDisplayHeight() / ContextHolder.getDisplayWidth();
		}
		Displayable.virtualWidth = virtualWidth;
		Displayable.virtualHeight = virtualHeight;
	}

	public static int getVirtualWidth() {
		return virtualWidth;
	}

	public static int getVirtualHeight() {
		return virtualHeight;
	}

	public void setTitle(String title) {
		this.title = title;

		if (isShown()) {
			ViewHandler.postEvent(() -> {
				MicroActivity activity = ContextHolder.getActivity();
				if (activity != null) {
					activity.setTitle(title);
				}
			});
		}
	}

	public String getTitle() {
		return title;
	}

	public boolean isShown() {
		MicroActivity activity = ContextHolder.getActivity();
		if (activity != null) {
			return activity.isVisible() && activity.getCurrent() == this;
		}
		return javax.microedition.shell.J2meHost.getContainer() != null
				&& Display.isCurrentDisplayable(this);
	}

	public View getDisplayableView() {
		if (layout == null) {
			Context context = ContextHolder.getContext();

			layout = new LinearLayout(context);
			layout.setOrientation(LinearLayout.VERTICAL);
			layout.setLayoutParams(new FrameLayout.LayoutParams(
					LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
			if (!(this instanceof Canvas)) {
				layout.setBackgroundColor(0xFF0F172A);
			}

			marquee = new TextView(context);
			marquee.setTextAppearance(context, android.R.style.TextAppearance_Medium);
			marquee.setEllipsize(TextUtils.TruncateAt.MARQUEE);
			marquee.setSelected(true);
			marquee.setSingleLine();

			if (ticker != null) {
				marquee.setText(ticker.getString());
				layout.addView(marquee);
			}
		}

		return layout;
	}

	public void clearDisplayableView() {
		layout = null;
		marquee = null;
	}

	public void addCommand(Command cmd) {
		if (cmd == null) {
			throw new NullPointerException();
		}
		if (commands.contains(cmd)) {
			return;
		}
		commands.add(cmd);
		if (softBar != null) {
			softBar.notifyChanged();
		}
	}

	public void removeCommand(Command cmd) {
		commands.remove(cmd);
		if (softBar != null) {
			softBar.notifyChanged();
		}
	}

	int countCommands() {
		return commands.size();
	}

	public Command[] getCommands() {
		return commands.toArray(new Command[0]);
	}

	public void setCommandListener(CommandListener listener) {
		this.listener = listener;
	}

	public void fireCommandAction(Command c) {
		if (listener != null) {
			Display.postEvent(CommandActionEvent.getInstance(listener, c, this));
		}
	}

	/** Routes controller input to an embedded non-Canvas MIDP screen. */
	public boolean handleHostKeyEvent(int keyCode, boolean pressed) {
		boolean softLeft = keyCode == KeyEvent.KEYCODE_SOFT_LEFT;
		boolean softRight = keyCode == KeyEvent.KEYCODE_SOFT_RIGHT
				|| keyCode == KeyEvent.KEYCODE_BACK;
		boolean confirm = keyCode == KeyEvent.KEYCODE_ENTER
				|| keyCode == KeyEvent.KEYCODE_DPAD_CENTER
				|| keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER;
		if (softLeft || softRight || confirm) {
			if (!pressed) {
				return true;
			}
			Command command = softRight
					? findHostCommand(Command.BACK, Command.EXIT, Command.CANCEL, Command.STOP)
					: findHostCommand(Command.OK, Command.SCREEN, Command.HELP, Command.ITEM);
			if (command == null && confirm && commands.size() == 1) {
				command = commands.get(0);
			}
			if (command == null && !commands.isEmpty()) {
				command = softRight ? commands.get(commands.size() - 1) : commands.get(0);
			}
			if (command != null) {
				fireCommandAction(command);
				return true;
			}
		}

		View view = getDisplayableView();
		if (view == null) {
			return false;
		}
		EditText editText = findTargetEditText(view);
		if (editText != null && keyCode == KeyEvent.KEYCODE_DEL) {
			if (!pressed) {
				return true;
			}
			editText.requestFocus();
			Editable editable = editText.getText();
			if (editable != null) {
				int start = Math.max(0, editText.getSelectionStart());
				int end = Math.max(0, editText.getSelectionEnd());
				if (start > end) {
					int tmp = start;
					start = end;
					end = tmp;
				}
				if (end > start) {
					editable.delete(start, end);
				} else if (start > 0) {
					editable.delete(start - 1, start);
				}
			}
			return true;
		}
		View dispatchTarget = editText != null ? editText : view;
		dispatchTarget.setFocusable(true);
		dispatchTarget.setFocusableInTouchMode(true);
		if (!dispatchTarget.hasFocus()) {
			dispatchTarget.requestFocus();
		}
		return dispatchTarget.dispatchKeyEvent(new KeyEvent(
				pressed ? KeyEvent.ACTION_DOWN : KeyEvent.ACTION_UP,
				keyCode));
	}

	/** Inserts a typed character from the RetroDeck keyboard into the active EditText, if any. */
	public boolean handleHostCharacter(int codePoint) {
		View view = getDisplayableView();
		if (view == null) {
			return false;
		}
		EditText editText = findTargetEditText(view);
		if (editText == null) {
			return false;
		}
		editText.requestFocus();
		String str = new String(Character.toChars(codePoint));
		Editable editable = editText.getText();
		if (editable != null) {
			int start = Math.max(0, editText.getSelectionStart());
			int end = Math.max(0, editText.getSelectionEnd());
			if (start > end) {
				int tmp = start;
				start = end;
				end = tmp;
			}
			editable.replace(start, end, str);
		} else {
			editText.append(str);
		}
		return true;
	}

	private static EditText findTargetEditText(View root) {
		if (root == null) return null;
		View focused = root.findFocus();
		if (focused instanceof EditText && focused.isEnabled()) {
			return (EditText) focused;
		}
		if (root instanceof EditText && root.isEnabled()) {
			return (EditText) root;
		}
		if (root instanceof ViewGroup) {
			ViewGroup group = (ViewGroup) root;
			for (int i = 0; i < group.getChildCount(); i++) {
				EditText found = findTargetEditText(group.getChildAt(i));
				if (found != null) {
					return found;
				}
			}
		}
		return null;
	}

	private Command findHostCommand(int... commandTypes) {
		for (int commandType : commandTypes) {
			for (Command command : commands) {
				if (command.getCommandType() == commandType) {
					return command;
				}
			}
		}
		return null;
	}

	public int getWidth() {
		return virtualWidth;
	}

	public int getHeight() {
		return virtualHeight;
	}

	public void setTicker(Ticker newticker) {
		if (layout != null) {
			if (ticker == null && newticker != null) {
				tickerMode = TICKER_SHOW;
			} else if (ticker != null && newticker == null) {
				tickerMode = TICKER_HIDE;
			}

			ticker = newticker;

			ViewHandler.postEvent(msgSetTicker);
		} else {
			ticker = newticker;
		}
	}

	public Ticker getTicker() {
		return ticker;
	}

	protected void sizeChanged(int w, int h) {
	}

	public boolean menuItemSelected(int id) {
		if (listener == null) {
			return true;
		}

		Command[] array = commands.toArray(new Command[0]);
		for (Command cmd : array) {
			if (cmd.hashCode() == id) {
				Display.postEvent(CommandActionEvent.getInstance(listener, cmd, this));
			}
		}
		return true;
	}

	public void doSizeChanged(int width, int height) {
		sizeChanged(width, height);
	}
}
