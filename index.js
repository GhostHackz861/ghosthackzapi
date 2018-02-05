'use strict';

const express = require("express");
const service = express();

service.set("port", (process.env.PORT || 3000));

var acme_response = process.env.ACME_RESPONSE;

service.get("/.well-known/acme-challenge/:id", function(request, response) {
	response.send(acme_response);
});

service.listen(service.get("port"), function() {
	console.log("Connected to the server!");
});