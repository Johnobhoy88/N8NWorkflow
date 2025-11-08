#!/usr/bin/env node

/**
 * Database Query MCP Server
 *
 * Enables Claude Code to query databases:
 * - Execute SELECT queries
 * - Get schema information
 * - Run aggregations
 * - Table statistics
 */

const { McpServer } = require('@anthropic-ai/sdk/mcp');
const { Client: PgClient } = require('pg');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

const DB_TYPE = process.env.DB_TYPE || 'postgres'; // postgres, mysql, mongodb
const DB_CONNECTION = process.env.DB_CONNECTION_STRING;

if (!DB_CONNECTION) {
  console.error('Error: DB_CONNECTION_STRING environment variable is required');
  process.exit(1);
}

// Initialize database connection
let dbClient;

async function initializeDatabase() {
  if (DB_TYPE === 'postgres') {
    dbClient = new PgClient({connectionString: DB_CONNECTION});
    await dbClient.connect();
  } else if (DB_TYPE === 'mysql') {
    dbClient = await mysql.createConnection(DB_CONNECTION);
  } else if (DB_TYPE === 'mongodb') {
    const client = new MongoClient(DB_CONNECTION);
    await client.connect();
    dbClient = client.db();
  }
}

const server = new McpServer({
  name: 'database-query-tool',
  version: '1.0.0',
  description: 'Query databases via MCP'
});

// Tool: Execute SELECT query
server.tool({
  name: 'query_database',
  description: 'Execute a SELECT query on the database',
  parameters: {
    query: {type: 'string', description: 'SQL SELECT query', required: true},
    limit: {type: 'number', description: 'Max rows to return', default: 100, required: false}
  },
  execute: async ({ query, limit = 100 }) => {
    try {
      // Security: Only allow SELECT queries
      if (!query.trim().toUpperCase().startsWith('SELECT')) {
        return {
          content: [{type: 'text', text: 'Error: Only SELECT queries are allowed'}],
          isError: true
        };
      }

      // Add LIMIT if not present
      if (!query.toUpperCase().includes('LIMIT')) {
        query += ` LIMIT ${limit}`;
      }

      let results;
      if (DB_TYPE === 'postgres' || DB_TYPE === 'mysql') {
        const result = await dbClient.query(query);
        results = DB_TYPE === 'postgres' ? result.rows : result[0];
      } else if (DB_TYPE === 'mongodb') {
        // Convert SQL-like query to MongoDB (simplified)
        return {
          content: [{type: 'text', text: 'MongoDB queries not yet supported via SQL syntax'}],
          isError: true
        };
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            rowCount: results.length,
            rows: results
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{type: 'text', text: `Error: ${error.message}`}],
        isError: true
      };
    }
  }
});

// Tool: Get table schema
server.tool({
  name: 'get_schema',
  description: 'Get schema information for a table',
  parameters: {
    tableName: {type: 'string', description: 'Name of the table', required: true}
  },
  execute: async ({ tableName }) => {
    try {
      let schema;

      if (DB_TYPE === 'postgres') {
        const result = await dbClient.query(`
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        schema = result.rows;
      } else if (DB_TYPE === 'mysql') {
        const [rows] = await dbClient.query(`
          SELECT
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            IS_NULLABLE as is_nullable,
            COLUMN_DEFAULT as column_default
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `, [tableName]);
        schema = rows;
      }

      return {
        content: [{type: 'text', text: JSON.stringify(schema, null, 2)}]
      };
    } catch (error) {
      return {
        content: [{type: 'text', text: `Error: ${error.message}`}],
        isError: true
      };
    }
  }
});

// Tool: List all tables
server.tool({
  name: 'list_tables',
  description: 'List all tables in the database',
  parameters: {},
  execute: async () => {
    try {
      let tables;

      if (DB_TYPE === 'postgres') {
        const result = await dbClient.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public'
          ORDER BY tablename
        `);
        tables = result.rows.map(r => r.tablename);
      } else if (DB_TYPE === 'mysql') {
        const [rows] = await dbClient.query('SHOW TABLES');
        tables = rows.map(r => Object.values(r)[0]);
      } else if (DB_TYPE === 'mongodb') {
        tables = await dbClient.listCollections().toArray();
        tables = tables.map(t => t.name);
      }

      return {
        content: [{type: 'text', text: JSON.stringify(tables, null, 2)}]
      };
    } catch (error) {
      return {
        content: [{type: 'text', text: `Error: ${error.message}`}],
        isError: true
      };
    }
  }
});

// Tool: Get table statistics
server.tool({
  name: 'get_table_stats',
  description: 'Get statistics for a table (row count, size, etc.)',
  parameters: {
    tableName: {type: 'string', description: 'Name of the table', required: true}
  },
  execute: async ({ tableName }) => {
    try {
      let stats = {};

      if (DB_TYPE === 'postgres') {
        const countResult = await dbClient.query(`SELECT COUNT(*) FROM ${tableName}`);
        const sizeResult = await dbClient.query(`
          SELECT pg_size_pretty(pg_total_relation_size($1)) as size
        `, [tableName]);

        stats = {
          rowCount: parseInt(countResult.rows[0].count),
          size: sizeResult.rows[0].size
        };
      } else if (DB_TYPE === 'mysql') {
        const [countRows] = await dbClient.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        stats = {rowCount: countRows[0].count};
      } else if (DB_TYPE === 'mongodb') {
        const count = await dbClient.collection(tableName).countDocuments();
        stats = {documentCount: count};
      }

      return {
        content: [{type: 'text', text: JSON.stringify(stats, null, 2)}]
      };
    } catch (error) {
      return {
        content: [{type: 'text', text: `Error: ${error.message}`}],
        isError: true
      };
    }
  }
});

// Start server
console.log('Starting Database Query MCP Server...');
console.log(`Database Type: ${DB_TYPE}`);

initializeDatabase().then(() => {
  server.start().then(() => {
    console.log('MCP Server started successfully');
  }).catch(error => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}).catch(error => {
  console.error('Failed to connect to database:', error);
  process.exit(1);
});
