import Redis from "ioredis";
import { env } from "./env";

/**
 * ioredis puts a connection into subscriber mode for the lifetime of a
 * SUBSCRIBE call, so pub/sub needs its own connection separate from the
 * one used for regular commands (GET/SET/RPUSH/etc).
 */
export const redis = new Redis(env.redisUrl);
export const redisSub = new Redis(env.redisUrl);

redis.on("error", (err) => console.error("[redis] command client error", err));
redisSub.on("error", (err) => console.error("[redis] subscriber client error", err));
