/**
 * Database connection utilities
 * This file handles optional database connections
 * These are runtime-only imports to prevent build-time resolution issues
 */

export class DatabaseConnections {
  static async connectMongoDB(connectionString) {
    try {
      // Use eval to prevent build-time resolution
      const mongodb = await eval('import("mongodb")');
      const { MongoClient } = mongodb;
      const client = new MongoClient(connectionString);
      await client.connect();
      return client;
    } catch (error) {
      console.warn('⚠️ MongoDB driver not available:', error.message);
      return null;
    }
  }

  static async connectMySQL(connectionString) {
    try {
      // Use eval to prevent build-time resolution
      const mysql = await eval('import("mysql2/promise")');
      const connection = await mysql.createConnection(connectionString);
      return connection;
    } catch (error) {
      console.warn('⚠️ MySQL driver not available:', error.message);
      return null;
    }
  }

  static async connectPostgreSQL(connectionString) {
    try {
      // Use eval to prevent build-time resolution
      const pg = await eval('import("pg")');
      const { Pool } = pg;
      const pool = new Pool(connectionString);
      return pool;
    } catch (error) {
      console.warn('⚠️ PostgreSQL driver not available:', error.message);
      return null;
    }
  }
}

export default DatabaseConnections;