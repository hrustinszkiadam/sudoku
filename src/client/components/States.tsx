import type { ReactNode } from "react";

type Mood = "question" | "lost" | "error" | "failed" | "locked" | "loading";

const CENTER: Partial<Record<Mood, { cls: string; mark: string }>> = {
	question: { cls: "bg-brand text-on-brand", mark: "?" },
	error: { cls: "bg-danger-soft text-danger ring-2 ring-danger", mark: "!" },
	failed: { cls: "bg-danger-soft text-danger ring-2 ring-danger", mark: "×" },
};

/** Nine tiles from the board, the odd one out telling the story. */
export function TileArt({ mood }: { mood: Mood }) {
	return (
		<div aria-hidden className="grid grid-cols-3 gap-2">
			{Array.from({ length: 9 }, (_, i) => {
				const center = i === 4 ? CENTER[mood] : undefined;
				let cls = "bg-surface shadow-card";
				if (center) cls = center.cls;
				else if (mood === "lost" && (i === 1 || i === 8))
					cls = "bg-transparent ring-2 ring-line";
				else if (mood === "locked") cls = "bg-sunken";
				else if (mood === "loading") cls = "tile-wave bg-surface shadow-card";
				return (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: fixed positions
						key={i}
						style={
							mood === "loading"
								? { animationDelay: `${((i % 3) + Math.floor(i / 3)) * 120}ms` }
								: undefined
						}
						className={`flex size-8 items-center justify-center rounded-sm text-sm font-extrabold ${cls}`}
					>
						{center?.mark ??
							(mood === "locked" ? (
								<span className="size-1 rounded-full bg-ink-3" />
							) : null)}
					</span>
				);
			})}
		</div>
	);
}

/** Full-page state: art, what happened, and one way forward. */
export function StatePanel({
	mood,
	title,
	children,
	actions,
}: {
	mood: Mood;
	title: string;
	children?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<main className="mx-auto flex min-h-[60dvh] max-w-sm flex-col items-center justify-center gap-5 px-4 py-12 text-center">
			<TileArt mood={mood} />
			<h1 className="font-display text-[28px] leading-tight font-extrabold tracking-[-0.02em] text-balance">
				{title}
			</h1>
			{children && <p className="-mt-2 text-ink-2 text-pretty">{children}</p>}
			{actions && (
				<div className="flex flex-col items-center gap-3">{actions}</div>
			)}
		</main>
	);
}

export function Loading() {
	return (
		<main className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 px-4">
			<TileArt mood="loading" />
			<p role="status" className="font-display text-[28px] font-extrabold">
				Loading…
			</p>
		</main>
	);
}
