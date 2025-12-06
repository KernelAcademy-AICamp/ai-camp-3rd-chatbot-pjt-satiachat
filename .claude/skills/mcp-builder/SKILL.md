---
name: mcp-builder
description: Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).
---

# MCP Server Development Guide

Create MCP servers that enable LLMs to interact with external services.

## TypeScript MCP Server (Recommended)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
});

server.tool(
  "get_weather",
  "Get current weather for a location",
  {
    location: z.string().describe("City name or coordinates"),
  },
  async ({ location }) => {
    const weather = await fetchWeather(location);
    return {
      content: [{ type: "text", text: JSON.stringify(weather, null, 2) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

## Python MCP Server (FastMCP)

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-mcp-server")

@mcp.tool()
def get_weather(location: str) -> str:
    """Get current weather for a location.

    Args:
        location: City name or coordinates
    """
    weather = fetch_weather(location)
    return json.dumps(weather, indent=2)

if __name__ == "__main__":
    mcp.run()
```

## Design Principles

### Tool Naming
- Use consistent prefixes: `github_create_issue`, `github_list_repos`
- Action-oriented naming
- Clear, descriptive names

### Error Messages
- Guide agents toward solutions
- Include specific suggestions and next steps

### Input Schema
- Use Zod (TypeScript) or Pydantic (Python)
- Include constraints and clear descriptions
- Add examples in field descriptions

### Annotations
- `readOnlyHint`: true/false
- `destructiveHint`: true/false
- `idempotentHint`: true/false

## Configuration

### Claude Desktop Config

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/server/build/index.js"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### Python Server Config

```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["/path/to/server.py"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

## Testing

```bash
# TypeScript
npm run build
npx @modelcontextprotocol/inspector

# Python
python -m py_compile your_server.py
```

## Resources

- TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk
- Python SDK: https://github.com/modelcontextprotocol/python-sdk
- Specification: https://modelcontextprotocol.io/specification
- Examples: https://github.com/modelcontextprotocol/servers
