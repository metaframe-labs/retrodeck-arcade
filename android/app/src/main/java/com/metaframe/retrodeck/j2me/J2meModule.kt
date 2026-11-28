package com.metaframe.retrodeck.j2me

import android.app.Activity
import android.app.Application
import android.content.Intent
import android.net.Uri
import android.view.KeyEvent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import javax.microedition.shell.J2meHost
import ru.playsoftware.j2meloader.EmulatorApplication
import ru.playsoftware.j2meloader.config.Config
import ru.playsoftware.j2meloader.util.FileUtils
import ru.playsoftware.j2meloader.util.ZipUtils
import ru.woesss.j2me.installer.InstallerHelper
import ru.woesss.j2me.jar.Descriptor
import java.io.File
import java.io.FileOutputStream

class J2meModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var pendingPromise: Promise? = null

    private val activityEventListener: ActivityEventListener =
        object : BaseActivityEventListener() {
            override fun onActivityResult(
                activity: Activity,
                requestCode: Int,
                resultCode: Int,
                data: Intent?
            ) {
                if (requestCode != PICK_JAR_REQUEST) return
                val promise = pendingPromise ?: return
                pendingPromise = null

                if (resultCode != Activity.RESULT_OK || data?.data == null) {
                    promise.resolve(null)
                    return
                }

                try {
                    val uri: Uri = data.data!!
                    val pickDir = File(reactContext.cacheDir, "j2me_picks").apply { mkdirs() }
                    // Unique name per pick so re-selecting changes the jarPath prop and re-boots.
                    pickDir.listFiles()?.forEach { it.delete() }
                    val stamp = System.currentTimeMillis()
                    val rawFile = File(pickDir, "picked_$stamp.bin")
                    val input = reactContext.contentResolver.openInputStream(uri)
                        ?: throw IllegalStateException("Cannot open selected file")
                    input.use { inp ->
                        FileOutputStream(rawFile).use { out -> inp.copyTo(out) }
                    }
                    val jarFile = File(pickDir, "game_$stamp.jar")
                    ZipUtils.resolveJar(rawFile, jarFile)
                    rawFile.delete()
                    promise.resolve(jarFile.absolutePath)
                } catch (e: Exception) {
                    promise.reject("JAR_PICK_ERROR", e.message, e)
                }
            }
        }

    init {
        reactContext.addActivityEventListener(activityEventListener)
        J2meHost.setExitListener {
            if (reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onJ2meExit", null)
            }
        }
    }

    override fun invalidate() {
        J2meHost.setExitListener(null)
        super.invalidate()
    }

    override fun getName(): String = "J2meModule"

    @ReactMethod
    fun pickJarFile(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Current activity is null")
            return
        }
        pendingPromise = promise
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }
        activity.startActivityForResult(intent, PICK_JAR_REQUEST)
    }

    @ReactMethod
    fun sendKeyEvent(key: String, pressed: Boolean) {
        val keyCode = when (key.lowercase()) {
            "up" -> KeyEvent.KEYCODE_DPAD_UP
            "down" -> KeyEvent.KEYCODE_DPAD_DOWN
            "left" -> KeyEvent.KEYCODE_DPAD_LEFT
            "right" -> KeyEvent.KEYCODE_DPAD_RIGHT
            "a" -> KeyEvent.KEYCODE_ENTER
            "b" -> KeyEvent.KEYCODE_BACK
            "0" -> KeyEvent.KEYCODE_0
            "1" -> KeyEvent.KEYCODE_1
            "2" -> KeyEvent.KEYCODE_2
            "3" -> KeyEvent.KEYCODE_3
            "4" -> KeyEvent.KEYCODE_4
            "5" -> KeyEvent.KEYCODE_5
            "6" -> KeyEvent.KEYCODE_6
            "7" -> KeyEvent.KEYCODE_7
            "8" -> KeyEvent.KEYCODE_8
            "9" -> KeyEvent.KEYCODE_9
            "*" -> KeyEvent.KEYCODE_STAR
            "#" -> KeyEvent.KEYCODE_POUND
            "del" -> KeyEvent.KEYCODE_DEL
            "softleft" -> KeyEvent.KEYCODE_SOFT_LEFT
            "softright" -> KeyEvent.KEYCODE_SOFT_RIGHT
            else -> return
        }
        J2meHost.sendKeyEvent(keyCode, pressed)
    }

    @ReactMethod
    fun sendCharacter(character: String) {
        if (character.isEmpty()) return
        J2meHost.sendCharacter(character.codePointAt(0))
    }

    @ReactMethod
    fun stopGame() {
        J2meHost.stop()
    }

    @ReactMethod
    fun setPaused(paused: Boolean) {
        J2meHost.setPaused(paused)
    }

    private val samplesLock = Any()

    private fun ensureBundledSamples() {
        synchronized(samplesLock) {
            EmulatorApplication.init(reactContext)
            val appsRoot = File(Config.getAppDir()).apply { mkdirs() }
            val marker = File(appsRoot, ".bundled_samples_v1")
            if (marker.isFile) return

            val app = reactContext.applicationContext as? Application ?: return
            val tmpDir = File(reactContext.cacheDir, "j2me_bundled").apply { mkdirs() }
            val bundledAssets = listOf("AstroBlaster.jar", "OrbitalPong.jar")
            var installedAll = true

            for (assetName in bundledAssets) {
                val outJar = File(tmpDir, assetName)
                try {
                    reactContext.assets.open("j2me/$assetName").use { inp ->
                        FileOutputStream(outJar).use { out -> inp.copyTo(out) }
                    }
                    InstallerHelper.installJar(app, outJar.absolutePath)
                } catch (_: Exception) {
                    installedAll = false
                } finally {
                    outJar.delete()
                }
            }
            if (installedAll) {
                try {
                    marker.writeText("1")
                } catch (_: Exception) {
                }
            }
        }
    }

    @ReactMethod
    fun listInstalledJars(promise: Promise) {
        Thread {
            try {
                ensureBundledSamples()
                EmulatorApplication.init(reactContext)
                val appsRoot = File(Config.getAppDir())
                val dataRootPath = Config.getDataDir()
                val result = Arguments.createArray()
                val dirs = appsRoot.listFiles()
                    ?.filter { it.isDirectory && !it.name.startsWith(".") }
                    ?.sortedByDescending { it.lastModified() }
                    ?: emptyList()

                for (dir in dirs) {
                    val dexFile = File(dir, Config.MIDLET_DEX_FILE)
                    val manifestFile = File(dir, Config.MIDLET_MANIFEST_FILE)
                    if (!dexFile.isFile || !manifestFile.isFile) continue
                    try {
                        val desc = Descriptor(manifestFile, false)
                        val saveDir = File(dataRootPath, dir.name)
                        val hasSave = saveDir.listFiles()?.any { file ->
                            file.isFile && (file.name.endsWith(".rsh") || file.name.endsWith(".rsr"))
                        } == true
                        val iconFile = File(dir, Config.MIDLET_ICON_FILE)
                        if (!iconFile.isFile) {
                            val resJar = File(dir, Config.MIDLET_RES_FILE)
                            if (resJar.isFile) {
                                val iconName = try { desc.icon } catch (_: Exception) { null }
                                ZipUtils.extractBestIcon(resJar, iconName, iconFile)
                            }
                        }
                        val map = Arguments.createMap().apply {
                            putString("appPath", dir.absolutePath)
                            putString("id", dir.name)
                            putString("name", desc.name ?: dir.name)
                            putString("vendor", desc.vendor ?: "")
                            putString("version", desc.version ?: "1.0")
                            putBoolean("hasSave", hasSave)
                            if (iconFile.isFile) {
                                putString("iconUri", "file://${iconFile.absolutePath}")
                            } else {
                                putNull("iconUri")
                            }
                        }
                        result.pushMap(map)
                    } catch (_: Exception) {
                    }
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("J2ME_LIST_ERROR", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun deleteInstalledJar(appPath: String, promise: Promise) {
        try {
            EmulatorApplication.init(reactContext)
            val appsRoot = File(Config.getAppDir()).canonicalFile
            val target = File(appPath).canonicalFile
            if (target.parentFile != appsRoot || !target.isDirectory) {
                promise.resolve(false)
                return
            }
            val dirName = target.name
            FileUtils.deleteDirectory(target)
            FileUtils.deleteDirectory(File(Config.getConfigsDir(), dirName))
            FileUtils.deleteDirectory(File(Config.getDataDir(), dirName))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("J2ME_DELETE_ERROR", e.message, e)
        }
    }

    companion object {
        private const val PICK_JAR_REQUEST = 9421
    }
}
