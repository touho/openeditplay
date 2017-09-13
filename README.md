## License ##

I currently do not allow using or redistributing of this code publicly. Contact for more information.

You can run this software on your computer for your own testing purposes.
You can not host this software for any audience.


## Installation ##

#### Locally ####
1. install mysql
2. setup mysql credentials
```
CREATE DATABASE openeditplay CHARACTER SET utf8;
CREATE USER 'openeditplay'@'localhost' IDENTIFIED BY 'openeditplay';
GRANT ALL ON openeditplay.* TO 'openeditplay'@'localhost';
```
3. `npm install`
4. `node server`


#### Amazon ####
1. Start AWS EC2 instance wizard
2. Choose AMI: Select Ubuntu Server
3. Configure Instance: Click "Advanced Details" and copy /installation/amazon/amazonLaunchScript content to "User data" field.
4. Configure Security Group: Click "Add Rule" and "HTTP"
5. Start instance and enjoy Open Edit Play by using Public DNS address given by AWS.
