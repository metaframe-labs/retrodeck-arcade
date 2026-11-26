package com.metaframelabs.retrodeck8.j2me

import android.widget.FrameLayout
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import javax.microedition.lcdui.overlay.OverlayView
import javax.microedition.shell.J2meHost
import ru.playsoftware.j2meloader.EmulatorApplication

class J2meScreenManager : SimpleViewManager<FrameLayout>() {
    override fun getName(): String = "J2meScreen"

    override fun createViewInstance(reactContext: ThemedReactContext): FrameLayout {
        EmulatorApplication.init(reactContext)
        val overlay = OverlayView(reactContext, null)
        return FrameLayout(reactContext).apply {
            setBackgroundColor(0xFF000000.toInt())
            addView(
                overlay,
                FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            )
            J2meHost.setHostViews(this, overlay)
        }
    }

    override fun onDropViewInstance(view: FrameLayout) {
        J2meHost.onHostViewDropped(view)
        super.onDropViewInstance(view)
    }

    @ReactProp(name = "jarPath")
    fun setJarPath(view: FrameLayout, jarPath: String?) {
        android.util.Log.d("J2meScreenManager", "setJarPath: $jarPath")
        if (jarPath.isNullOrBlank() || view.tag == jarPath) return
        view.tag = jarPath
        J2meHost.boot(view.context.applicationContext, jarPath, null)
    }
}
