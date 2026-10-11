import { IconX } from "@tabler/icons-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { I } from "./ui";

/**
 * Modal built on <dialog>: a bottom sheet on phones, a centred card from `sm`.
 * Esc, the close button and a backdrop click all close it.
 */
export function Sheet({
	open,
	onClose,
	title,
	children,
	aside,
	className = "",
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	/** Shown in the title row instead of the close button (e.g. an Esc hint). */
	aside?: ReactNode;
	className?: string;
}) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useId();

	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		if (open && !d.open) d.showModal();
		if (!open && d.open) d.close();
	}, [open]);

	return (
		<dialog
			ref={ref}
			aria-labelledby={titleId}
			onClose={onClose}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			onKeyDown={() => {}}
			className={`sheet m-0 mt-auto w-full max-w-none overflow-visible bg-transparent p-0 text-ink backdrop:bg-[rgb(21_29_51/0.4)] sm:m-auto sm:w-[min(440px,calc(100vw-32px))] dark:backdrop:bg-black/60 ${className}`}
		>
			<div className="flex max-h-[85dvh] flex-col gap-3.5 overflow-y-auto rounded-t-xl bg-surface px-5 pt-2.5 pb-7 shadow-sheet sm:rounded-xl sm:px-7 sm:pt-6">
				<span
					aria-hidden
					className="h-[5px] w-10 shrink-0 self-center rounded-full bg-line sm:hidden"
				/>
				<div className="flex items-start justify-between gap-3 pt-1">
					<h2
						id={titleId}
						className="font-display text-[28px] leading-[1.05] font-extrabold tracking-[-0.02em]"
					>
						{title}
					</h2>
					{aside ?? (
						<button
							type="button"
							aria-label="Close"
							onClick={onClose}
							className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sunken text-ink-2 hover:text-ink"
						>
							<I icon={IconX} />
						</button>
					)}
				</div>
				{children}
			</div>
		</dialog>
	);
}
