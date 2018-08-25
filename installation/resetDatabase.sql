# ************************************************************
# Sequel Pro SQL dump
# Version 4541
#
# http://www.sequelpro.com/
# https://github.com/sequelpro/sequelpro
#
# Host: 127.0.0.1 (MySQL 5.7.17)
# Database: openeditplay
# Generation Time: 2017-10-22 06:15:31 +0000
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
  `id` varchar(30) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '',
  `name` varchar(50) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT '' COMMENT 'metadata',
  `creatorIP` varchar(40) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '' COMMENT 'IP where the game is created',
  `creatorUserId` varchar(30) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '',
  `isDirty` tinyint(4) NOT NULL DEFAULT '1' COMMENT '1 if meta data in this table needs recalculating',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `serializableCount` int(11) NOT NULL DEFAULT '0' COMMENT 'metadata',
  `levelCount` int(11) NOT NULL DEFAULT '0' COMMENT 'metadata',
  `prototypeCount` int(11) NOT NULL DEFAULT '0' COMMENT 'metadata',
  `entityPrototypeCount` int(11) NOT NULL DEFAULT '0' COMMENT 'metadata',
  `componentDataCount` int(11) NOT NULL DEFAULT '0' COMMENT 'metadata',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table serializable
# ------------------------------------------------------------

DROP TABLE IF EXISTS `serializable`;

CREATE TABLE `serializable` (
  `gameId` varchar(30) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '',
  `id` varchar(30) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '',
  `type` char(3) NOT NULL DEFAULT '',
  `parentId` varchar(30) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT '',
  `value` TEXT DEFAULT NULL COMMENT 'if type=prp then value contains json presentation of the property value. else value contains json presentation of additional values like prototypeId ''p''',
  `name` varchar(30) CHARACTER SET utf8 COLLATE utf8_bin DEFAULT NULL COMMENT 'If serializable has generated name, it is stored here',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`gameId`,`id`),
  KEY `type` (`type`),
  KEY `parentId` (`parentId`),
  KEY `gameId` (`gameId`),
  KEY `updatedAt` (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;



# Dump of table user
# ------------------------------------------------------------

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
  `id` varchar(30) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '',
  `userToken` varchar(80) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '',
  `nickname` varchar(30) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `firstIP` varchar(15) NOT NULL DEFAULT '',
  `lastIP` varchar(15) NOT NULL DEFAULT '',
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
  `userId` varchar(30) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '',
  `firstIP` varchar(40) NOT NULL DEFAULT '',
  `lastIP` varchar(40) NOT NULL DEFAULT '',
  `type` enum('play','edit','editaccess') NOT NULL DEFAULT 'play',
  `gameId` varchar(30) CHARACTER SET utf8 COLLATE utf8_bin NOT NULL DEFAULT '',
  `data` varchar(200) DEFAULT NULL,
  `count` int(11) NOT NULL DEFAULT '1',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user-game-type` (`userId`,`gameId`,`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
