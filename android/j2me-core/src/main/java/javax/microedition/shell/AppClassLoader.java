/*
 * Copyright 2015-2016 Nickolay Savchenko
 * Copyright 2017-2021 Nikita Shakarun
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

package javax.microedition.shell;

import android.util.Log;

import net.lingala.zip4j.model.FileHeader;

import java.io.ByteArrayInputStream;
import java.io.DataInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;

import dalvik.system.DexClassLoader;
import ru.playsoftware.j2meloader.BuildConfig;
import ru.playsoftware.j2meloader.config.Config;
import ru.playsoftware.j2meloader.util.FileUtils;
import ru.playsoftware.j2meloader.util.IOUtils;
import ru.woesss.util.zip.ZipFile;

public class AppClassLoader extends DexClassLoader {
	private static final String TAG = AppClassLoader.class.getName();

	private static AppClassLoader instance;
	private static ZipFile zipFile;
	private static String dataDir;
	private static File oldResDir;

	AppClassLoader(String paths, String tmpDir, ClassLoader parent, File appDir) {
		super(paths, tmpDir, null, parent);
		if (appDir == null)
			throw new NullPointerException("App path is null");
		oldResDir = new File(appDir, Config.MIDLET_RES_DIR);
		instance = this;
		setDataDir(appDir);
		File jar = new File(appDir, Config.MIDLET_RES_FILE);
		zipFile = jar.exists() ? new ZipFile(jar) : null;
	}

	public static void setDataDir(File appDir) {
		if (appDir == null) return;
		File parent = appDir.getParentFile();
		String root = (parent != null && parent.getParent() != null) ? parent.getParent() : appDir.getAbsolutePath();
		dataDir = root + Config.MIDLET_DATA_DIR + appDir.getName();
	}

	private static String normalizeResourcePath(Class<?> resClass, String resName) {
		if (resName == null || resName.isEmpty()) {
			return "";
		}
		String normName = resName.replace('\\', '/').replaceAll("//+", "/");
		while (normName.startsWith("./")) {
			normName = normName.substring(2);
		}
		if (!normName.isEmpty() && normName.charAt(0) != '/' && resClass != null && resClass.getPackage() != null) {
			String className = resClass.getPackage().getName().replace('.', '/');
			if (!className.isEmpty()) {
				normName = className + "/" + normName;
			}
		}
		while (normName.startsWith("/") || normName.startsWith("./")) {
			normName = normName.startsWith("./") ? normName.substring(2) : normName.substring(1);
		}
		return normName;
	}

	public static InputStream getResourceAsStream(Class<?> resClass, String resName) {
		Log.d(TAG, "CUSTOM GET RES CALLED WITH PATH: " + resName);
		if (resName == null || resName.equals("")) {
			Log.w(TAG, "Can't load res on empty path");
			return null;
		}
		String normName = normalizeResourcePath(resClass, resName);
		byte[] data = getResourceBytes(normName);
		if (data == null && resClass != null && resClass.getPackage() != null) {
			// Fallback to root-relative lookup when a default/package-relative call intended root
			String rootName = normalizeResourcePath(null, resName);
			if (!rootName.equals(normName)) {
				data = getResourceBytes(rootName);
			}
		}
		if (data == null) {
			Log.w(TAG, "Can't load res: " + resName);
			return null;
		}
		return new ByteArrayInputStream(data);
	}

	public static String getDataDir() {
		return dataDir;
	}

	public static byte[] getResourceAsBytes(String resName) {
		if (resName == null || resName.equals("")) {
			Log.w(TAG, "Can't load res on empty path");
			return null;
		}
		String normName = normalizeResourcePath(null, resName);
		byte[] data = getResourceBytes(normName);
		if (data == null) {
			Log.w(TAG, "Can't load res: " + resName);
			return null;
		}
		return data;
	}

	private static synchronized byte[] getResourceBytes(String name) {
		if (name.equals("")) {
			Log.w(TAG, "Can't load res on empty path");
			return null;
		}
		if (!BuildConfig.FULL_EMULATOR) {
			try {
				InputStream stream = AppClassLoader.class.getClassLoader().getResourceAsStream(name);
				if (stream != null) {
					return IOUtils.toByteArray(stream);
				}
				Log.e(TAG, "getResourceBytes: resource not found " + name);
				return null;
			} catch (Exception e) {
				Log.e(TAG, "getResourceBytes: " + name, e);
				return null;
			}
		}
		if (zipFile == null) {
			final File file = new File(oldResDir, name);
			try {
				return FileUtils.getBytes(file);
			} catch (Exception e) {
				Log.w(TAG, "getResourceBytes: from file=" + file, e);
				return null;
			}
		}
		DataInputStream dis = null;
		try {
			FileHeader header = zipFile.getFileHeader(name);
			if (header == null) {
				for (FileHeader candidate : zipFile.getFileHeaders()) {
					if (candidate == null || candidate.isDirectory()) continue;
					String entryName = candidate.getFileName();
					if (entryName == null) continue;
					entryName = entryName.replace('\\', '/').replaceAll("//+", "/");
					while (entryName.startsWith("./") || entryName.startsWith("/")) {
						entryName = entryName.startsWith("./") ? entryName.substring(2) : entryName.substring(1);
					}
					if (entryName.equalsIgnoreCase(name)) {
						header = candidate;
						break;
					}
				}
			}
			if (header == null) {
				return null;
			}
			dis = new DataInputStream(zipFile.getInputStream(header));
			byte[] data = new byte[(int) header.getUncompressedSize()];
			dis.readFully(data);
			return data;
		} catch (Exception e) {
			Log.e(TAG, "getResourceBytes: ", e);
		} finally {
			if (dis != null) {
				try {
					dis.close();
				} catch (IOException e) {
					Log.e(TAG, "getResourceBytes: error close stream", e);
				}
			}
		}
		return null;
	}

	public static AppClassLoader getInstance() {
		return instance;
	}

	/** Releases process-wide resources held by the current embedded MIDlet. */
	public static synchronized void release() {
		ZipFile openZip = zipFile;
		zipFile = null;
		instance = null;
		dataDir = null;
		oldResDir = null;
		if (openZip != null) {
			try {
				openZip.close();
			} catch (IOException e) {
				Log.w(TAG, "Failed to close MIDlet resource archive", e);
			}
		}
	}

	@Override
	protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
		// First, check if the class is already loaded
		Class<?> loadedClass = findLoadedClass(name);
		if (loadedClass != null) {
			return loadedClass;
		}

		try {
			// Try to load the class from the URLs of this classloader
			Class<?> localClass = findClass(name);
			if (resolve) {
				resolveClass(localClass);
			}
			return localClass;
		} catch (ClassNotFoundException e) {
			// Class not found in this classloader, delegate to parent classloader
			return super.loadClass(name, resolve);
		}
	}
}
