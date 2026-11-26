//
// Created by woesss on 13.08.2023.
//

#include <thread>
#include "PlayerListener.h"
#include "log.h"

#define LOG_TAG "MMAPI"

JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* /*reserved*/) {
    JNIEnv* env;
    if (vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return JNI_ERR;
    }
    mmapi::JNIEnvPtr::vm = vm;
    return JNI_VERSION_1_6;
}

namespace mmapi {
    PlayerListener::PlayerListener(JNIEnv *env, jobject pListener)
            : listener(env != nullptr && pListener != nullptr ? env->NewGlobalRef(pListener) : nullptr),
              method(nullptr) {
        if (env != nullptr && listener != nullptr) {
            jclass listenerClass = env->GetObjectClass(listener);
            if (listenerClass != nullptr) {
                method = env->GetMethodID(listenerClass, "postEvent", "(IJ)V");
                env->DeleteLocalRef(listenerClass);
            }
        }
    }

    PlayerListener::~PlayerListener() {
        JNIEnvPtr env;
        if (listener != nullptr && env.get() != nullptr) {
            env->DeleteGlobalRef(listener);
        }
    }

    void PlayerListener::sendEvent(PlayerListenerEvent eventType, const int64_t time) {
        JNIEnvPtr env;
        if (listener == nullptr || method == nullptr || env.get() == nullptr) {
            ALOGE("%s: obj=%p, mID=%p", __func__, listener, method);
            return;
        }
        env->CallVoidMethod(listener, method, eventType, time);
        if (env->ExceptionCheck()) {
            env->ExceptionDescribe();
            env->ExceptionClear();
        }
    }

    void PlayerListener::postEvent(PlayerListenerEvent type, int64_t time) {
        const std::shared_ptr<PlayerListener> self = shared_from_this();
        std::thread([self, type, time]() {
            self->sendEvent(type, time);
        }).detach();
    }

    JavaVM *JNIEnvPtr::vm = nullptr;

    JNIEnvPtr::JNIEnvPtr() : env(nullptr) {
        if (vm == nullptr) {
            return;
        }
        jint res = vm->GetEnv(reinterpret_cast<void **>(&env), JNI_VERSION_1_6);
        if (res == JNI_OK) {
            isJavaThread = true;
            return;
        } else if (res != JNI_EDETACHED) {
            ALOGE("%s: JavaVM::GetEnv() returned %d", __func__, res);
            return;
        }
        res = vm->AttachCurrentThread(&env, nullptr);
        if (res == JNI_OK) {
            isJavaThread = false;
        } else {
            ALOGE("%s: JavaVM::AttachCurrentThread() returned %d", __func__, res);
        }
    }

    JNIEnvPtr::~JNIEnvPtr() {
        if (env == nullptr || isJavaThread || vm == nullptr) {
            return;
        }
        jint res = vm->DetachCurrentThread();
        if (res != JNI_OK) {
            ALOGE("%s: JavaVM::DetachCurrentThread() returned %d", __func__, res);
        }
    }

    JNIEnv *JNIEnvPtr::operator->() const {
        return env;
    }

    JNIEnv *JNIEnvPtr::get() const {
        return env;
    }
} // namespace mmapi
