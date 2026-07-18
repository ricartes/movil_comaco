package io.gestionasi.comaco.tracking;

import android.app.job.JobInfo;
import android.app.job.JobParameters;
import android.app.job.JobScheduler;
import android.app.job.JobService;
import android.content.ComponentName;
import android.content.Context;

public final class DeviceAuditJobService extends JobService {
    private static final int JOB_ID_RECOVERY = 47022;
    private static final int JOB_ID_DAILY = 47023;
    private static final long DAILY_INTERVAL_MS = 24L * 60L * 60L * 1000L;
    private volatile DeviceAuditStore store;
    private DeviceAuditUploader uploader;

    static void schedule(Context context) {
        JobScheduler scheduler =
                (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (scheduler == null) return;
        JobInfo job = new JobInfo.Builder(
                JOB_ID_RECOVERY,
                new ComponentName(context, DeviceAuditJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .setMinimumLatency(1000L)
                .setBackoffCriteria(15000L, JobInfo.BACKOFF_POLICY_EXPONENTIAL)
                .build();
        scheduler.schedule(job);
    }

    static void scheduleDaily(Context context) {
        JobScheduler scheduler =
                (JobScheduler) context.getSystemService(Context.JOB_SCHEDULER_SERVICE);
        if (scheduler == null) return;
        JobInfo job = new JobInfo.Builder(
                JOB_ID_DAILY,
                new ComponentName(context, DeviceAuditJobService.class))
                .setRequiredNetworkType(JobInfo.NETWORK_TYPE_ANY)
                .setPersisted(true)
                .setPeriodic(DAILY_INTERVAL_MS)
                .build();
        scheduler.schedule(job);
    }

    @Override
    public synchronized boolean onStartJob(JobParameters params) {
        if (store != null) return false;
        store = new DeviceAuditStore(getApplicationContext());
        if (params.getJobId() == JOB_ID_DAILY) {
            TrackingStore trackingStore = new TrackingStore(getApplicationContext());
            try {
                PowerPolicyInspector inspector = new PowerPolicyInspector(getApplicationContext());
                store.enqueueConfiguration(
                        inspector.inspect(trackingStore, "reporte_24h", false),
                        null, null, true);
            } catch (Exception ignored) {
                // La auditorÃ­a periÃ³dica no altera el tracking ni su health.
            } finally {
                trackingStore.close();
            }
        }
        uploader = new DeviceAuditUploader(store, () -> {
            boolean pending = store != null && store.hasPending();
            boolean retryable = pending && store != null && store.canUpload();
            if (retryable) schedule(getApplicationContext());
            if (uploader != null) {
                uploader.close();
                uploader = null;
            }
            if (store != null) {
                store.close();
                store = null;
            }
            jobFinished(params, params.getJobId() == JOB_ID_RECOVERY && retryable);
        });
        uploader.drain("job_network");
        return true;
    }

    @Override
    public boolean onStopJob(JobParameters params) {
        boolean retryable = store != null && store.hasPending() && store.canUpload();
        if (uploader != null) {
            uploader.close();
            uploader = null;
        }
        if (store != null) {
            store.close();
            store = null;
        }
        return retryable;
    }
}
