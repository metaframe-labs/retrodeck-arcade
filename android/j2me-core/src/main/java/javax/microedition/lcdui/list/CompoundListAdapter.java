/*
 * Copyright 2012 Kulikov Dmitriy
 * Copyright 2018 Nikita Shakarun
 * Copyright 2019-2023 Yury Kharchenko
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

package javax.microedition.lcdui.list;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.view.View;
import android.view.ViewGroup;
import android.widget.CheckedTextView;
import android.widget.ListAdapter;
import android.widget.TextView;

import java.util.ArrayList;

import javax.microedition.lcdui.Choice;
import javax.microedition.util.ContextHolder;

import ru.playsoftware.j2meloader.R;

public class CompoundListAdapter extends CompoundAdapter implements ListAdapter {
	private static final int SELECTED_ROW_BG = 0xFF1D4ED8;
	private static final int SELECTED_TEXT_COLOR = 0xFFFFFFFF;
	private static final int DEFAULT_TEXT_COLOR = 0xFFE2E8F0;

	private final int listType;
	private final int viewResourceID;

	public CompoundListAdapter(int type, ArrayList<CompoundItem> items) {
		super(items);
		switch (type) {
			case Choice.IMPLICIT:
				viewResourceID = android.R.layout.simple_list_item_1;
				break;
			case Choice.EXCLUSIVE:
				viewResourceID = android.R.layout.simple_list_item_single_choice;
				break;
			case Choice.MULTIPLE:
				viewResourceID = android.R.layout.simple_list_item_multiple_choice;
				break;
			default:
				throw new IllegalArgumentException("list type " + type + " is not supported");
		}
		listType = type;
	}

	@Override
	public View getView(int position, View convertView, ViewGroup parent) {
		convertView = getView(position, convertView, parent, viewResourceID);
		applySelectionStyle(convertView, position);
		return convertView;
	}

	/** Updates a row view's selection highlight in-place without waiting for a React Native layout pass. */
	public void applySelectionStyle(View rowView, int position) {
		if (rowView == null || position < 0 || position >= getCount()) {
			return;
		}
		boolean selected = getItem(position).isSelected();
		if (rowView instanceof TextView) {
			TextView tv = (TextView) rowView;
			tv.setTextColor(selected ? SELECTED_TEXT_COLOR : DEFAULT_TEXT_COLOR);
			tv.setTypeface(null, selected ? Typeface.BOLD : Typeface.NORMAL);
		}
		if (listType == Choice.IMPLICIT) {
			rowView.setBackgroundColor(selected ? SELECTED_ROW_BG : Color.TRANSPARENT);
		} else {
			if (rowView instanceof CheckedTextView) {
				((CheckedTextView) rowView).setChecked(selected);
			}
			rowView.setBackgroundColor(selected ? 0x331D4ED8 : Color.TRANSPARENT);
		}
		rowView.invalidate();
	}

	@Override
	public boolean areAllItemsEnabled() {
		return true;
	}

	@Override
	public boolean isEnabled(int position) {
		return true;
	}
}
