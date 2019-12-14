
create table Person (
   id int auto_increment primary key,
   firstName varchar(30),
   lastName varchar(30) not null,
   email varchar(30) not null,
   password varchar(50),
   termsAccepted datetime,
   role int unsigned, # 0 normal, 1 admin
   unique key(email)
);

create table Playlist (
   id int auto_increment PRIMARY KEY,
   ownerId int,
   title VARCHAR(80) not null,
   whenMade datetime not null,
   numLikes int DEFAULT 0,
   CONSTRAINT playlist_ownerId FOREIGN KEY (ownerId) REFERENCES Person(id) on DELETE CASCADE,
   unique key UK_name(title)
);

create table Song (
   id int auto_increment primary key,
   title VARCHAR(80) not null,
   link VARCHAR(500) not null,
   artist VARCHAR(80) not null,
   genre VARCHAR(80) not null
);

create table Playlist_Song (
   id int auto_increment PRIMARY KEY,
   pId int not null,
   sId int not null,
   CONSTRAINT p_s_pId FOREIGN KEY (pId) REFERENCES Playlist(id) on DELETE CASCADE,
   CONSTRAINT p_s_sId FOREIGN key (sId) REFERENCES Song(id) on delete CASCADE
);

create table Likes (
   id int auto_increment primary key,
   pId int not null,
   prsId int not null,
   lastName varchar(100) not null,
   firstName varchar(100),
   email VARCHAR(100),
   constraint Likes_pId foreign key (pId) references Playlist(id)
    on delete cascade,
   constraint Likes_prsId foreign key (prsId) references Person(id)
    on delete cascade
);

insert into Person (firstName, lastName, email, password, termsAccepted, role)
  VALUES ("Joe",     "Admin", "adm@11.com", "password", NOW(), 1);
 
insert into Song (title, link, artist, genre)
  Values ("infinite peace", "https://drive.google.com/open?id=1jY3dd9TnEZkFSA6qiR4Ucb1qA4d1DyVl", "kevin macleod", "chill");
 
insert into Song (title, link, artist, genre)
  Values ("concerto iii allegro i", "https://drive.google.com/open?id=1olVPcUkrpwby_g4w1oNewWFXft3JNbqa", "dogsounds", "classical");
 
insert into Song (title, link, artist, genre)
  Values ("funkeriffic", "https://drive.google.com/open?id=1o72Z3OPYJGKNFQM6tvh-PDsqEv5tQh7W", "kevin macleod", "jazz");
 
insert into Song (title, link, artist, genre)
  Values ("martini sunset", "https://drive.google.com/open?id=1tqiPW6idif-OSUNiHeKUoF74hZpGgI_D", "anonymous", "jazz");