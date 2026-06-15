// Redis client removed - using Worker service HTTP endpoints instead
// This file kept as stub for backward compatibility

const redis = {
  lpush: async () => { throw new Error("Redis deprecated - use Worker service"); },
  zadd: async () => { throw new Error("Redis deprecated - use Worker service"); },
  get: async () => { throw new Error("Redis deprecated - use Worker service"); },
  setex: async () => { throw new Error("Redis deprecated - use Worker service"); },
};

export default redis;
