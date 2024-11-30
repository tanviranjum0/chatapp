CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(28) NOT NULL UNIQUE,
        passHash VARCHAR NOT NULL,
        userid VARCHAR NOT NULL UNIQUE
);

insert into users (username,passhash) values ($1,$2);