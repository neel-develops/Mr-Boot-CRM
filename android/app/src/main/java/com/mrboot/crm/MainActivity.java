package com.mrboot.crm;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.BridgeActivity;

import java.util.concurrent.TimeUnit;

public class MainActivity extends BridgeActivity {

    /** Only same-app URLs may steer the WebView (widgets/shortcuts/notifications). */
    private static final String ALLOWED_URL_PREFIX = "https://mr-boot-crm.vercel.app";

    private static final int REQUEST_NOTIFICATIONS = 1001;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleDeepLink(getIntent());
        requestNotificationPermissionIfNeeded();
        scheduleOrderAlerts();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
    }

    /**
     * Widgets, launcher shortcuts, the QS tile and notifications launch this
     * activity with a "url" extra and/or a data URI pointing at a page inside
     * the CRM. Navigate the Capacitor WebView there instead of ignoring it.
     */
    private void handleDeepLink(Intent intent) {
        if (intent == null) return;

        String url = intent.getStringExtra("url");
        if (url == null || url.isEmpty()) {
            Uri data = intent.getData();
            if (data != null) url = data.toString();
        }
        if (url == null || !url.startsWith(ALLOWED_URL_PREFIX)) return;

        intent.removeExtra("url"); // don't re-navigate on config changes
        intent.setData(null);

        final String target = url;
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    bridge.getWebView().loadUrl(target);
                }
            });
        }
    }

    /** Android 13+ needs a runtime grant before order alerts can show. */
    private void requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                        != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[]{Manifest.permission.POST_NOTIFICATIONS},
                    REQUEST_NOTIFICATIONS);
        }
    }

    /** Poll the CRM every ~30 min for READY / overdue orders (see OrderAlertsWorker). */
    private void scheduleOrderAlerts() {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest request =
                new PeriodicWorkRequest.Builder(OrderAlertsWorker.class, 30, TimeUnit.MINUTES)
                        .setConstraints(constraints)
                        .build();

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "mrboot-order-alerts",
                ExistingPeriodicWorkPolicy.KEEP,
                request);
    }
}
