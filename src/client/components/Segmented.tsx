/** Segmented control: the selected segment is a raised surface, never just colour. */
const track = "grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-sunken p-1";
const segment =
	"flex h-11 items-center justify-center rounded-md px-2 text-[15px] font-bold text-ink-2 transition-colors duration-(--duration-fast) hover:text-ink";
const selected = "bg-surface text-ink shadow-card dark:bg-raised";

/** Radio-group flavour, for forms. */
export function SegmentedRadio<T extends string>({
	name,
	options,
	value,
	onChange,
	label,
	render = (v) => v,
}: {
	name: string;
	options: readonly T[];
	value: T;
	onChange: (v: T) => void;
	label: string;
	render?: (v: T) => string;
}) {
	return (
		<fieldset className="flex flex-col gap-2">
			<legend className="mb-2 text-xs font-extrabold tracking-[0.08em] text-ink-3 uppercase">
				{label}
			</legend>
			<div className={track}>
				{options.map((o) => (
					<label
						key={o}
						className={`${segment} cursor-pointer capitalize has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus ${value === o ? selected : ""}`}
					>
						<input
							type="radio"
							name={name}
							value={o}
							className="sr-only"
							checked={value === o}
							onChange={() => onChange(o)}
						/>
						{render(o)}
					</label>
				))}
			</div>
		</fieldset>
	);
}

/** Toggle-button flavour, for filters that apply immediately. */
export function SegmentedButtons<T extends string>({
	options,
	value,
	onChange,
	label,
	render = (v) => v,
}: {
	options: readonly T[];
	value: T;
	onChange: (v: T) => void;
	label: string;
	render?: (v: T) => string;
}) {
	return (
		<fieldset className="flex min-w-0 flex-col">
			<legend className="mb-2 text-xs font-extrabold tracking-[0.08em] text-ink-3 uppercase">
				{label}
			</legend>
			<div className={track}>
				{options.map((o) => (
					<button
						key={o}
						type="button"
						aria-pressed={value === o}
						onClick={() => onChange(o)}
						className={`${segment} px-4 ${value === o ? selected : ""}`}
					>
						{render(o)}
					</button>
				))}
			</div>
		</fieldset>
	);
}
