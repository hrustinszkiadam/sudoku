CREATE TABLE `daily_puzzles` (
	`date` text PRIMARY KEY NOT NULL,
	`puzzle_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_players` (
	`game_id` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`placements` integer NOT NULL,
	`mistakes` integer NOT NULL,
	`finish_ms` integer,
	`score_ms` integer,
	`rank` integer,
	PRIMARY KEY(`game_id`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `game_players_user_idx` ON `game_players` (`user_id`);--> statement-breakpoint
CREATE TABLE `games` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`puzzle_id` text NOT NULL,
	`mode` text NOT NULL,
	`difficulty` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`status` text NOT NULL,
	`mistakes` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `games_mode_difficulty_idx` ON `games` (`mode`,`difficulty`);--> statement-breakpoint
CREATE TABLE `puzzles` (
	`id` text PRIMARY KEY NOT NULL,
	`givens` text NOT NULL,
	`solution` text NOT NULL,
	`difficulty` text NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `puzzles_difficulty_idx` ON `puzzles` (`difficulty`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'guest' NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
