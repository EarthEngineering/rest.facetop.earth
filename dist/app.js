"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
// Middleware
var route_ratelimit_1 = require("./middleware/route-ratelimit");
var path = require("path");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var helmet = require("helmet");
var debug = require("debug")("rest-cloud:server");
var http = require("http");
var cors = require("cors");
var AuthMW = require("./middleware/auth");
// v1
var indexV1 = require("./routes/v1/index");
require("dotenv").config();
var app = express();
app.locals.env = process.env;
app.use(helmet());
app.use(cors());
app.enable("trust proxy");
// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");
app.use("/public", express.static(__dirname + "/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
var v1prefix = "v1";
// Instantiate the authorization middleware, used to implement pro-tier rate limiting.
var auth = new AuthMW();
app.use("/" + v1prefix + "/", auth.mw());
// Rate limit on all v1 routes
app.use("/" + v1prefix + "/", route_ratelimit_1.routeRateLimit);
app.use("/", indexV1);
// app.use(`/${v1prefix}/` + `health-check`, healthCheckV1)
// app.use(`/${v1prefix}/` + `mask`, maskV1)
// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = {
        message: "Not Found",
        status: 404
    };
    next(err);
});
// error handler
app.use(function (err, req, res, next) {
    var status = err.status || 500;
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    // render the error page
    res.status(status);
    res.json({
        status: status,
        message: err.message
    });
});
/**
 * Get port from environment and store in Express.
 */
var port = normalizePort(process.env.PORT || "3000");
app.set("port", port);
console.log("rest.facetop.earth started on port " + port);
/**
 * Create HTTP server.
 */
var server = http.createServer(app);
/**
 * Listen on provided port, on all network interfaces.
 */
server.listen(port);
server.on("error", onError);
server.on("listening", onListening);
// Set the time before a timeout error is generated. This impacts testing and
// the handling of timeout errors. Is 10 seconds too agressive?
server.setTimeout(30 * 1000);
/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
    var port = parseInt(val, 10);
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    if (port >= 0) {
        // port number
        return port;
    }
    return false;
}
/**
 * Event listener for HTTP server "error" event.
 */
function onError(error) {
    if (error.syscall !== "listen")
        throw error;
    var bind = typeof port === "string" ? "Pipe " + port : "Port " + port;
    // handle specific listen errors with friendly messages
    switch (error.code) {
        case "EACCES":
            console.error(bind + " requires elevated privileges");
            process.exit(1);
            break;
        case "EADDRINUSE":
            console.error(bind + " is already in use");
            process.exit(1);
            break;
        default:
            throw error;
    }
}
/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
    var addr = server.address();
    var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr.port;
    debug("Listening on " + bind);
}
//
// module.exports = app;
