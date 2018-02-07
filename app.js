"use strict";

const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const handlebars = require("handlebars");
const jsrsasign = require("jsrsasign");
const uuid = require("uuid");
const fs = require("fs");
const Octokat = require("octokat");
const GoogleUrl = require("google-url");
const gUrl = new GoogleUrl();
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
service.use(bodyParser.json())
service.use(bodyParser.urlencoded({ extended: true }));

var octo = new Octokat({
	token: process.env.GH_TOKEN
});

var repo = octo.repos(process.env.GH_USERNAME, process.env.GH_REPO);

const templates = {
	config: handlebars.compile(fs.readFileSync("./config.plist", "utf-8"))
};

service.post("/wifishare/v1/sign", function(request, response) {
	response.setHeader("Content-Type", "application/json");
	
	function sign(value, options, callback) {
		options = options || {};
		
		let certs = [];
		[].concat(options.cert || []).concat(options.ca || []).map(ca => {
			ca = (ca || "").toString().trim().split("END CERTIFICATE-----");
			ca.pop();
			ca.forEach(ca => {
				ca += "END CERTIFICATE-----";
				certs.push(ca.trim());
			});
			return ca;
		});
		
		certs = certs.reverse();
		
		let der;
		let params = {
			content: {
				str: (value || "").toString("utf-8")
			},
			certs,
			signerInfos: [
				{
					hashAlg: options.hashAlg || "sha256",
					sAttr: options.signingTime ? {
						SigningTime: {}
					} : {},
					signerCert: certs[certs.length - 1],
					signerPrvKey: (options.key || "").toString(),
					sigAlg: options.sigAlg || "SHA256withRSA"
				}
			]
		};
		
		try {
			der = Buffer.from(jsrsasign.asn1.cms.CMSUtil.newSignedData(params).getContentInfoEncodedHex(), "hex");
		} catch(E) {
			return setImmediate(() => {
				callback(E);
			});
		}
		
		return setImmediate(() => {
			callback(null, der);
		});
	}
	
	function getPlusingHour() {
		if (request.body.time == 1) {
			return "hour"
		} else {
			return "hours"
		}
	}
	
	function getConfig(options, callback) {
		let data = {
			timeInHour: request.body.time,
			plusingHour: getPlusingHour(),
			timeInSeconds: request.body.time * 3600,
			passkey: request.body.passkey,
			uuid1: uuid.v4(),
			uuid2: uuid.v4(),
			ssid: request.body.ssid,
			uuid3: uuid.v4(),
			uuid4: uuid.v4()
		};
		
		if (callback) {
			callback(null, templates.config(data));
			return;
		}
		
		return templates.config(data);
	}
	
	function getSignedConfig(options, callback) {
		options = options || {};
		
		let plistFile;
		
		try {
			plistFile = getConfig(options);
		} catch(E) {
			return callback(E);
		}
		
		return sign(plistFile, options.keys, callback);
	}
	
	var options = {
		keys: {
			key: fs.readFileSync("./key.pem"),
			cert: fs.readFileSync("./cert.pem"),
			ca: [
				fs.readFileSync("./c1.pem"),
				fs.readFileSync("./c2.pem"),
				fs.readFileSync("./c3.pem"),
				fs.readFileSync("./c4.pem")
			]
		}
	};
	
	getSignedConfig(options, function(error, data) {
		const uuidConst = uuid.v4();
		var config = {
			message: "Config Added!",
			content: data
		};
		repo.contents("cluster1/sector1/" + uuidConst + ".mobileconfig").add(config);
		const fileUrl = "https://raw.githubusercontent.com/" + request.body.GH_USERNAME + "/" + request.body.GH_REPO + "/master/cluster1/sector1/" + uuidConst + ".mobileconfig";
		gUrl.shorten(fileUrl, function(error, shortUrl) {
			response.send(JSON.stringify({
				url: shortUrl
			}));
		});
	});
});

var acme_response = process.env.ACME_RESPONSE;

service.get("/.well-known/acme-challenge/:id", function(request, response) {
	response.send(acme_response);
});

service.listen(service.get("port"), function() {
	console.log("Running Server!")
});