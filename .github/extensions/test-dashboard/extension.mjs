// Extension: test-dashboard
// Visual test dashboard: per-test results, coverage, and last passing commit.
//
// Wiring only. The snapshot reader lives in ./data.mjs and the iframe document
// in ./renderer.mjs.
//
// NOTE: stdout is reserved for JSON-RPC. Never console.log here — use session.log.

import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { joinSession, createCanvas, CanvasError } from "@github/copilot-sdk/extension";

import { readSnapshot } from "./data.mjs";
import { renderHtml } from "./renderer.mjs";

// .github/extensions/test-dashboard/extension.mjs -> repo root is four levels up.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** instanceId -> { server, url, clients:Set<ServerResponse> } */
const servers = new Map();

/** Only one test run at a time, shared across every open instance. */
let running = false;

function broadcast(event, payload) {
    const data = typeof payload === "string" ? payload : JSON.stringify(payload);
    const frame = `event: ${event}\ndata: ${data.replace(/\n/g, "\ndata: ")}\n\n`;
    for (const entry of servers.values()) {
        for (const client of entry.clients) {
            try {
                client.write(frame);
            } catch {
                entry.clients.delete(client);
            }
        }
    }
}

async function pushSnapshot() {
    const snapshot = await readSnapshot(REPO_ROOT);
    broadcast("snapshot", snapshot);
    return snapshot;
}

/**
 * Run the coverage suite, streaming output to every open canvas, then push a
 * fresh snapshot. Resolves with the exit code; a non-zero code is reported
 * honestly rather than swallowed.
 */
function runTests() {
    return new Promise((resolvePromise) => {
        running = true;
        broadcast("run-state", { running: true });

        const child = spawn("npm", ["run", "test:coverage"], {
            cwd: REPO_ROOT,
            shell: process.platform === "win32",
            env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
        });

        let tail = "";
        const emit = (chunk) => {
            tail += chunk.toString();
            const lines = tail.split(/\r?\n/);
            tail = lines.pop() ?? "";
            for (const line of lines) {
                // Strip any ANSI the runner emits despite NO_COLOR.
                broadcast("log", line.replace(/\u001b\[[0-9;]*m/g, ""));
            }
        };

        child.stdout.on("data", emit);
        child.stderr.on("data", emit);

        const finish = async (code, errorText) => {
            if (tail.trim()) broadcast("log", tail.trim());
            tail = "";
            if (errorText) broadcast("log", errorText);
            broadcast("log", code === 0 ? "\u2713 Run finished." : `\u2715 Run exited with code ${code}.`);
            running = false;
            broadcast("run-state", { running: false });
            await pushSnapshot().catch(() => {});
            resolvePromise(code);
        };

        child.on("error", (err) => finish(-1, `Failed to start: ${err.message}`));
        child.on("close", (code) => finish(code ?? -1));
    });
}

async function startServer(instanceId) {
    const clients = new Set();

    const server = createServer(async (req, res) => {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");

        if (url.pathname === "/events") {
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            });
            res.write(": connected\n\n");
            clients.add(res);
            // Reflect an in-flight run to a canvas that opened mid-run.
            if (running) res.write('event: run-state\ndata: {"running":true}\n\n');
            req.on("close", () => clients.delete(res));
            return;
        }

        if (url.pathname === "/api/snapshot") {
            try {
                const snapshot = await readSnapshot(REPO_ROOT);
                res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify(snapshot));
            } catch (err) {
                res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ error: String(err?.message ?? err) }));
            }
            return;
        }

        if (url.pathname === "/api/run" && req.method === "POST") {
            if (running) {
                res.writeHead(409, { "Content-Type": "application/json; charset=utf-8" });
                res.end(JSON.stringify({ started: false, reason: "A run is already in progress." }));
                return;
            }
            res.writeHead(202, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify({ started: true }));
            runTests();
            return;
        }

        if (url.pathname === "/") {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(renderHtml());
            return;
        }

        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
    });

    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/`, clients };
}

const canvas = createCanvas({
    id: "test-dashboard",
    displayName: "Test health",
    description:
        "Visual test dashboard for this repo: per-test results with failure stacks, coverage by file, and the last commit CI passed on.",
    actions: [
        {
            name: "refresh",
            description: "Re-read coverage and test result artifacts from disk and update the canvas.",
            handler: async () => {
                const snapshot = await pushSnapshot();
                return {
                    refreshedAt: snapshot.generatedAt,
                    freshness: snapshot.freshness.state,
                    vitest: snapshot.vitest.available ? snapshot.vitest.totals : null,
                    playwright: snapshot.playwright.available ? snapshot.playwright.totals : null,
                    coverage: snapshot.coverage.available ? snapshot.coverage.totals : null,
                };
            },
        },
        {
            name: "run_tests",
            description:
                "Run the unit/component suite with coverage (npm run test:coverage), streaming progress to the canvas, then refresh it.",
            handler: async () => {
                if (running) throw new CanvasError("run_in_progress", "A test run is already in progress.");
                const code = await runTests();
                const snapshot = await readSnapshot(REPO_ROOT);
                return {
                    exitCode: code,
                    passed: code === 0,
                    totals: snapshot.vitest.available ? snapshot.vitest.totals : null,
                    coverage: snapshot.coverage.available ? snapshot.coverage.totals : null,
                };
            },
        },
    ],
    open: async (ctx) => {
        let entry = servers.get(ctx.instanceId);
        if (!entry) {
            entry = await startServer(ctx.instanceId);
            servers.set(ctx.instanceId, entry);
        }
        return { title: "Test health", url: entry.url };
    },
    onClose: async (ctx) => {
        const entry = servers.get(ctx.instanceId);
        if (!entry) return;
        servers.delete(ctx.instanceId);
        for (const client of entry.clients) {
            try {
                client.end();
            } catch {
                /* already gone */
            }
        }
        await new Promise((r) => entry.server.close(() => r()));
    },
});

await joinSession({ canvases: [canvas] });
