MOVE_TIMEOUT = 8 * 60 * 1000;
INITIAL_RATING = 1200;

Games = new Mongo.Collection("games");
SystemData = new Mongo.Collection("systemData");
GameAssignments = new Mongo.Collection("gameAssignments");
SystemLog = new Mongo.Collection("systemLog");

utils = {
	isWhiteToMove : function(game) {
		return game.moves.length % 2 == 0;
	},

	getUsername : function(user) {
		return user.username || (user.profile && user.profile.name);
	},

	log : function(message, level, data) {
		SystemLog.insert({
			date : new Date(),
			message : message,
			data : data,
			level : level || null,
		})
	},
};
