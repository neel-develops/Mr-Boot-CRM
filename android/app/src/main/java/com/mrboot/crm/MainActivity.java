package com.mrboot.crm;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleWidgetDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleWidgetDeepLink(intent);
    }

    /**
     * Widgets launch this activity with a "url" extra pointing at a page
     * inside the CRM (e.g. a specific order). Navigate the Capacitor
     * WebView there instead of ignoring it.
     */
    private void handleWidgetDeepLink(Intent intent) {
        if (intent == null) return;
        final String url = intent.getStringExtra("url");
        if (url == null || url.isEmpty()) return;
        intent.removeExtra("url"); // don't re-navigate on config changes

        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().post(new Runnable() {
                @Override
                public void run() {
                    bridge.getWebView().loadUrl(url);
                }
            });
        }
    }
}
