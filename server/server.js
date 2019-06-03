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
		var games;
		if (Meteor.userId()) {
			games = [];
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
			}
		} else {
			// no user
			games = Games.find({
				isInProgress : true,
				currentUserId : null,
			}).fetch();
			if (games.length == 0) {
				return null;
			}
		}
		const game = games[Math.floor(Math.random() * games.length)];

		Games.update({
			_id : game._id
		}, {
			$set : {
				currentUserId : Meteor.userId() || "NONE"
			}
		});
		moveTimeoutTimersIds[game._id] = Meteor.setTimeout(() => {
			Games.update({
				_id : game._id
			}, {
				$set : {
					currentUserId : null
				}
			});
		}, MOVE_TIMEOUT);

		const playerData = {};
		Meteor.users.find({
			_id : {
				$in : Object.keys(game.players)
			}
		}).forEach((user) => {
			playerData[user._id] = {
				rating : user.rating,
				username : user.username,
			};
		});

		return {
			game : game,
			playerData : playerData
		};
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
			lastMoveTime : new Date(),
			isWhite : !board.game || board.game.isWhiteToMove,
		};

		if (board.game && board.game._id) {

			const timerId = moveTimeoutTimersIds[board.game._id + " " + Meteor.userId()];
			if (timerId) {
				Meteor.clearTimeout(timerId);
				delete moveTimeoutTimersIds[board.game._id + " " + Meteor.userId()];
			}
			const players = board.game.players || {};
			const playerMoves = players[Meteor.userId()] && players[Meteor.userId()].moves ? players[Meteor.userId()].moves : [];
			playerMoves.push(board.lastMove);
			players[Meteor.userId()].moves = playerMoves;

			const game = Games.findOne({
				_id : board.game._id
			});
			game.moves.push(board.lastMove);

			Games.update({
				_id : board.game._id
			}, {
				$set : {
					moves : game.moves,
					isWhiteToMove : !game.isWhiteToMove,
					currentUserId : null,
					players : players,
					position : board._position,
				}
			});
		} else {
			// create a new game
			players[Meteor.userId()].moves = [ board.lastMove ];
			Games.insert({
				moves : [ board.lastMove ],
				isInProgress : true,
				isWhiteToMove : false,
				currentUserId : null,
				players : players,
				position : board._position,
			});
		}
	},
});


function computeElo() {
	// from https://www.geeksforgeeks.org/elo-rating-algorithm/
	//	P1 = (1.0 / (1.0 + pow(10, ((rating1 – rating2) / 400))));
	//	P2 = (1.0 / (1.0 + pow(10, ((rating2 – rating1) / 400))));
	//  K = 30
	//
	//	result is: 
	//		0: player 1 loses
	//		1: player 1 wins
	//		0.5: draw
	//

	//	The rating of player is updated using the formula given below :-
	//	rating1 += K * (result – P1);
	//	rating2 += K * ((1 - result) – P2);
}
