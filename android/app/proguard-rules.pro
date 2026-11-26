# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# MIDlets are converted to DEX and loaded at runtime. Their bytecode links to
# these standard/vendor J2ME API names, so R8 must not rename, merge, or remove
# the classes and members that a selected JAR may reference.
-keep class javax.microedition.** { *; }
-keep class javax.bluetooth.** { *; }
-keep class javax.obex.** { *; }
-keep class javax.wireless.messaging.** { *; }
-keep class com.j_phone.** { *; }
-keep class com.jblend.** { *; }
-keep class com.kddi.** { *; }
-keep class com.mascotcapsule.** { *; }
-keep class com.mexa.** { *; }
-keep class com.mot.iden.** { *; }
-keep class com.motorola.** { *; }
-keep class com.nokia.** { *; }
-keep class com.samsung.** { *; }
-keep class com.siemens.** { *; }
-keep class com.sonyericsson.** { *; }
-keep class com.sprintpcs.** { *; }
-keep class com.vodafone.** { *; }
-keep class mmpp.** { *; }
-keep class org.microemu.** { *; }
-keep class ru.playsoftware.j2meloader.** { *; }
-keep class ru.woesss.** { *; }
