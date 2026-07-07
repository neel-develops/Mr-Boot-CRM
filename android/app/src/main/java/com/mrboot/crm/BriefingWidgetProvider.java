package com.mrboot.crm;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * "Daily Briefing" widget — an AI-written one-liner about the shop's day
 * (via Groq on the server), plus live stat chips. Tapping the widget opens the app.
 */
public class BriefingWidgetProvider extends AppWidgetProvider {

    private static final String ACTION_REFRESH = "com.mrboot.crm.ACTION_REFRESH_BRIEFING";
    private static final String API_URL = "https://mr-boot-crm.vercel.app/api/widget/briefing";

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
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, BriefingWidgetProvider.class));
            for (int appWidgetId : appWidgetIds) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_briefing);
                views.setTextViewText(R.id.txt_briefing, "Thinking…");
                appWidgetManager.updateAppWidget(appWidgetId, views);
                fetchWidgetData(context, appWidgetManager, appWidgetId);
            }
        }
    }

    private void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_briefing);
        attachIntents(context, views);
        appWidgetManager.updateAppWidget(appWidgetId, views);
        fetchWidgetData(context, appWidgetManager, appWidgetId);
    }

    private void attachIntents(Context context, RemoteViews views) {
        // Refresh button re-generates the briefing.
        Intent refreshIntent = new Intent(context, BriefingWidgetProvider.class);
        refreshIntent.setAction(ACTION_REFRESH);
        PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                0,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.btn_refresh_briefing, refreshPendingIntent);

        // Tapping the widget body opens the app.
        Intent appIntent = new Intent(context, MainActivity.class);
        appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent appPendingIntent = PendingIntent.getActivity(
                context,
                300,
                appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.briefing_root, appPendingIntent);
    }

    private void fetchWidgetData(final Context context, final AppWidgetManager appWidgetManager, final int appWidgetId) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    URL url = new URL(API_URL);
                    HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
                    urlConnection.setRequestMethod("GET");
                    // AI generation can take a few seconds — allow a longer read timeout.
                    urlConnection.setConnectTimeout(8000);
                    urlConnection.setReadTimeout(20000);
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
            String briefing = data.getString("briefing");
            JSONObject stats = data.getJSONObject("stats");
            int dueToday = stats.optInt("dueToday", 0);
            int overdue = stats.optInt("overdue", 0);
            int ready = stats.optInt("ready", 0);
            int lowStock = stats.optInt("lowStock", 0);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_briefing);
            attachIntents(context, views);

            views.setTextViewText(R.id.txt_briefing_date, formatToday());
            views.setTextViewText(R.id.txt_briefing, briefing);

            String dueChip = "🔥 " + dueToday + " due";
            if (overdue > 0) {
                dueChip += " · " + overdue + " late";
            }
            views.setTextViewText(R.id.txt_chip_due, dueChip);
            views.setTextViewText(R.id.txt_chip_ready, "✅ " + ready + " ready");
            views.setTextViewText(R.id.txt_chip_stock, "📦 " + lowStock + " low");

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception e) {
            e.printStackTrace();
            showError(context, appWidgetManager, appWidgetId);
        }
    }

    private void showError(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_briefing);
        attachIntents(context, views);
        views.setTextViewText(R.id.txt_briefing_date, formatToday());
        views.setTextViewText(R.id.txt_briefing, "Couldn't reach the workshop brain. Tap refresh to retry.");
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private String formatToday() {
        SimpleDateFormat format = new SimpleDateFormat("EEEE, d MMMM", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("Asia/Kolkata"));
        return format.format(new Date());
    }
}
