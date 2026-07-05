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
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class WorkspaceWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_REFRESH = "com.mrboot.crm.ACTION_REFRESH";
    private static final String API_URL = "https://mr-boot-crm.vercel.app/api/widget";

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
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, WorkspaceWidgetProvider.class));
            for (int appWidgetId : appWidgetIds) {
                // Show temporary "Loading..." or refresh indicators if desired
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.workspace_widget);
                views.setTextViewText(R.id.txt_pending_count, "...");
                appWidgetManager.updateAppWidget(appWidgetId, views);
                
                // Trigger fetch
                fetchWidgetData(context, appWidgetManager, appWidgetId);
            }
        }
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.workspace_widget);

        // Setup CTA Button intent (Opens MainActivity)
        // We can pass a deep link or URL if MainActivity is configured to handle it,
        // but launching the app directly is excellent.
        Intent appIntent = new Intent(context, MainActivity.class);
        appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        // Add direct navigation extra if the wrapper supports deep linking
        appIntent.putExtra("url", "https://mr-boot-crm.vercel.app/orders/new");
        PendingIntent appPendingIntent = PendingIntent.getActivity(
                context, 
                0, 
                appIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_new_order, appPendingIntent);

        // Setup Refresh Button intent
        Intent refreshIntent = new Intent(context, WorkspaceWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context, 
                0, 
                refreshIntent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_refresh, refreshPendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);

        // Fetch new data
        fetchWidgetData(context, appWidgetManager, appWidgetId);
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
                        
                        // Parse JSON and update UI on main thread
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
            int pendingCount = data.getInt("pendingCount");
            JSONArray upcomingOrders = data.getJSONArray("upcomingOrders");

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.workspace_widget);
            views.setTextViewText(R.id.txt_pending_count, String.valueOf(pendingCount));

            if (upcomingOrders.length() > 0) {
                views.setViewVisibility(R.id.txt_empty_deliveries, View.GONE);
                
                // Populate Card 1
                JSONObject order1 = upcomingOrders.getJSONObject(0);
                views.setViewVisibility(R.id.layout_delivery_1, View.VISIBLE);
                views.setTextViewText(R.id.txt_delivery_time_1, formatDueDate(order1.getString("dueDate")));
                views.setTextViewText(R.id.txt_delivery_price_1, "₹" + formatPrice(order1.getString("price")));
                views.setTextViewText(R.id.txt_delivery_name_1, order1.getString("customerName"));
                
                String itemType = order1.optString("itemType", "");
                String details1 = order1.getString("serviceType") + (itemType.isEmpty() ? "" : " (" + itemType + ")");
                views.setTextViewText(R.id.txt_delivery_desc_1, details1);

                // Populate Card 2 (if exists)
                if (upcomingOrders.length() > 1) {
                    JSONObject order2 = upcomingOrders.getJSONObject(1);
                    views.setViewVisibility(R.id.layout_delivery_2, View.VISIBLE);
                    views.setTextViewText(R.id.txt_delivery_time_2, formatDueDate(order2.getString("dueDate")));
                    views.setTextViewText(R.id.txt_delivery_price_2, "₹" + formatPrice(order2.getString("price")));
                    views.setTextViewText(R.id.txt_delivery_name_2, order2.getString("customerName"));
                    
                    String itemType2 = order2.optString("itemType", "");
                    String details2 = order2.getString("serviceType") + (itemType2.isEmpty() ? "" : " (" + itemType2 + ")");
                    views.setTextViewText(R.id.txt_delivery_desc_2, details2);
                } else {
                    views.setViewVisibility(R.id.layout_delivery_2, View.GONE);
                }
            } else {
                views.setViewVisibility(R.id.layout_delivery_1, View.GONE);
                views.setViewVisibility(R.id.layout_delivery_2, View.GONE);
                views.setViewVisibility(R.id.txt_empty_deliveries, View.VISIBLE);
            }

            appWidgetManager.updateAppWidget(appWidgetId, views);

        } catch (Exception e) {
            e.printStackTrace();
            showError(context, appWidgetManager, appWidgetId);
        }
    }

    private void showError(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.workspace_widget);
        views.setTextViewText(R.id.txt_pending_count, "ERR");
        views.setViewVisibility(R.id.layout_delivery_1, View.GONE);
        views.setViewVisibility(R.id.layout_delivery_2, View.GONE);
        views.setViewVisibility(R.id.txt_empty_deliveries, View.VISIBLE);
        views.setTextViewText(R.id.txt_empty_deliveries, "Connection error.");
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private String formatPrice(String price) {
        try {
            double amount = Double.parseDouble(price);
            return String.format(Locale.getDefault(), "%,.0f", amount);
        } catch (Exception e) {
            return price;
        }
    }

    private String formatDueDate(String isoDateStr) {
        try {
            // Parses ISO date (e.g. 2026-07-06T10:00:00.000Z)
            SimpleDateFormat parser = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US);
            parser.setTimeZone(TimeZone.getTimeZone("UTC"));
            Date date = parser.parse(isoDateStr);

            // Determine if Today or Tomorrow in IST
            SimpleDateFormat istFormatter = new SimpleDateFormat("yyyyMMdd", Locale.US);
            istFormatter.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
            
            Date today = new Date();
            Date tomorrow = new Date(today.getTime() + (1000 * 60 * 60 * 24));

            String todayStr = istFormatter.format(today);
            String tomorrowStr = istFormatter.format(tomorrow);
            String targetStr = istFormatter.format(date);

            SimpleDateFormat timeFormat = new SimpleDateFormat("h:mm a", Locale.US);
            timeFormat.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
            String formattedTime = timeFormat.format(date);

            if (targetStr.equals(todayStr)) {
                return "Today, " + formattedTime;
            } else if (targetStr.equals(tomorrowStr)) {
                return "Tomorrow, " + formattedTime;
            } else {
                SimpleDateFormat weekdayFormat = new SimpleDateFormat("EEEE, h:mm a", Locale.US);
                weekdayFormat.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
                return weekdayFormat.format(date);
            }
        } catch (Exception e) {
            return "Upcoming";
        }
    }
}
