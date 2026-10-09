const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
	success: boolean;
	"error-codes"?: string[];
}

/** Server-side Turnstile verification. Never trust the widget alone. */
export async function verifyTurnstile(
	token: string,
	secret: string,
	remoteIp?: string,
): Promise<boolean> {
	if (!token || token.length > 2048) return false;
	try {
		const res = await fetch(SITEVERIFY, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
		});
		if (!res.ok) return false;
		const data = (await res.json()) as SiteverifyResponse;
		if (!data.success) {
			console.log({ event: "turnstile_failed", errors: data["error-codes"] });
		}
		return data.success === true;
	} catch {
		return false;
	}
}
