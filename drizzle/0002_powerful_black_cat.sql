CREATE TABLE `enum_values` (
	`id` text PRIMARY KEY NOT NULL,
	`enum_id` text NOT NULL,
	`value` text NOT NULL,
	FOREIGN KEY (`enum_id`) REFERENCES `enums`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `enums` (
	`id` text PRIMARY KEY NOT NULL,
	`diagram_id` text NOT NULL,
	`name` text NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`color` text DEFAULT '#10b981' NOT NULL,
	FOREIGN KEY (`diagram_id`) REFERENCES `diagrams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `columns` ADD `enum_id` text REFERENCES enums(id);--> statement-breakpoint
ALTER TABLE `columns` ADD `default_value` text;