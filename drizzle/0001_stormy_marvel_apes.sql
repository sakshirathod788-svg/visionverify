CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`imageUrl` varchar(700) NOT NULL,
	`filename` varchar(255) NOT NULL,
	`mimeType` varchar(32) NOT NULL,
	`byteSize` int NOT NULL,
	`imageWidth` int,
	`imageHeight` int,
	`status` enum('completed','unavailable','failed') NOT NULL DEFAULT 'unavailable',
	`prediction` enum('likely_authentic','suspicious','likely_manipulated','unable_to_analyze') NOT NULL DEFAULT 'unable_to_analyze',
	`confidencePercent` int,
	`manipulationProbabilityPercent` int,
	`modelMode` enum('live','demo','offline') NOT NULL DEFAULT 'offline',
	`modelName` varchar(255),
	`modelVersion` varchar(128),
	`analysisData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `analyses` ADD CONSTRAINT `analyses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;