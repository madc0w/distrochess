import { Meteor } from "meteor/meteor";

const userQueue = [];
const moveTimeoutTimersIds = {};

const collections = [ Games, Meteor.users, SystemData, GameAssignments, SystemLog ];

Meteor.startup(() => {
	// code to run on server at startup
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

	//	Meteor.users.find({
	//		username : null,
	//		"profile.name" : null,
	//	}).observeChanges({
	//		added : function(id, user) {
	//			utils.log("user added", user);
	//		}
	//	});

	// assign sequential username if none provided
	Meteor.users.find({
		username : null,
		"profile.name" : null,
	}).observe({
		// not observerChanges, which fails due to record not having been added yet!
		// utterly undocumented behavior here https://docs.meteor.com/api/collections.html#Mongo-Cursor-observe
		// 2 hours lost
		added : function(user) {
			try {
				//				utils.log("user added with no username", user);
				const userIdRecord = SystemData.findOne({
					key : "USER_ID"
				});
				var currUserId = 1;
				if (userIdRecord) {
					currUserId = userIdRecord.data + 1;
					SystemData.update({
						_id : userIdRecord._id
					}, {
						$set : {
							data : currUserId
						}
					});
				} else {
					SystemData.insert({
						key : "USER_ID",
						data : currUserId
					});
				}
				user.username = "Anonymous-" + currUserId;
				Meteor.users.update({
					_id : user._id
				}, {
					$set : {
						username : user.username
					}
				});
			} catch (e) {
				utils.logError(e);
			}
		}
	});

});

Meteor.methods({
	getGame : function() {
		var games;
		if (Meteor.userId()) {
			games = [];
			Games.find({
				gameResult : null,
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
				if (!gamePlayer || (gamePlayer && gamePlayer.isWhite == utils.isWhiteToMove(game))) {
					games.push(game);
				}
			});

			if (games.length == 0) {
				if (!userQueue.includes(Meteor.userId())) {
					userQueue.push(Meteor.userId());
					console.log("pushed user onto queue", userQueue);
				}
				console.log("user " + utils.getUsername() + " must wait for available game");
				return "WAIT";
			}

			GameAssignments.remove({
				userId : Meteor.userId()
			});

		} else {
			// no user
			games = Games.find({
				gameResult : null,
				currentUserId : null,
			}).fetch();
			if (games.length == 0) {
				console.log("will create new game for anonymous user");
				return null;
			}
		}

		const gameIds = [];
		for (var i in games) {
			gameIds.push(games[i].id);
		}
		const game = games[Math.floor(Math.random() * games.length)];
		console.log("choose game " + game.id + " for user " + utils.getUsername() + " from ", gameIds);

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
			const username = utils.getUsername(user);
			playerData[user._id] = {
				rating : user.rating,
				username : username,
				numGames : user.gameIds && user.gameIds.length
			};
		});

		return {
			game : game,
			playerData : playerData,
		};
	},

	saveGame : function(board, fen) {
		if (!Meteor.userId()) {
			return null;
		}

		const now = new Date();
		if (!Meteor.user().rating) {
			Meteor.user().rating = INITIAL_RATING;
			Meteor.users.update({
				_id : Meteor.userId()
			}, {
				$set : {
					rating : INITIAL_RATING
				}
			});
		}

		const players = (board.game && board.game.players) || {};
		if (players[Meteor.userId()] && players[Meteor.userId()].isWhite != utils.isWhiteToMove(board.game)) {
			return "WRONG_SIDE";
		}

		if (players[Meteor.userId()]) {
			players[Meteor.userId()].lastMoveTime = now;
		} else {
			players[Meteor.userId()] = {
				lastMoveTime : now,
				isWhite : !board.game || utils.isWhiteToMove(board.game),
			};
		}

		var gameResult = null;
		if (board.game && board.game._id) {
			const chess = new Chess(fen);
			if (chess.game_over()) {
				if (chess.in_checkmate()) {
					gameResult = chess.turn() == "w" ? "WIN_BLACK" : "WIN_WHITE";
				} else {
					gameResult = "DRAW";
				}
			}

			const timerId = moveTimeoutTimersIds[board.game._id];
			if (timerId) {
				Meteor.clearTimeout(timerId);
				delete moveTimeoutTimersIds[board.game._id];
			}
			const game = Games.findOne({
				_id : board.game._id
			});
			const playerMoves = (players[Meteor.userId()] && players[Meteor.userId()].moves) || [];
			//			console.log("1 playerMoves", playerMoves);
			playerMoves.push(board.lastMove);
			//			console.log("2 playerMoves", playerMoves);
			if (!players[Meteor.userId()]) {
				players[Meteor.userId()] = {};
			}
			players[Meteor.userId()].moves = playerMoves;
			//			console.log("players", players);

			game.moves.push(board.lastMove);
			board.game = game;

			Games.update({
				_id : board.game._id
			}, {
				$set : {
					gameResult : gameResult,
					moves : game.moves,
					currentUserId : null,
					players : players,
					position : fen,
				}
			});
		} else {
			// create a new game
			players[Meteor.userId()].moves = [ board.lastMove ];

			const gameIdRecord = SystemData.findOne({
				key : "GAME_ID"
			});
			var currGameId = 1;
			if (gameIdRecord) {
				currGameId = gameIdRecord.data + 1;
				SystemData.update({
					_id : gameIdRecord._id
				}, {
					$set : {
						data : currGameId
					}
				});
			} else {
				SystemData.insert({
					key : "GAME_ID",
					data : currGameId
				});
			}

			board.game = {
				id : currGameId,
				moves : [ board.lastMove ],
				gameResult : null,
				currentUserId : null,
				players : players,
				position : fen,
			};
			board.game._id = Games.insert(board.game);
		}

		if (!gameResult) {
			// assign game to first user in the queue who is eligible to play that game
			for (var i in userQueue) {
				const queueUserId = userQueue[i];
				console.log("board.game.players[" + queueUserId + "]", board.game.players[queueUserId]);
				//			console.log("board.game.isWhiteToMove", board.game.isWhiteToMove);
				if (!board.game.players[queueUserId] || board.game.players[queueUserId].isWhite == utils.isWhiteToMove(board.game)) {
					userQueue.splice(i, 1);
					console.log("assigning game" + board.game._id + " to user " + queueUserId);
					GameAssignments.update(
						{
							userId : queueUserId,
						},
						{
							userId : queueUserId,
							gameId : board.game._id,
							date : now,
						}, {
							upsert : true
						});
					break;
				}
			}
		}

		const gameIds = Meteor.user().gameIds || [];
		if (!gameIds.includes(board.game._id)) {
			gameIds.push(board.game._id);
		}
		const numMoves = (Meteor.user().numMoves || 0) + 1;
		Meteor.users.update({
			_id : Meteor.userId()
		}, {
			$set : {
				gameIds : gameIds,
				numMoves : numMoves,
			}
		});

		return gameResult;
	},

	checkUsername : function(username) {
		const existingUser = Meteor.users.findOne({
			$or : [
				{
					username : {
						$regex : username,
						$options : "i"
					}
				},
				{
					username : null,
					"profile.name" : {
						$regex : username,
						$options : "i"
					}
				}
			]
		});
		return !existingUser;
	},

	setUsername : function(username) {
		if (!Meteor.user()) {
			return false;
		}
		if (username != utils.getUsername()) {
			if (!Meteor.call("checkUsername", username)) {
				return false;
			}
			Meteor.users.update({
				_id : Meteor.userId()
			}, {
				$set : {
					username : username
				}
			});
		}
		return true;
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
