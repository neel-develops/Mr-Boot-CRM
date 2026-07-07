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
 * "Due Today / Overdue" widget — most urgent orders first,
 * overdue rows flagged red. Tapping a row opens that order in the app.
 */
public class DueWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_REFRESH = "com.mrboot.crm.ACTION_REFRESH_DUE";
    private static final String API_URL = "https://mr-boot-crm.vercel.app/api/widget/due";
    private static final String APP_BASE_URL = "https://mr-boot-crm.vercel.app";

    private static final int COLOR_RED = 0xFFC0392B;
    private static final int COLOR_BROWN = 0xFF361F1A;

    private static final int[] ROW_IDS = {R.id.row_due_1, R.id.row_due_2, R.id.row_due_3};
    private static final int[] NAME_IDS = {R.id.txt_due_name_1, R.id.txt_due_name_2, R.id.txt_due_name_3};
    private static final int[] DESC_IDS = {R.id.txt_due_desc_1, R.id.txt_due_desc_2, R.id.txt_due_desc_3};
    private static final int[] LABEL_IDS = {R.id.txt_due_label_1, R.id.txt_due_label_2, R.id.txt_due_label_3};

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
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, DueWidgetProvider.class));
            for (int appWidgetId : appWidgetIds) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_due);
                views.setTextViewText(R.id.txt_due_today_count, "Refreshing…");
                appWidgetManager.updateAppWidget(appWidgetId, views);
                fetchWidgetData(context, appWidgetManager, appWidgetId);
            }
        }
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_due);
        attachRefreshIntent(context, views);
        appWidgetManager.updateAppWidget(appWidgetId, views);
        fetchWidgetData(context, appWidgetManager, appWidgetId);
    }

    private void attachRefreshIntent(Context context, RemoteViews views) {
        Intent refreshIntent = new Intent(context, DueWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_refresh_due, refreshPendingIntent);
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
            int overdueCount = data.getInt("overdueCount");
            int dueTodayCount = data.getInt("dueTodayCount");
            JSONArray orders = data.getJSONArray("orders");

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_due);
            attachRefreshIntent(context, views);

            // Header counts
            if (overdueCount > 0) {
                views.setViewVisibility(R.id.txt_overdue_count, View.VISIBLE);
                views.setTextViewText(R.id.txt_overdue_count, overdueCount + " OVERDUE");
                views.setTextViewText(R.id.txt_due_today_count, "  •  " + dueTodayCount + " due today");
            } else {
                views.setViewVisibility(R.id.txt_overdue_count, View.GONE);
                views.setTextViewText(R.id.txt_due_today_count, dueTodayCount + " due today");
            }

            for (int i = 0; i < ROW_IDS.length; i++) {
                if (i < orders.length()) {
                    JSONObject order = orders.getJSONObject(i);
                    String orderId = order.getString("id");
                    boolean isOverdue = order.optBoolean("isOverdue", false);
                    String itemType = order.optString("itemType", "");
                    String serviceType = order.optString("serviceType", "");

                    views.setViewVisibility(ROW_IDS[i], View.VISIBLE);
                    views.setTextViewText(NAME_IDS[i], order.getString("customerName"));
                    String desc = itemType + (serviceType.isEmpty() ? "" : " • " + serviceType);
                    views.setTextViewText(DESC_IDS[i], desc);
                    views.setTextViewText(LABEL_IDS[i], order.optString("dueLabel", ""));

                    // Red treatment for overdue rows; always set both ways
                    // because RemoteViews get reused between updates.
                    views.setInt(ROW_IDS[i], "setBackgroundResource",
                            isOverdue ? R.drawable.card_overdue_background : R.drawable.card_background);
                    views.setTextColor(LABEL_IDS[i], isOverdue ? COLOR_RED : COLOR_BROWN);

                    String orderUrl = APP_BASE_URL + "/orders/" + orderId;
                    Intent appIntent = new Intent(context, MainActivity.class);
                    appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    appIntent.setData(Uri.parse(orderUrl)); // makes each PendingIntent unique
                    appIntent.putExtra("url", orderUrl);
                    PendingIntent rowPendingIntent = PendingIntent.getActivity(
                            context,
                            200 + i,
                            appIntent,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );
                    views.setOnClickPendingIntent(ROW_IDS[i], rowPendingIntent);
                } else {
                    views.setViewVisibility(ROW_IDS[i], View.GONE);
                }
            }

            if (orders.length() == 0) {
                views.setViewVisibility(R.id.txt_due_empty, View.VISIBLE);
                views.setTextViewText(R.id.txt_due_empty, "All clear. Nothing due. 🎉");
            } else {
                views.setViewVisibility(R.id.txt_due_empty, View.GONE);
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
            showError(context, appWidgetManager, appWidgetId);
        }
    }

    private void showError(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_due);
        attachRefreshIntent(context, views);
        views.setViewVisibility(R.id.txt_overdue_count, View.GONE);
        views.setTextViewText(R.id.txt_due_today_count, "—");
        for (int rowId : ROW_IDS) {
            views.setViewVisibility(rowId, View.GONE);
        }
        views.setViewVisibility(R.id.txt_due_empty, View.VISIBLE);
        views.setTextViewText(R.id.txt_due_empty, "Connection error.");
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
