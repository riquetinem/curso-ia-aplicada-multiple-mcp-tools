const CONNECTION_STRING = process.env.MONGODB_CONNECTION_STRING!;

console.assert(CONNECTION_STRING, 'MONGODB_CONNECTION_STRING is not set in environment variables');

/**
 * Extrai o nome do banco do proprio connection string, para que a URI seja a
 * unica fonte de verdade — um MONGODB_DATABASE separado poderia divergir do
 * banco realmente apontado pela URI.
 */
function databaseFromConnectionString(uri: string): string {
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, '').split('?')[0];
  const separator = withoutScheme.indexOf('/');

  return separator === -1 ? '' : withoutScheme.slice(separator + 1);
}

export const MONGO_DATABASE = databaseFromConnectionString(CONNECTION_STRING ?? '');

if (!MONGO_DATABASE) {
  throw new Error(
    'MONGODB_CONNECTION_STRING precisa incluir o nome do banco, ' +
    'ex: mongodb://localhost:27017/dataprocessing'
  );
}

export const getMongoDBTool = () => {
  return {
    "MongoDB": {
      transport: 'stdio' as const,

      "command": "npx",
      "args": ["-y", "mongodb-mcp-server@latest"],
      "env": {
        "MDB_MCP_CONNECTION_STRING": CONNECTION_STRING
      }
    }
  }
}
