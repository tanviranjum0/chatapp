const redisClient = require("../redis");
module.exports.limiter =
  (secondsLimit, limitAmmount) => async (req, res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    const [response] = await redisClient
      .multi()
      .incr(ip)
      .expire(ip, secondsLimit)
      .exec();
    // console.log(response[1]);
    if (response[1] > limitAmmount) {
      res.json({ loggedIn: false, status: "Slow Down Try again in a minute" });
    } else next();
  };
