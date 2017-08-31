# ************************************************************
# Sequel Pro SQL dump
# Version 4541
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 5.7.17)
# Database: openeditplay
# Generation Time: 2017-08-30 05:32:29 +0000
# ************************************************************


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table game
# ------------------------------------------------------------

DROP TABLE IF EXISTS `game`;

CREATE TABLE `game` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `creatorIP` varchar(15) NOT NULL DEFAULT '' COMMENT 'IP where the game is created',
  `creatorUserId` varchar(30) NOT NULL DEFAULT '',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table serializable
# ------------------------------------------------------------

DROP TABLE IF EXISTS `serializable`;

CREATE TABLE `serializable` (
  `gameId` varchar(30) NOT NULL,
  `id` varchar(30) NOT NULL DEFAULT '',
  `type` char(3) NOT NULL DEFAULT '',
  `parentId` varchar(30) NOT NULL DEFAULT '',
  `value` varchar(50) DEFAULT NULL COMMENT 'NULL if type != prp',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`gameId`,`id`),
  KEY `type` (`type`),
  KEY `parentId` (`parentId`),
  KEY `gameId` (`gameId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `id` varchar(30) NOT NULL DEFAULT '',
  `firstIP` varchar(50) NOT NULL DEFAULT '',
  `lastIP` varchar(50) NOT NULL DEFAULT '',
  `blockedAt` datetime DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table userActivity
# ------------------------------------------------------------

DROP TABLE IF EXISTS `userActivity`;

CREATE TABLE `userActivity` (
  `id` bigint(11) unsigned NOT NULL AUTO_INCREMENT,
  `userId` varchar(30) NOT NULL DEFAULT '',
  `ip` varchar(15) NOT NULL DEFAULT '',
  `type` enum('PLAY','EDIT','EDITACCESS') NOT NULL DEFAULT 'PLAY',
  `gameId` varchar(30) NOT NULL DEFAULT '',
  `data` varchar(200) DEFAULT NULL,
  `count` int(11) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user-type-game` (`userId`,`type`,`data`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;