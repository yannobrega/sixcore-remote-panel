const panel = (process.env.PANEL_URL || "https://access.sixcore.com.br").replace(/\/$/, "");
const gateway = (process.env.GATEWAY_URL || "https://remote.sixcore.com.br").replace(/\/$/, "");
const key = process.env.GATEWAY_API_KEY;
async function check(name, fn){try{await fn();console.log(`PASS ${name}`)}catch(e){console.error(`FAIL ${name}: ${e instanceof Error?e.message:String(e)}`);process.exitCode=1}}
await check("panel health",async()=>{const r=await fetch(`${panel}/api/health`);if(!r.ok)throw new Error(`HTTP ${r.status}`);const j=await r.json();if(j.ok!==true||j.database!=="ok")throw new Error(JSON.stringify(j))});
await check("gateway health",async()=>{const r=await fetch(`${gateway}/health`);if(!r.ok)throw new Error(`HTTP ${r.status}`);const j=await r.json();if(j.ok!==true)throw new Error(JSON.stringify(j))});
if(key)await check("gateway private API",async()=>{const r=await fetch(`${gateway}/private/v1/capabilities`,{headers:{authorization:`Bearer ${key}`,origin:new URL(panel).origin}});if(!r.ok)throw new Error(`HTTP ${r.status}`)});else console.log("SKIP gateway private API (GATEWAY_API_KEY not set in shell)");
