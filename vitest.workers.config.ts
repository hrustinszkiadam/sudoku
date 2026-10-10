import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest(async () => {
			const migrations = await readD1Migrations(
				path.join(import.meta.dirname, "migrations"),
			);
			return {
				wrangler: { configPath: "./wrangler.jsonc" },
				miniflare: {
					bindings: {
						TEST_MIGRATIONS: migrations,
						SESSION_SECRET: "test-session-secret",
						TURNSTILE_SECRET_KEY: "1x0000000000000000000000000000000AA",
						TURNSTILE_SITE_KEY: "1x00000000000000000000AA",
						BETTER_AUTH_SECRET: "test-better-auth-secret-0123456789abcdef",
						GITHUB_CLIENT_ID: "test-github-id",
						GITHUB_CLIENT_SECRET: "test-github-secret",
						GOOGLE_CLIENT_ID: "test-google-id",
						GOOGLE_CLIENT_SECRET: "test-google-secret",
					},
				},
			};
		}),
	],
	test: {
		name: "workers",
		include: ["test/**/*.test.ts"],
		setupFiles: ["./test/apply-migrations.ts"],
	},
});
