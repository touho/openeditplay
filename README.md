# License #

I currently do not allow using or redistributing of this code publicly. Contact for more information.

You can run this software on your computer for your own testing purposes.
You can not host this software for any audience.


# Installation #

### Locally ###
1. install mysql
2. setup mysql credentials
```
CREATE DATABASE openeditplay CHARACTER SET utf8;
CREATE USER 'openeditplay'@'localhost' IDENTIFIED WITH mysql_native_password BY 'openeditplay';
GRANT ALL ON openeditplay.* TO 'openeditplay'@'localhost';
```
3. Navigate to project directory and type:
```
mysql -u openeditplay --password="openeditplay" --database=openeditplay < installation/resetDatabase.sql
```
4. `npm install`
5. `node server`


### Amazon ###
1. Start AWS EC2 instance launching wizard
2. Choose AMI: Select Ubuntu Server
3. Configure Instance: Click "Advanced Details" and copy /installation/amazon/amazonLaunchScript content to "User data" field.
4. Configure Security Group: Click "Add Rule" and "HTTP"
5. Start instance and enjoy Open Edit Play by using Public DNS address given by AWS.


### TODO ###
- Animation:
    - Animation speed: fps
    - Insert frame 1 keyframe if missing
    - Move keyframe
    - Track interpolation method discreet/linear/cubic
    - Animation loop mode: no loop/loop/back and forth
    - Animation module playing
- Game / Level settings
    - Camera viewport
- Multiedit of objects
- Object instance value/component saving
- When detaching from prototype, don't include every single property etc. Save space.
- When changing selection, don't animate property editor packed statuses. Slows down too much.
- Proper sprite support
