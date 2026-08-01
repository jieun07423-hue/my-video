import { EventEmitter } from 'events';

class KDSEventEmitter extends EventEmitter {}

export const kdsEventEmitter = new KDSEventEmitter();
