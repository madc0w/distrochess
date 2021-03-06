// add i18n languaes here
import "moment/locale/fr";
import "moment/locale/de";
import "moment/locale/ru";
import "moment/locale/es";

//add i18n languaes here
const languages = {
	fr : "Français",
	en : "English",
	de : "Deutsch",
	es : "Español",
	ru : "русский"
};

const entityMap = {
	"&" : "&amp;",
	"<" : "&lt;",
	">" : "&gt;",
	"\"" : "&quot;",
	"'" : "&#39;",
	"/" : "&#x2F;",
	"`" : "&#x60;",
	"=" : "&#x3D;"
};

MAX_COMMENT_LENGTH = 200;
COMMENT_HISTORY_LIMIT = 100;
GAME_HISTORY_LIMIT = 120;
FLAG_TIME_HOURS = 36;
FLAG_WARNING_TIME_HOURS = 6;
MOVE_TIMEOUT = 4 * 60 * 1000;
// allow extra time in case the clock was paused on the client
SERVER_MOVE_TIMEOUT = MOVE_TIMEOUT + (4 * 60 * 1000);
INITIAL_RATING = 1200;
RATING_DELTA_FACTOR = 12;
const ELO_K = 30

moment = require("moment");

Games = new Mongo.Collection("games");
Comments = new Mongo.Collection("comments");
SystemData = new Mongo.Collection("systemData");
GameAssignments = new Mongo.Collection("gameAssignments");
CommentFlags = new Mongo.Collection("commentFlags");

utils = {
	getLanguages : function() {
		return languages;
	},

	isWhiteToMove : function(game) {
		//		console.log("game.moves", typeof game.moves);
		//		console.log("game.moves.length ", game.moves.length);
		return game.moves.length % 2 == 0;
	},

	getAvatar : function(user) {
		user = user || Meteor.user();
		var avatarUrl = null;
		if (user) {
			if (user.services) {
				if (user.services.google) {
					avatarUrl = user.services.google.picture;
				} else if (user.services.facebook) {
					avatarUrl = user.services.facebook.picture && user.services.facebook.picture.data && user.services.facebook.picture.data.url;
				} else if (user.services.github && user.services.github.username) {
					avatarUrl = "https://github.com/" + user.services.github.username + ".png";
				}
			}

			if (!avatarUrl) {
				avatarUrl = Gravatar.imageUrl(utils.getEmail(user));
				avatarUrl += "?default=mp"; // setting default in options fails... inexplicably
			}
		}
		return avatarUrl;
	},

	getEmail : function(user) {
		user = user || Meteor.user();
		var email = null;
		if (user) {
			if (user.emails && user.emails.length > 0 && user.emails[0].address) {
				email = user.emails.length > 0 && user.emails[0].address;
			} else if (user.services && user.services.google) {
				email = user.services.google.email;
			} else if (user.services && user.services.github) {
				email = user.services.github.email || (user.services.github.emails && user.services.github.emails.length > 0 && user.services.github.emails[0]);
			} else if (user.services && user.services.facebook) {
				email = user.services.facebook.email;
			}
		}

		if (email) {
			email = Email.normalize(email);
		}
		return email;
	},

	getUsername : function(user) {
		user = user || Meteor.user();
		if (user) {
			return user.username ||
				(user.services && user.services.github && user.services.github.username) ||
				(user.services && user.services.facebook && user.services.facebook.name) ||
				(user.profile && user.profile.name);
		}
		return null;
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
		if (resultType == "WIN_BLACK" || (resultType == "DRAW" && ratingWhite > ratingBlack)) {
			delta *= -1;
		}
		return {
			deltaWhite : delta,
			deltaBlack : -delta,
		};
	},

	escapeHtml : function(string) {
		return string ? String(string).replace(/[&<>"'`=]/g, function(s) {
			return entityMap[s];
		}) : null;
	},

	// https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
	escapeRegExp : function(string) {
		return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
	},
};
