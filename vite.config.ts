import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

/** Cloudflare Web Analytics beacon (cookieless), in production builds only. */
const webAnalytics: Plugin = {
	name: "cf-web-analytics",
	apply: "build",
	transformIndexHtml: () => [
		{
			tag: "script",
			attrs: {
				type: "module",
				src: "https://static.cloudflareinsights.com/beacon.min.js",
				"data-cf-beacon": '{"token": "dff99312ae1b417f8a7e7541cba54eb4"}',
			},
			injectTo: "body",
		},
	],
};

export default defineConfig({
	plugins: [react(), tailwindcss(), cloudflare(), webAnalytics],
});
