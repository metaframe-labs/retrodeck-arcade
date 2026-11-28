/*
 * Copyright 2017-2020 Nikita Shakarun
 * Copyright 2020-2023 Yury Kharchenko
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

package ru.playsoftware.j2meloader.util;

import ru.playsoftware.j2meloader.util.FileUtils;
import ru.woesss.util.zip.ZipFile;
import net.lingala.zip4j.exception.ZipException;
import net.lingala.zip4j.model.FileHeader;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class ZipUtils {

	private static final int BUFFER_SIZE = 8096;

	public static void unzipEntry(File srcZip, String name, File dst) throws IOException {
		try (ZipFile zip = new ZipFile(srcZip)) {
			FileHeader entry = zip.getFileHeader(name);
			if (entry == null) {
				throw new IOException("Entry '" + name + "' not found in zip: " + srcZip);
			}
			try (BufferedInputStream bis = new BufferedInputStream(zip.getInputStream(entry));
				 BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(dst), BUFFER_SIZE)) {
				byte[] data = new byte[BUFFER_SIZE];
				int read;
				while ((read = bis.read(data)) != -1) {
					bos.write(data, 0, read);
				}
			}
		}
	}

	/**
	 * Validates and resolves a user-picked .jar (or a .zip archive wrapping nested .jar files).
	 * Uses zip4j so legacy J2ME JARs containing "./" or duplicate entries bypass Android 14+ ZipPathValidator.
	 */
	public static void resolveJar(File src, File dest) throws IOException {
		List<FileHeader> nestedJars = new ArrayList<>();
		boolean hasManifest = false;
		try (ZipFile zip = new ZipFile(src)) {
			List<FileHeader> headers = zip.getFileHeaders();
			for (FileHeader header : headers) {
				if (header.isDirectory()) continue;
				String name = header.getFileName().replace('\\', '/');
				while (name.startsWith("./")) name = name.substring(2);
				while (name.startsWith("/")) name = name.substring(1);
				if ("META-INF/MANIFEST.MF".equalsIgnoreCase(name)) {
					hasManifest = true;
				}
				if (name.toLowerCase().endsWith(".jar")) {
					nestedJars.add(header);
				}
			}
			if (!hasManifest && !nestedJars.isEmpty()) {
				nestedJars.sort(Comparator
						.comparing((FileHeader h) -> h.getFileName().contains("(a)"))
						.thenComparingInt(h -> h.getFileName().length())
						.thenComparing(FileHeader::getFileName));
				FileHeader pick = nestedJars.get(0);
				try (InputStream is = new BufferedInputStream(zip.getInputStream(pick));
					 BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(dest), BUFFER_SIZE)) {
					byte[] data = new byte[BUFFER_SIZE];
					int read;
					while ((read = is.read(data)) != -1) {
						bos.write(data, 0, read);
					}
				}
				return;
			}
		} catch (ZipException e) {
			throw new IllegalArgumentException("Selected file is not a JAR/ZIP archive", e);
		}
		if (!hasManifest) {
			throw new IllegalArgumentException("Selected file has no META-INF/MANIFEST.MF and no nested .jar");
		}
		FileUtils.copyFileUsingChannel(src, dest);
	}

	/**
	 * Extracts a MIDlet icon robustly: tries exact manifest path, normalized/case-insensitive path,
	 * and common PNG icon fallbacks (icon.png, ic.png, i.png, etc.).
	 */
	public static boolean extractBestIcon(File srcJar, String manifestIcon, File dst) {
		if (srcJar == null || !srcJar.isFile()) return false;
		String clean = null;
		if (manifestIcon != null) {
			clean = manifestIcon.trim().replace('\\', '/');
			while (clean.startsWith("./")) clean = clean.substring(2);
			while (clean.startsWith("/")) clean = clean.substring(1);
			if (!clean.isEmpty()) {
				try {
					unzipEntry(srcJar, clean, dst);
					return true;
				} catch (IOException ignored) {
				}
			}
		}

		try (ZipFile zip = new ZipFile(srcJar)) {
			FileHeader matched = null;
			FileHeader fallbackPng = null;
			for (FileHeader e : zip.getFileHeaders()) {
				if (e.isDirectory()) continue;
				String entryName = e.getFileName().replace('\\', '/');
				while (entryName.startsWith("./")) entryName = entryName.substring(2);
				while (entryName.startsWith("/")) entryName = entryName.substring(1);
				if (clean != null && !clean.isEmpty() && entryName.equalsIgnoreCase(clean)) {
					matched = e;
					break;
				}
				String lower = entryName.toLowerCase();
				if (lower.endsWith(".png")) {
					if (lower.equals("icon.png") || lower.equals("icons/icon.png") || lower.equals("ic.png") || lower.equals("i.png")) {
						fallbackPng = e;
					} else if (fallbackPng == null && !lower.contains("/") && e.getUncompressedSize() > 0 && e.getUncompressedSize() < 65536) {
						fallbackPng = e;
					}
				}
			}
			FileHeader pick = matched != null ? matched : fallbackPng;
			if (pick == null) return false;
			try (InputStream is = new BufferedInputStream(zip.getInputStream(pick));
				 BufferedOutputStream bos = new BufferedOutputStream(new FileOutputStream(dst), BUFFER_SIZE)) {
				byte[] data = new byte[BUFFER_SIZE];
				int read;
				while ((read = is.read(data)) != -1) {
					bos.write(data, 0, read);
				}
			}
			return dst.isFile() && dst.length() > 0;
		} catch (Throwable ignored) {
			if (dst.exists()) dst.delete();
			return false;
		}
	}
}
