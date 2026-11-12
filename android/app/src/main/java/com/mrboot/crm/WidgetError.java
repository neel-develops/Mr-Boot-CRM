package com.mrboot.crm;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import javax.net.ssl.SSLException;

/** Turns a failed widget request into a short, specific message the staff can act on. */
final class WidgetError {
    private WidgetError() {}

    static String forStatus(int code) {
        if (code == 401 || code == 403) return "Not authorised (" + code + "). Install the latest Mr. Boot app.";
        if (code >= 500) return "Server error (" + code + "). Tap refresh in a minute.";
        return "Server replied " + code + ". Tap refresh.";
    }

    static String forException(Exception e) {
        if (e instanceof UnknownHostException) {
            return "No internet for this app. Allow background data for Mr. Boot (Data Saver / battery settings).";
        }
        if (e instanceof SocketTimeoutException) return "Server too slow. Tap refresh.";
        if (e instanceof SSLException) return "Secure connection failed. Check the phone's date & time.";
        if (e instanceof ConnectException) return "Can't connect. Check the phone's internet.";
        return "Couldn't load (" + e.getClass().getSimpleName() + "). Tap refresh.";
    }
}
