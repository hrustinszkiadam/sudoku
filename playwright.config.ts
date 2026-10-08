import { defineConfig, devices } from "@playwright/test";

const PORT = 5199;

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? "github" : "list",
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: "retain-on-failure",
	},
	projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
	webServer: {
		command: `pnpm vite dev --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}/api/health`,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
	},
});
