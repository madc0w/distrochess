import { Meteor } from "meteor/meteor";

var collections = [ Games, Meteor.users ];
for (var i in collections) {
	var collection = collections[i];
	// deny every kind of write operation from client
	var deny = function() {
		return true;
	};
	collection.deny({
		insert : deny,
		update : deny,
		remove : deny,
	});
}

Meteor.startup(() => {
	// code to run on server at startup
});

Meteor.methods({
	getGame : function() {
		if (!Meteor.userId()) {
			return null;
		}
		const games = [];
		Games.find({
			isInProgress : true,
		}).forEach(function(game) {
			const gamePlayer = game.players[Meteor.userId()];
			if (!gamePlayer || (gamePlayer && gamePlayer.isWhite == game.isWhiteToMove)) {
				games.push(game);
			}
		});
		return games[Math.floor(Math.random() * games.length)];
	},

	saveGame : function(board) {
		if (!Meteor.userId()) {
			return null;
		}


	},
});
