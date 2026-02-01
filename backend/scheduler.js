/**
 * Scheduler for background jobs using node-cron
 * Enqueues periodic tasks like materialzed view refreshes
 */

const cron = require('node-cron');
const { jobQueue } = require('./queue');

// Configuration: refresh materialized views every hour (configurable via env)
const REFRESH_INTERVAL = process.env.MATERIALIZED_VIEW_REFRESH_INTERVAL || '0 * * * *'; // Default: every hour at minute 0

let cronJobs = [];

async function startScheduler() {
  console.log('[Scheduler] Starting...');
  try {
    // Schedule materialized view refresh
    const refreshJob = cron.schedule(REFRESH_INTERVAL, async () => {
      try {
        console.log('[Scheduler] Enqueueing refresh-materialized-views job...');
        await jobQueue.add('refresh-materialized-views', {}, { attempts: 2 });
        console.log('[Scheduler] Successfully enqueued refresh-materialized-views job');
      } catch (err) {
        console.error('[Scheduler] Failed to enqueue refresh job:', err.message);
      }
    });
    cronJobs.push(refreshJob);
    console.log(`[Scheduler] Materialized view refresh scheduled: "${REFRESH_INTERVAL}"`);
  } catch (err) {
    console.error('[Scheduler] Failed to start scheduler:', err);
    throw err;
  }
}

async function stopScheduler() {
  console.log('[Scheduler] Stopping...');
  cronJobs.forEach(job => job.stop());
  cronJobs = [];
  console.log('[Scheduler] Stopped');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Scheduler] SIGTERM received, shutting down gracefully...');
  await stopScheduler();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Scheduler] SIGINT received, shutting down gracefully...');
  await stopScheduler();
  process.exit(0);
});

// Start scheduler if this file is run directly
if (require.main === module) {
  startScheduler()
    .then(() => {
      console.log('[Scheduler] Ready and waiting for cron events...');
    })
    .catch(err => {
      console.error('[Scheduler] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { startScheduler, stopScheduler };
