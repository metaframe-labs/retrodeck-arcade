//
// Created by woesss on 13.08.2023.
//

#ifndef MMAPI_PLAYER_LISTENER_H
#define MMAPI_PLAYER_LISTENER_H

#include <jni.h>
#include <memory>

namespace mmapi {

    enum PlayerState {
        CLOSED = 0,
        UNREALIZED = 100,
        REALIZED = 200,
        PREFETCHED = 300,
        STARTED = 400,
    };

    enum PlayerListenerEvent {
        RESTART = 1,
        STOP = 2,
        ERROR = 3,
    };

    class JNIEnvPtr {
        bool isJavaThread = false;
        JNIEnv *env;
    public:
        JNIEnvPtr();
        virtual ~JNIEnvPtr();
        JNIEnv *operator->() const;
        JNIEnv *get() const;

        static JavaVM *vm;
    };

    class PlayerListener : public std::enable_shared_from_this<PlayerListener> {
        jobject listener;
        jmethodID method;
    public:
        PlayerListener(JNIEnv *env, jobject pListener);
        virtual ~PlayerListener();

        void sendEvent(PlayerListenerEvent eventType, const int64_t time);
        void postEvent(PlayerListenerEvent type, int64_t time);

    };
} // mmapi

#endif //MMAPI_PLAYER_LISTENER_H
