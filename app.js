"use strict";

const express = require("express");
const cookieParser = require("cookie-parser");
const ua = require("ua-parser");
const handlebars = require("handlebars");
const jsrsasign = require("jsrsasign");
const uuid = require("uuid");
const fs = require("fs");
const https = require("https");
const helmet = require("helmet");
const service = express();

service.set("port", (process.env.PORT || 8080));
service.use(function(request, response, callback) {
	var data = "";
	request.setEncoding("utf-8");
	request.on("data", function(chunk) {
		data += chunk;
	});
	request.on("end", function() {
		request.rawBody = data;
		callback();
	});
});
service.use(cookieParser("wifiXshareXapi024520162XYZ"));
service.use(helmet());

const options = {
	cert: fs.readFileSync("cert.pem"),
	key: fs.readFileSync("key.pem")
};

var acme_response = process.env.ACME_RESPONSE;

service.get("/.well-known/acme-challenge/:id", function(request, response) {
	response.send(acme_response);
});

service.listen(service.get("port"));
https.createServer(options, service).listen("8443");
