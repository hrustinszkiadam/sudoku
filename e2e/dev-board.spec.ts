import { expect, type Page, test } from "@playwright/test";

const GIVENS =
	"530070000600195000098000060800060003400803001700020006060000280000419005000080079";
const SOLUTION =
	"534678912672195348198342567859761423426853791713924856961537284287419635345286179";

const cell = (page: Page, i: number) => page.locator(`[data-cell="${i}"]`);

test("is fully playable with the keyboard", async ({ page }) => {
	await page.goto("/dev/board");
	await expect(cell(page, 0)).toHaveAttribute(
		"aria-label",
		/Row 1, column 1, 5, given/,
	);

	// First arrow press selects the centre cell.
	await page.keyboard.press("ArrowRight");
	await expect(cell(page, 40)).toHaveAttribute("aria-pressed", "true");
	await expect(cell(page, 40)).toBeFocused();

	// WASD moves too; walk to cell 2 (row 1, col 3): from 40 up 4, left 2.
	for (const key of ["w", "w", "w", "w", "a", "a"])
		await page.keyboard.press(key);
	await expect(cell(page, 2)).toHaveAttribute("aria-pressed", "true");

	// Shift+digit toggles single notes; Backspace clears them.
	await page.keyboard.press("Shift+Digit1");
	await page.keyboard.press("Shift+Digit2");
	await expect(cell(page, 2)).toHaveAttribute("aria-label", /empty, notes 1 2/);
	await page.keyboard.press("Backspace");
	await expect(cell(page, 2)).toHaveAttribute("aria-label", /column 3, empty$/);

	// N toggles notes mode, where plain digits write notes.
	await page.keyboard.press("n");
	await page.keyboard.press("4");
	await expect(cell(page, 2)).toHaveAttribute("aria-label", /notes 4/);
	await page.keyboard.press("n");

	// A wrong digit is highlighted as a conflict (5 already in row 1).
	await page.keyboard.press("5");
	await expect(cell(page, 2)).toHaveAttribute("aria-label", /conflict/);
	await page.keyboard.press("5"); // same digit again erases it

	// Solve the rest by walking every cell with the arrow keys.
	let at = 2;
	for (let i = 0; i < 81; i++) {
		if (GIVENS[i] !== "0") continue;
		const [dr, dc] = [
			Math.floor(i / 9) - Math.floor(at / 9),
			(i % 9) - (at % 9),
		];
		for (let k = 0; k < Math.abs(dr); k++)
			await page.keyboard.press(dr > 0 ? "ArrowDown" : "ArrowUp");
		for (let k = 0; k < Math.abs(dc); k++)
			await page.keyboard.press(dc > 0 ? "ArrowRight" : "ArrowLeft");
		at = i;
		await page.keyboard.press(SOLUTION[i]);
	}
	await expect(page.getByText("Solved!")).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(page.locator('[aria-pressed="true"][data-cell]')).toHaveCount(0);
});

test.describe("touch", () => {
	test.use({
		viewport: { width: 360, height: 740 },
		hasTouch: true,
		isMobile: true,
	});

	test("plays with taps and fits 360px without horizontal scroll", async ({
		page,
	}) => {
		await page.goto("/dev/board");
		const width = await page.evaluate(
			() => document.documentElement.scrollWidth,
		);
		expect(width).toBeLessThanOrEqual(360);

		await cell(page, 2).tap();
		await page.getByRole("button", { name: "Place 4" }).tap();
		await expect(cell(page, 2)).toHaveAttribute("aria-label", /column 3, 4/);

		await cell(page, 3).tap();
		await page.getByRole("button", { name: /Notes off/i }).tap();
		await page.getByRole("button", { name: "Toggle note 6" }).tap();
		await expect(cell(page, 3)).toHaveAttribute("aria-label", /notes 6/);
		await page.getByRole("button", { name: /Clear notes/ }).tap();
		await expect(cell(page, 3)).toHaveAttribute("aria-label", /empty$/);
	});
});
