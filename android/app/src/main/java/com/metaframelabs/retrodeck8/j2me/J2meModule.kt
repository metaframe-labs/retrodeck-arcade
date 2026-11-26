package com.metaframelabs.retrodeck8.j2me

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.view.KeyEvent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import javax.microedition.shell.J2meHost
import java.io.File
import java.io.FileOutputStream
import java.util.zip.ZipFile

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
                    resolveJar(rawFile, jarFile)
                    rawFile.delete()
                    promise.resolve(jarFile.absolutePath)
                } catch (e: Exception) {
                    promise.reject("JAR_PICK_ERROR", e.message, e)
                }
            }
        }

    init {
        reactContext.addActivityEventListener(activityEventListener)
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

    /**
     * Many J2ME download sites ship a .zip (sometimes renamed to .jar) that contains one or more
     * real .jar files. If [src] is a real MIDlet JAR (has META-INF/MANIFEST.MF) it is used as-is;
     * otherwise the first nested .jar is extracted (preferring the non "(a)"/alt variant).
     */
    private fun resolveJar(src: File, dest: File) {
        val nestedJars = mutableListOf<String>()
        var hasManifest = false
        try {
            ZipFile(src).use { zip ->
                for (entry in zip.entries()) {
                    val name = entry.name
                    if (name.equals("META-INF/MANIFEST.MF", ignoreCase = true)) hasManifest = true
                    if (!entry.isDirectory && name.lowercase().endsWith(".jar")) nestedJars.add(name)
                }
                if (!hasManifest && nestedJars.isNotEmpty()) {
                    val pick = nestedJars.sortedWith(
                        compareBy<String>({ it.contains("(a)") }, { it.length }, { it })
                    ).first()
                    zip.getInputStream(zip.getEntry(pick)).use { inp ->
                        FileOutputStream(dest).use { out -> inp.copyTo(out) }
                    }
                    return
                }
            }
        } catch (e: java.util.zip.ZipException) {
            throw IllegalArgumentException("Selected file is not a JAR/ZIP archive", e)
        }
        if (!hasManifest) {
            throw IllegalArgumentException("Selected file has no META-INF/MANIFEST.MF and no nested .jar")
        }
        src.copyTo(dest, overwrite = true)
    }

    companion object {
        private const val PICK_JAR_REQUEST = 9421
    }
}
