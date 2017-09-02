# License

I currently do not allow using or redistributing of this code publicly. Contact for more information.

You can run this software on your computer for your own testing purposes.
You can not host this software for any audience.





Installation:

Amazon:
- Create EC2 instance with Ubuntu.
- Connect with SSH.
- Clone github repo: git clone https://github.com/touho/openeditplay.git
- ./openeditplay/installation/installAmazonEC2Ubuntu
- You are ready use Open Edit Play via Public DNS link 




MySQL (not yet in use):
    CREATE DATABASE openeditplay CHARACTER SET utf8;
    CREATE USER 'openeditplay'@'localhost' IDENTIFIED BY 'openeditplay';
    GRANT ALL ON openeditplay.* TO 'openeditplay'@'localhost';
