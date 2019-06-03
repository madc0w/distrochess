import { Meteor } from "meteor/meteor";

const userQueue = [];
const moveTimeoutTimersIds = {};

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
			$or : [
				{
					currentUserId : null,
				},
				{
					currentUserId : Meteor.userId(),
				}
			]
		}).forEach(function(game) {
			const gamePlayer = game.players[Meteor.userId()];
			if (!gamePlayer || (gamePlayer && gamePlayer.isWhite == game.isWhiteToMove)) {
				games.push(game);
			}
		});

		if (games.length == 0) {
			userQueue.push(Meteor.userId());
			return "WAIT";
		} else {
			const game = games[Math.floor(Math.random() * games.length)];
			Games.update({
				_id : game._id
			}, {
				$set : {
					currentUserId : Meteor.userId()
				}
			});

			moveTimeoutTimersIds[game._id + " " + Meteor.userId()] = Meteor.setTimeout(() => {
				Games.update({
					_id : game._id
				}, {
					$set : {
						currentUserId : null
					}
				});
			}, MOVE_TIMEOUT);
			return game;
		}
	},

	saveGame : function(board) {
		if (!Meteor.userId()) {
			return null;
		}

		const players = (board.game && board.game.players) || {};
		if (players[Meteor.userId()] && players[Meteor.userId()].isWhite != board.game.isWhiteToMove) {
			return "WRONG_SIDE";
		}

		players[Meteor.userId()] = {
			lastMove : new Date(),
			isWhite : !board.game || board.game.isWhiteToMove,
		};

		if (board.game && board.game._id) {

			const timerId = moveTimeoutTimersIds[board.game._id + " " + Meteor.userId()];
			if (timerId) {
				Meteor.clearTimeout(timerId);
				delete moveTimeoutTimersIds[board.game._id + " " + Meteor.userId()];
			}
			const players = board.game.players || {};
			players[Meteor.userId()] = {
				lastMove : new Date(),
				isWhite : game.isWhiteToMove,
			};
			Games.update({
				_id : board.game._id
			}, {
				$set : {
					isWhiteToMove : !game.isWhiteToMove,
					currentUserId : null,
					players : players,
					position : board._position,
				}
			});
		} else {
			// create a new game
			Games.insert({
				isInProgress : true,
				isWhiteToMove : false,
				currentUserId : null,
				players : players,
				position : board._position,
			});
		}
	},
});
