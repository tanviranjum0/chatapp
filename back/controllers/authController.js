const bcrypt = require("bcrypt");
const pool = require("../db");
const { v4: uuid } = require("uuid");
module.exports.handlelogin = (req, res) => {
  if (req.session.user && req.session.user.username) {
    res.json({ loggedIn: true, username: req.session.username });
  } else {
    res.json({ loggedIn: false });
  }
};

module.exports.handlepost = async (req, res) => {
  const potentialLogin = await pool.query(
    "select id, username, passhash, userid from users u where u.username=$1",
    [req.body.username]
  );

  if (potentialLogin.rowCount > 0) {
    const isSamePass = await bcrypt.compare(
      req.body.password,
      potentialLogin.rows[0].passhash
    );
    if (isSamePass) {
      req.session.user = {
        username: req.body.username,
        id: potentialLogin.rows[0].id,
        userid: potentialLogin.rows[0].userid,
      };
      res.status(200).json({
        loggedIn: true,
        username: potentialLogin.rows[0].username,
      });
    } else {
      console.log("not good");
      res.json({
        loggedIn: false,
        status: "Wrong Username or password",
      });
    }
  } else {
    console.log("not good2");
    res.json({
      loggedIn: false,
      status: "Wrong Username or password",
    });
  }
};

module.exports.registrationAttempt = async (req, res) => {
  const existUser = await pool.query(
    "select username from users where username=$1",
    [req.body.username]
  );

  if (existUser.rowCount == 0) {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const newUserQuery = await pool.query(
      "insert into users (username, passhash,userid) values ($1, $2, $3) returning id,username,userid",
      [req.body.username, hashedPassword, uuid()]
    );
    req.session.user = {
      username: req.body.username,
      id: newUserQuery.rows[0].id,
      userid: newUserQuery.rows[0].userid,
    };
    res
      .status(200)
      .json({ loggedIn: true, username: newUserQuery.rows[0].username });
  } else {
    res
      .status(400)
      .json({ loggedIn: false, status: "Username already exists" });
    return;
  }
};
