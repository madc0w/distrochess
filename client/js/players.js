const refreshPlayers = new ReactiveVar();

Template.players.helpers({
	formatDateTime : function(date) {
		return clientUtils.fromNow(date);
	},

	formatInt : function(i) {
		return i ? Math.round(i) : "-";
	},

	players : function() {
		refreshPlayers.get();
		const players = [];
		const game = this.game;
		if (game && game.players) {
			if (game.playerData) {
				for (var playerId in game.players) {
					if (game.players[playerId].isWhite == this.isWhite) {
						const percent = 100 * game.players[playerId].moves.length / game.moves.length;
						const movesRatio = game.players[playerId].moves.length + "/" + game.moves.length + " (" + percent.toFixed(1) + "%)";
						players.push({
							username : game.playerData[playerId].username,
							movesRatio : movesRatio,
							lastMoveTime : game.players[playerId].lastMoveTime,
							rating : game.playerData[playerId].rating,
						});
					}
				}
				players.sort(function(player1, player2) {
					return player1.lastMoveTime < player2.lastMoveTime ? 1 : -1;
				});
			} else {
				Meteor.call("getPlayerData", game.id, function(err, playerData) {
					game.playerData = playerData;
					refreshPlayers.set(new Date());
				});
			}
		}
		return players;
	},
});
