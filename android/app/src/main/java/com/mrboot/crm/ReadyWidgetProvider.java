package com.mrboot.crm;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * "Ready for Pickup" widget — READY orders with tap-to-call buttons.
 * Tapping the green phone opens the dialer with the customer's number.
 * Tapping the row opens the order inside the app.
 */
public class ReadyWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_REFRESH = "com.mrboot.crm.ACTION_REFRESH_READY";
    private static final String API_URL = "https://mr-boot-crm.vercel.app/api/widget/ready";
    private static final String APP_BASE_URL = "https://mr-boot-crm.vercel.app";

    private static final int[] ROW_IDS = {R.id.row_ready_1, R.id.row_ready_2, R.id.row_ready_3};
    private static final int[] NAME_IDS = {R.id.txt_ready_name_1, R.id.txt_ready_name_2, R.id.txt_ready_name_3};
    private static final int[] DESC_IDS = {R.id.txt_ready_desc_1, R.id.txt_ready_desc_2, R.id.txt_ready_desc_3};
    private static final int[] CALL_IDS = {R.id.btn_call_1, R.id.btn_call_2, R.id.btn_call_3};
    private static final int[] WA_IDS = {R.id.btn_wa_1, R.id.btn_wa_2, R.id.btn_wa_3};

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_REFRESH.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, ReadyWidgetProvider.class));
            for (int appWidgetId : appWidgetIds) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ready);
                views.setTextViewText(R.id.txt_ready_count, "...");
                appWidgetManager.updateAppWidget(appWidgetId, views);
                fetchWidgetData(context, appWidgetManager, appWidgetId);
            }
        }
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ready);
        attachRefreshIntent(context, views);
        appWidgetManager.updateAppWidget(appWidgetId, views);
        fetchWidgetData(context, appWidgetManager, appWidgetId);
    }

    private void attachRefreshIntent(Context context, RemoteViews views) {
        Intent refreshIntent = new Intent(context, ReadyWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_refresh_ready, refreshPendingIntent);
    }

    private void fetchWidgetData(final Context context, final AppWidgetManager appWidgetManager, final int appWidgetId) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(API_URL);
                    HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
                    urlConnection.setRequestMethod("GET");
                    urlConnection.setConnectTimeout(8000);
                    urlConnection.setReadTimeout(8000);
                    urlConnection.setRequestProperty("Accept", "application/json");

                    int statusCode = urlConnection.getResponseCode();
                    if (statusCode == 200) {
                        BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(urlConnection.getInputStream()));
                        StringBuilder stringBuilder = new StringBuilder();
                        String line;
                        while ((line = bufferedReader.readLine()) != null) {
                            stringBuilder.append(line);
                        }
                        bufferedReader.close();

                        final String response = stringBuilder.toString();
                        new Handler(Looper.getMainLooper()).post(new Runnable() {
                            @Override
                            public void run() {
                                updateUI(context, appWidgetManager, appWidgetId, response);
                            }
                        });
                    } else {
                        showError(context, appWidgetManager, appWidgetId);
                    }
                    urlConnection.disconnect();
                } catch (Exception e) {
                    e.printStackTrace();
                    showError(context, appWidgetManager, appWidgetId);
                }
            }
        }).start();
    }

    private void updateUI(Context context, AppWidgetManager appWidgetManager, int appWidgetId, String jsonResponse) {
        try {
            JSONObject data = new JSONObject(jsonResponse);
            int readyCount = data.getInt("readyCount");
            JSONArray orders = data.getJSONArray("orders");

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ready);
            attachRefreshIntent(context, views);
            views.setTextViewText(R.id.txt_ready_count, String.valueOf(readyCount));

            for (int i = 0; i < ROW_IDS.length; i++) {
                if (i < orders.length()) {
                    JSONObject order = orders.getJSONObject(i);
                    String orderId = order.getString("id");
                    String phone = order.optString("phone", "");
                    String itemType = order.optString("itemType", "");
                    String serviceType = order.optString("serviceType", "");

                    views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
                    views.setTextViewText(NAME_IDS[i], order.getString("customerName"));
                    String desc = itemType + (serviceType.isEmpty() ? "" : " • " + serviceType);
                    views.setTextViewText(DESC_IDS[i], desc);

                    // Tap-to-call: opens the dialer pre-filled (no permission needed).
                    if (!phone.isEmpty()) {
                        views.setViewVisibility(CALL_IDS[i], View.VISIBLE);
                        Intent dialIntent = new Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone.replaceAll("[^+0-9]", "")));
                        PendingIntent dialPendingIntent = PendingIntent.getActivity(
                                context,
                                100 + i,
                                dialIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );
                        views.setOnClickPendingIntent(CALL_IDS[i], dialPendingIntent);
                    } else {
                        views.setViewVisibility(CALL_IDS[i], View.GONE);
                    }

                    // WhatsApp: opens a pre-filled "your order is ready" chat.
                    String waUrl = order.optString("waUrl", "");
                    if (!waUrl.isEmpty()) {
                        views.setViewVisibility(WA_IDS[i], View.VISIBLE);
                        Intent waIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(waUrl));
                        waIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        PendingIntent waPendingIntent = PendingIntent.getActivity(
                                context,
                                120 + i,
                                waIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );
                        views.setOnClickPendingIntent(WA_IDS[i], waPendingIntent);
                    } else {
                        views.setViewVisibility(WA_IDS[i], View.GONE);
                    }

                    // Row tap: deep link into the order inside the app.
                    String orderUrl = APP_BASE_URL + "/orders/" + orderId;
                    Intent appIntent = new Intent(context, MainActivity.class);
                    appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    appIntent.setData(Uri.parse(orderUrl)); // makes each PendingIntent unique
                    appIntent.putExtra("url", orderUrl);
                    PendingIntent rowPendingIntent = PendingIntent.getActivity(
                            context,
                            110 + i,
                            appIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    views.setOnClickPendingIntent(ROW_IDS[i], rowPendingIntent);
                } else {
                    views.setViewVisibility(ROW_IDS[i], View.GONE);
                }
            }

            if (orders.length() == 0) {
                views.setViewVisibility(R.id.txt_ready_empty, View.VISIBLE);
                views.setTextViewText(R.id.txt_ready_empty, "Nothing ready right now.");
                views.setViewVisibility(R.id.txt_ready_more, View.GONE);
            } else {
                views.setViewVisibility(R.id.txt_ready_empty, View.GONE);
                int extra = readyCount - orders.length();
                if (extra > 0) {
                    views.setViewVisibility(R.id.txt_ready_more, View.VISIBLE);
                    views.setTextViewText(R.id.txt_ready_more, "+" + extra + " more in app");
                } else {
                    views.setViewVisibility(R.id.txt_ready_more, View.GONE);
                }
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
            showError(context, appWidgetManager, appWidgetId);
        }
    }

    private void showError(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_ready);
        attachRefreshIntent(context, views);
        views.setTextViewText(R.id.txt_ready_count, "ERR");
        for (int rowId : ROW_IDS) {
            views.setViewVisibility(rowId, View.GONE);
        }
        views.setViewVisibility(R.id.txt_ready_more, View.GONE);
        views.setViewVisibility(R.id.txt_ready_empty, View.VISIBLE);
        views.setTextViewText(R.id.txt_ready_empty, "Connection error.");
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
