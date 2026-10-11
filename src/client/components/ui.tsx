import type { Icon, IconProps } from "@tabler/icons-react";
import type { CSSProperties, ReactNode } from "react";

/** Icons share one outline style: 24 px grid, 1.75 px strokes, decorative by default. */
export function I({
	icon: Glyph,
	size = 20,
	...rest
}: { icon: Icon } & Omit<IconProps, "ref">) {
	return <Glyph size={size} stroke={1.75} aria-hidden {...rest} />;
}

/** Brand mark: nine tiles on Ink Blue, a marigold centre and a friend's ring. */
export function Logo({ size = 30 }: { size?: number }) {
	const tiles: [number, number][] = [];
	for (const y of [5.5, 13, 20.5])
		for (const x of [5.5, 13, 20.5]) tiles.push([x, y]);
	return (
		<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
			<rect width="32" height="32" rx="7.5" fill="#3453D3" />
			{tiles.map(([x, y]) => (
				<rect
					key={`${x}-${y}`}
					x={x}
					y={y}
					width="6"
					height="6"
					rx="1.6"
					fill={x === 13 && y === 13 ? "#F7AD30" : "#FFFFFF"}
					stroke={size >= 24 && x === 20.5 && y === 5.5 ? "#FF8F4B" : undefined}
					strokeWidth={1.6}
				/>
			))}
		</svg>
	);
}

/** Inline style for a player's pencil (1-8): fill, text on it, and soft tint. */
export function pencilStyle(pencil: number): CSSProperties {
	return {
		"--pc": `var(--color-p${pencil})`,
		"--pc-on": `var(--color-p${pencil}-on)`,
		"--pc-soft": `var(--color-p${pencil}-soft)`,
	} as CSSProperties;
}

/** A stable pencil for places outside a room (the header avatar). */
export function pencilFor(id: string): number {
	let h = 0;
	for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return (h % 8) + 1;
}

/** First visible character of a name, upper-cased (emoji and CJK included). */
export function initialOf(name: string): string {
	const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
	const first = seg.segment(name.trim()).containing(0)?.segment ?? "?";
	return first.toLocaleUpperCase();
}

const TILE_SIZE = {
	xs: "size-[17px] rounded-xs text-[11px]",
	sm: "size-6 rounded-[6px] text-xs",
	md: "size-8 rounded-sm text-sm",
	lg: "size-13 rounded-md text-xl",
} as const;

/** A player's initial on their pencil colour. */
export function PencilTile({
	pencil,
	name,
	size = "md",
	round = false,
	className = "",
}: {
	pencil: number;
	name: string;
	size?: keyof typeof TILE_SIZE;
	round?: boolean;
	className?: string;
}) {
	return (
		<span
			aria-hidden
			style={pencilStyle(pencil)}
			className={`inline-flex shrink-0 items-center justify-center bg-(--pc) font-extrabold leading-none text-(--pc-on) ${TILE_SIZE[size]} ${round ? "rounded-full!" : ""} ${className}`}
		>
			{initialOf(name)}
		</span>
	);
}

export function Kbd({ children }: { children: ReactNode }) {
	return (
		<kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-hair bg-sunken px-1 font-mono text-[11px] font-bold text-ink-2">
			{children}
		</kbd>
	);
}

const base =
	"inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap transition-[background-color,box-shadow,translate,color] duration-(--duration-fast) ease-(--ease-standard) active:translate-y-px disabled:cursor-not-allowed disabled:active:translate-y-0";

/** Button looks. Heights: lg 56 (primary actions), md 48, sm 40. */
export const btn = {
	primary: `${base} bg-brand text-on-brand shadow-[0_8px_20px_-8px_var(--color-brand)] hover:bg-brand-strong active:shadow-none disabled:bg-brand/45 disabled:shadow-none`,
	secondary: `${base} border border-line bg-surface text-ink hover:bg-sunken disabled:text-ink-3`,
	ghost: `${base} text-ink-2 hover:bg-sunken hover:text-ink`,
	danger: `${base} border border-danger bg-surface text-danger hover:bg-danger-soft`,
	lg: "h-14 rounded-lg px-6 text-[17px]",
	md: "h-12 rounded-md px-5 text-base",
	sm: "h-10 rounded-md px-3.5 text-[15px]",
} as const;

/** Small all-caps label above a group of controls. */
export function Overline({
	children,
	as: Tag = "span",
	className = "",
}: {
	children: ReactNode;
	as?: "span" | "legend" | "h3";
	className?: string;
}) {
	return (
		<Tag
			className={`text-xs font-extrabold tracking-[0.08em] text-ink-3 uppercase ${className}`}
		>
			{children}
		</Tag>
	);
}

export const card = "rounded-lg bg-surface shadow-card";
