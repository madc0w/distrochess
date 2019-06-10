FLAG_TIME_DAYS = 4;
MOVE_TIMEOUT = 4 * 60 * 1000;
INITIAL_RATING = 1200;
RATING_DELTA_FACTOR = 4;
const ELO_K = 30

const languages = {
	fr : "Français",
	en : "English",
	de : "Deutsch",
	es : "Español",
	ru : "русский"
};

import "moment/locale/fr";
import "moment/locale/de";
import "moment/locale/ru";
import "moment/locale/es";

moment = require("moment");

Games = new Mongo.Collection("games");
SystemData = new Mongo.Collection("systemData");
GameAssignments = new Mongo.Collection("gameAssignments");
SystemLog = new Mongo.Collection("systemLog");

utils = {
	getLanguages : function() {
		return languages;
	},

	isWhiteToMove : function(game) {
		return game.moves.length % 2 == 0;
	},

	getUsername : function(user) {
		user = user || Meteor.user();
		if (user) {
			return user.username || (user.profile && user.profile.name);
		}
		return null;
	},

	log : function(message, data, level) {
		SystemLog.insert({
			date : new Date(),
			message : message,
			data : data,
			level : level || null,
		})
	},

	logError : function(err) {
		utils.log("error", err, "err");
	},

	// adapted from https://www.geeksforgeeks.org/elo-rating-algorithm/
	computeEloDeltas : function(resultType, ratingWhite, ratingBlack) {
		const result = {
			WIN_WHITE : 0,
			WIN_BLACK : 1,
			DRAW : 0.5
		}[resultType];

		const p1 = 1 / (1 + Math.pow(10, ((ratingWhite - ratingBlack) / 400)));
		var delta = ELO_K * Math.abs(result - p1);
		if (resultType == "BLACK_WIN" || (resultType == "DRAW" && ratingWhite > ratingBlack)) {
			delta *= -1;
		}
		return {
			deltaWhite : delta,
			deltaBlack : -delta,
		}
	},

	moment : function(date) {
		var language = TAPi18n.getLanguage();
		if (!Object.keys(languages).includes(language)) {
			language = "en";
		}
		return moment(date).locale(language);
	},
};
