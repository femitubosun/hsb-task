import { connect, Connection } from 'mongoose';
import { createClient, RedisClientType } from 'redis';

export class IntegrationTestSetup {
  mongoConnection: Connection | null = null;
  redisClient: RedisClientType | null = null;

  async setupMongo(): Promise<Connection> {
    const uri =
      process.env.MONGODB_URI ||
      'mongodb://admin:test123@localhost:27018/hsb-test?authSource=admin';

    this.mongoConnection = (await connect(uri)).connection;

    return this.mongoConnection;
  }

  async setupRedis(): Promise<RedisClientType> {
    this.redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6380'}`,
    });

    await this.redisClient.connect();

    return this.redisClient;
  }

  async cleanup() {
    if (this.mongoConnection) {
      await this.mongoConnection.dropDatabase();
      await this.mongoConnection.close();
    }

    if (this.redisClient) {
      await this.redisClient.flushAll();
      await this.redisClient.quit();
    }
  }

  async cleanupBetweenTests() {
    if (this.redisClient) {
      await this.redisClient.flushAll();
    }

    if (this.mongoConnection) {
      const collections = await this.mongoConnection.db!.collections();
      for (const collection of collections) {
        await collection.deleteMany({});
      }
    }
  }
}
