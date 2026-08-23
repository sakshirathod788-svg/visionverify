ALTER TABLE `analyses` MODIFY COLUMN `prediction` enum('likely_authentic','suspicious','likely_manipulated','unable_to_analyze') DEFAULT NULL;
