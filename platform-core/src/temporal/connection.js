import { Connection, Client } from '@temporalio/client';

let _connection = null;
let _client = null;

export async function getConnection() {
  if (!_connection) {
    _connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233'
    });
  }
  return _connection;
}

export async function getClient() {
  if (!_client) {
    const connection = await getConnection();
    _client = new Client({
      connection,
      namespace: process.env.TEMPORAL_NAMESPACE || 'hb-production'
    });
  }
  return _client;
}
