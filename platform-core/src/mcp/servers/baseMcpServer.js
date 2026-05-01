/**
 * Base MCP Server factory
 * Creates an HTTP-based MCP server with tool registration and cost control
 */
import express from 'express';
import logger from '../../utils/logger.js';

export function createMcpServer({ name, version = '1.0.0', port, tools }) {
  const app = express();
  app.use(express.json());

  // A2A internal token auth
  const A2A_TOKEN = process.env.A2A_INTERNAL_TOKEN;

  app.use((req, res, next) => {
    if (req.path === '/.well-known/mcp' || req.path === '/health') return next();
    const token = req.headers['x-a2a-token'] || req.headers.authorization?.replace('Bearer ', '');
    if (A2A_TOKEN && token !== A2A_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
  });

  // MCP discovery endpoint
  app.get('/.well-known/mcp', (req, res) => {
    res.json({
      name,
      version,
      protocol: 'mcp',
      tools: tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
    });
  });

  // Health check
  app.get('/health', (req, res) => res.json({ status: 'ok', name }));

  // Tool invocation endpoint
  app.post('/tools/:toolName', async (req, res) => {
    const tool = tools.find(t => t.name === req.params.toolName);
    if (!tool) return res.status(404).json({ error: `Tool ${req.params.toolName} not found` });
    try {
      const result = await tool.handler(req.body);
      res.json({ result });
    } catch (error) {
      logger.error(`[mcp:${name}] Tool ${req.params.toolName} error:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  function start() {
    app.listen(port, '127.0.0.1', () => {
      logger.info(`[mcp:${name}] Started on port ${port}`);
    });
  }

  return { app, start };
}
