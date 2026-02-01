const { Queue, Worker, QueueScheduler } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const jobQueue = new Queue('jobs', { connection });
const queueScheduler = new QueueScheduler('jobs', { connection });

function createWorker(processor) {
  return new Worker('jobs', processor, { connection });
}

module.exports = { jobQueue, createWorker, connection, queueScheduler };
