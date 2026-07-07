package com.mrboot.crm;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashSet;
import java.util.Set;

/**
 * Polls the CRM every ~30 min (scheduled from MainActivity) and posts
 * actionable notifications:
 *   - Order became READY  -> "Call" + "WhatsApp" action buttons
 *   - Order went overdue  -> tap to open the order
 * SharedPreferences remembers what was already announced so each order
 * only ever notifies once per state.
 */
public class OrderAlertsWorker extends Worker {

    private static final String BASE_URL = "https://mr-boot-crm.vercel.app";
    private static final String CHANNEL_ID = "mrboot_alerts";
    private static final String PREFS = "mrboot_alert_prefs";
    private static final String KEY_READY = "notified_ready_ids";
    private static final String KEY_OVERDUE = "notified_overdue_ids";
    private static final int MAX_REMEMBERED_IDS = 300;

    public OrderAlertsWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) {
            return Result.success(); // notifications off — don't burn battery
        }
        createChannel(context);
        try {
            checkReadyOrders(context);
            checkOverdueOrders(context);
            return Result.success();
        } catch (Exception e) {
            e.printStackTrace();
            return Result.retry();
        }
    }

    private void checkReadyOrders(Context context) throws Exception {
        JSONObject data = fetchJson(BASE_URL + "/api/widget/ready");
        JSONArray orders = data.getJSONArray("orders");
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> notified = new HashSet<>(prefs.getStringSet(KEY_READY, new HashSet<String>()));

        for (int i = 0; i < orders.length(); i++) {
            JSONObject order = orders.getJSONObject(i);
            String id = order.getString("id");
            if (notified.contains(id)) continue;
            notified.add(id);

            String customer = order.optString("customerName", "Customer");
            String item = order.optString("itemType", "order");
            String phone = order.optString("phone", "");
            String waUrl = order.optString("waUrl", "");

            NotificationCompat.Builder builder = baseBuilder(context)
                    .setContentTitle("🥾 Ready: " + customer)
                    .setContentText(item + " is done — let them know!")
                    .setContentIntent(openAppIntent(context, BASE_URL + "/orders/" + id,
                            ("open-ready" + id).hashCode()));

            if (!phone.isEmpty()) {
                Intent dial = new Intent(Intent.ACTION_DIAL,
                        Uri.parse("tel:" + phone.replaceAll("[^+0-9]", "")));
                PendingIntent dialPi = PendingIntent.getActivity(
                        context, ("call" + id).hashCode(), dial,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                builder.addAction(android.R.drawable.ic_menu_call, "Call", dialPi);
            }
            if (!waUrl.isEmpty()) {
                Intent wa = new Intent(Intent.ACTION_VIEW, Uri.parse(waUrl));
                PendingIntent waPi = PendingIntent.getActivity(
                        context, ("wa" + id).hashCode(), wa,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                builder.addAction(android.R.drawable.sym_action_chat, "WhatsApp", waPi);
            }

            notifySafe(context, ("ready" + id).hashCode(), builder);
        }
        prefs.edit().putStringSet(KEY_READY, capSize(notified)).apply();
    }

    private void checkOverdueOrders(Context context) throws Exception {
        JSONObject data = fetchJson(BASE_URL + "/api/widget/due");
        JSONArray orders = data.getJSONArray("orders");
        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> notified = new HashSet<>(prefs.getStringSet(KEY_OVERDUE, new HashSet<String>()));

        for (int i = 0; i < orders.length(); i++) {
            JSONObject order = orders.getJSONObject(i);
            if (!order.optBoolean("isOverdue", false)) continue;
            String id = order.getString("id");
            if (notified.contains(id)) continue;
            notified.add(id);

            String customer = order.optString("customerName", "Customer");
            String item = order.optString("itemType", "order");
            String label = order.optString("dueLabel", "overdue");

            NotificationCompat.Builder builder = baseBuilder(context)
                    .setContentTitle("⏰ Overdue: " + customer)
                    .setContentText(item + " • " + label)
                    .setContentIntent(openAppIntent(context, BASE_URL + "/orders/" + id,
                            ("open-overdue" + id).hashCode()));

            notifySafe(context, ("overdue" + id).hashCode(), builder);
        }
        prefs.edit().putStringSet(KEY_OVERDUE, capSize(notified)).apply();
    }

    private NotificationCompat.Builder baseBuilder(Context context) {
        return new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_boot)
                .setColor(0xFF4A332D)
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH);
    }

    private PendingIntent openAppIntent(Context context, String url, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        intent.setData(Uri.parse(url)); // uniqueness — extras alone don't distinguish PendingIntents
        intent.putExtra("url", url);
        return PendingIntent.getActivity(context, requestCode, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void notifySafe(Context context, int id, NotificationCompat.Builder builder) {
        try {
            NotificationManagerCompat.from(context).notify(id, builder.build());
        } catch (SecurityException ignored) {
            // POST_NOTIFICATIONS revoked mid-flight — skip quietly.
        }
    }

    private void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Order alerts", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Ready-for-pickup and overdue order alerts");
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    /** Keep the remembered-ID sets from growing forever. */
    private Set<String> capSize(Set<String> set) {
        if (set.size() <= MAX_REMEMBERED_IDS) return set;
        Set<String> trimmed = new HashSet<>();
        int skip = set.size() - MAX_REMEMBERED_IDS;
        int index = 0;
        for (String s : set) {
            if (index++ >= skip) trimmed.add(s);
        }
        return trimmed;
    }

    private JSONObject fetchJson(String urlStr) throws Exception {
        URL url = new URL(urlStr);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(10000);
        conn.setRequestProperty("Accept", "application/json");
        try {
            if (conn.getResponseCode() != 200) {
                throw new Exception("HTTP " + conn.getResponseCode());
            }
            BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            reader.close();
            return new JSONObject(sb.toString());
        } finally {
            conn.disconnect();
        }
    }
}
