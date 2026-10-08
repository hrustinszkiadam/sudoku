import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "unit",
					environment: "node",
					include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
				},
			},
			"./vitest.workers.config.ts",
		],
		coverage: {
			provider: "v8",
			include: ["src/shared/**/*.ts"],
			exclude: ["src/**/*.test.ts"],
		},
	},
});
