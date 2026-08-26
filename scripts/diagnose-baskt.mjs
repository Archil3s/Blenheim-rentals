const MCP = "https://baskt.nz/api/mcp";

async function get(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await response.text();
  console.log(`\nGET ${url}\nstatus=${response.status} content-type=${response.headers.get("content-type")}`);
  console.log(text.slice(0, 5000));
}

async function post(body, sessionId) {
  const headers = {
    Accept: "application/json, text/event-stream",
    "Content-Type": "application/json",
  };
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;
  const response = await fetch(MCP, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await response.text();
  console.log(`\nPOST ${body.method}\nstatus=${response.status} session=${response.headers.get("mcp-session-id")}`);
  console.log(text.slice(0, 8000));
  return { response, text, sessionId: response.headers.get("mcp-session-id") || sessionId };
}

await get("https://baskt.nz/api/v1/items?q=cheese&limit=3");
await get("https://baskt.nz/api/v1/items?q=cheese&region=Blenheim&limit=3");
await get("https://baskt.nz/api/v1/items?q=cheese&location=Blenheim&limit=3");
await get("https://baskt.nz/api/v1/locations?q=Blenheim&limit=10");

const init = await post({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "blenheim-price-finder-diagnostic", version: "1.0.0" },
  },
});

await post({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }, init.sessionId);
const tools = await post({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, init.sessionId);

let parsed;
try {
  parsed = JSON.parse(tools.text);
} catch {
  const dataLine = tools.text.split(/\r?\n/).find((line) => line.startsWith("data:"));
  parsed = dataLine ? JSON.parse(dataLine.slice(5).trim()) : null;
}

const searchTool = parsed?.result?.tools?.find((tool) => tool.name === "search_items");
console.log("\nSEARCH TOOL SCHEMA\n", JSON.stringify(searchTool, null, 2));

if (searchTool) {
  const props = searchTool.inputSchema?.properties ?? {};
  const args = {};
  if ("q" in props) args.q = "cheese";
  else if ("query" in props) args.query = "cheese";
  else if ("search" in props) args.search = "cheese";
  if ("region" in props) args.region = "Blenheim";
  else if ("location" in props) args.location = "Blenheim";
  if ("vertical" in props) args.vertical = "grocery";
  if ("limit" in props) args.limit = 5;
  await post({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "search_items", arguments: args },
  }, init.sessionId);
}
