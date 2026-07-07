package com.mrboot.crm;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.service.quicksettings.TileService;

/**
 * Quick Settings tile — "New Order" straight from the notification shade.
 * Add it via the QS panel edit mode after installing.
 */
public class NewOrderTileService extends TileService {

    private static final String NEW_ORDER_URL = "https://mr-boot-crm.vercel.app/orders/new";

    @Override
    public void onClick() {
        super.onClick();

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.setData(Uri.parse(NEW_ORDER_URL));
        intent.putExtra("url", NEW_ORDER_URL);

        if (Build.VERSION.SDK_INT >= 34) {
            // Android 14+ requires the PendingIntent variant.
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    this,
                    900,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            startActivityAndCollapse(pendingIntent);
        } else {
            startActivityAndCollapse(intent);
        }
    }
}
