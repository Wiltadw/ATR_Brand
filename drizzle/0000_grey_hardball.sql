CREATE TABLE `admin_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`session_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_users_username_unique` ON `admin_users` (`username`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE TABLE `currency_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`auto_update_enabled` integer DEFAULT false NOT NULL,
	`manual_override_enabled` integer DEFAULT false NOT NULL,
	`manual_rate` integer,
	`auto_rate` integer,
	`auto_rate_source` text,
	`effective_rate` integer,
	`effective_source` text,
	`last_success_at` integer,
	`last_attempt_at` integer,
	`last_status` text,
	`last_error` text
);
--> statement-breakpoint
CREATE TABLE `exchange_rate_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rate` integer,
	`source` text NOT NULL,
	`kind` text NOT NULL,
	`success` integer NOT NULL,
	`message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`product_id` integer,
	`product_name` text NOT NULL,
	`brand` text NOT NULL,
	`unit_price_aed_minor` integer NOT NULL,
	`unit_price_toman` integer NOT NULL,
	`quantity` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `order_items_order_idx` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_number` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`address` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'NEW' NOT NULL,
	`payment_status` text DEFAULT 'UNPAID' NOT NULL,
	`subtotal_toman` integer NOT NULL,
	`shipping_toman` integer DEFAULT 0 NOT NULL,
	`total_toman` integer NOT NULL,
	`rate_used` integer NOT NULL,
	`admin_note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `orders_created_idx` ON `orders` (`created_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`provider` text NOT NULL,
	`reference` text,
	`amount_toman` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`price_aed_minor` integer NOT NULL,
	`discount_percent` integer,
	`rate` integer NOT NULL,
	`price_toman` integer NOT NULL,
	`reason` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `price_history_product_idx` ON `price_history` (`product_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `product_images` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`filename` text NOT NULL,
	`alt` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_images_product_idx` ON `product_images` (`product_id`);--> statement-breakpoint
CREATE TABLE `product_tags` (
	`product_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`product_id`, `tag_id`),
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_tags_tag_idx` ON `product_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`name_en` text,
	`brand` text NOT NULL,
	`category_id` integer,
	`price_aed_minor` integer NOT NULL,
	`discount_percent` integer,
	`discount_ends_at` integer,
	`short_description` text,
	`description` text,
	`gender` text DEFAULT 'UNISEX' NOT NULL,
	`fragrance_family` text,
	`top_notes` text,
	`middle_notes` text,
	`base_notes` text,
	`longevity` text,
	`projection` text,
	`availability` text DEFAULT 'AVAILABLE' NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`best_seller` integer DEFAULT false NOT NULL,
	`is_sample` integer DEFAULT false NOT NULL,
	`search_text` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_unique` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_availability_idx` ON `products` (`availability`);--> statement-breakpoint
CREATE INDEX `products_featured_idx` ON `products` (`featured`);--> statement-breakpoint
CREATE INDEX `products_created_idx` ON `products` (`created_at`);--> statement-breakpoint
CREATE TABLE `store_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`store_name` text DEFAULT 'ATR Brand' NOT NULL,
	`phone` text,
	`instagram` text,
	`telegram` text,
	`whatsapp` text,
	`email` text,
	`address` text,
	`shipping_fee_toman` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`group` text DEFAULT 'OTHER' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `tags_slug_unique` ON `tags` (`slug`);