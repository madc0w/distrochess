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
FLAG_TIME_DAYS = 4;
MOVE_TIMEOUT = 4 * 60 * 1000;
INITIAL_RATING = 1200;
RATING_DELTA_FACTOR = 12;
const ELO_K = 30

const momentUpdate = new ReactiveVar();

moment = require("moment");

Games = new Mongo.Collection("games");
Comments = new Mongo.Collection("comments");
SystemData = new Mongo.Collection("systemData");
GameAssignments = new Mongo.Collection("gameAssignments");
CommentFlags = new Mongo.Collection("commentFlags");

if (Meteor.isClient) {
	Meteor.setInterval(() => {
		momentUpdate.set(new Date());
	}, 30 * 1000);
}

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
		return user && user.services && user.services.google && user.services.google.picture;
	},

	getEmail : function(user) {
		user = user || Meteor.user();
		if (user) {
			if (user.services && user.services.google) {
				return user.services.google.email;
			} else if (user.services && user.services.github) {
				return user.services.github.email;
			} else {
				return user.emails.length > 0 && user.emails[0].address;
			}
		}
		return null;
	},

	getUsername : function(user) {
		user = user || Meteor.user();
		if (user) {
			return user.username || (user.services && user.services.github && user.services.github.username) || (user.profile && user.profile.name);
		}
		return null;
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
		if (resultType == "WIN_BLACK" || (resultType == "DRAW" && ratingWhite > ratingBlack)) {
			delta *= -1;
		}
		return {
			deltaWhite : delta,
			deltaBlack : -delta,
		}
	},

	moment : function(date) {
		momentUpdate.get();
		var language = TAPi18n.getLanguage();
		if (!Object.keys(languages).includes(language)) {
			language = "en";
		}
		return moment(date).locale(language);
	},

	escapeHtml : function(string) {
		return string ? String(string).replace(/[&<>"'`=]/g, function(s) {
			return entityMap[s];
		}) : null;
	},

	isSmallScreen : function() {
		return innerWidth < 480;
	},
};
