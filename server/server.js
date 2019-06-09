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

	// check for games to be flagged every 10 minutes
	Meteor.setInterval(() => {
		const now = new Date();
		const cutoffTime = new Date();
		cutoffTime.setDate(cutoffTime.getDate() - FLAG_TIME_DAYS);
		Games.find({
			gameResult : null,
			lastMoveTime : {
				$lt : cutoffTime
			}
		}).forEach(function(game) {
			gameResult = utils.isWhiteToMove(game) ? "WIN_BLACK" : "WIN_WHITE";
			Games.update({
				_id : game._id
			}, {
				gameResult : gameResult,
				flagTime : now,
			});

			GameAssignments.remove({
				gameId : game._id
			});

			updateRatings(game, gameResult);
		});
	}, 10 * 60 * 1000);

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
		const chess = new Chess(fen);
		const currentPosition = chess.ascii();
		const pieces = getPieces(chess);
		if (board.game && board.game._id) {

			const timerId = moveTimeoutTimersIds[board.game._id];
			if (timerId) {
				Meteor.clearTimeout(timerId);
				delete moveTimeoutTimersIds[board.game._id];
			}
			const game = Games.findOne({
				_id : board.game._id
			});

			game.history.push({
				position : currentPosition,
				pieces : pieces,
			});

			if (chess.game_over()) {
				if (chess.in_checkmate()) {
					gameResult = chess.turn() == "w" ? "WIN_BLACK" : "WIN_WHITE";
				} else {
					gameResult = "DRAW";
				}
			} else {
				var repeatCount = 0;
				for (var i in game.history) {
					for (var j = i + 1; j < game.history.length; j++) {
						if (game.history.position[i] == game.history.position[j]) {
							repeatCount++;
						}
					}
				}
				if (repeatCount >= 3) {
					gameResult = "DRAW";
				} else if (game.history.length > 10) {
					// if, for two moves, one side has only a king, and the other side has either queen or rook,
					// then adjudicate win  
					if (pieces == game.history[game.history.length - 2].pieces) {
						if (pieces.match(/[A-Z]k$/) && pieces.match(/[QR]/)) {
							gameResult = "WIN_WHITE";
						} else if (pieces.match(/^K[a-z]/) && pieces.match(/[qr]/)) {
							gameResult = "WIN_BLACK";
						}
					}
				}
			}

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
					lastMoveTime : now,
					history : game.history,
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
				history : [ {
					position : currentPosition,
					pieces : pieces
				} ],
				moves : [ board.lastMove ],
				gameResult : null,
				currentUserId : null,
				players : players,
				position : fen,
				lastMoveTime : now,
			};
			board.game._id = Games.insert(board.game);
		}

		if (gameResult) {
			updateRatings(board.game, gameResult);
		} else {
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


// returns a string containing all the pieces on the board
function getPieces(chess) {
	const pieces = [];
	for (var file of "abcdefgh") {
		for (var rank = 1; rank <= 8; rank++) {
			const piece = chess.get(file + rank);
			if (piece) {
				pieces.push(piece.color == "w" ? piece.type.toUpperCase() : piece.type);
			}
		} // 
	}
	pieces.sort();
	return pieces.join("");
}

function updateRatings(game, gameResult) {
	var meanBlackElo = 0;
	var meanWhiteElo = 0;
	var numWhite = 0;
	var numBlack = 0;
	Meteor.users.find({
		_id : {
			$in : Object.keys(game.players)
		}
	}).forEach(function(user) {
		const numMoves = game.players[user._id].moves.length;
		if (game.players[user._id].isWhite) {
			meanWhiteElo += numMoves * user.rating;
			numWhite += numMoves;
		} else {
			meanBlackElo += numMoves * user.rating;
			numBlack += numMoves;
		}
	});
	meanWhiteElo /= numWhite;
	meanBlackElo /= numBlack;

	const deltas = utils.computeEloDeltas(gameResult, meanWhiteElo, meanBlackElo);

	Meteor.users.find({
		_id : {
			$in : Object.keys(game.players)
		}
	}).forEach(function(user) {
		const ratio = game.players[user._id].moves.length / game.moves.length;
		user.rating += ratio * (game.players[user._id].isWhite ? deltas.deltaWhite : deltas.deltaBlack);
		Meteor.users.update({
			_id : user._id
		}, {
			$set : {
				rating : user.rating
			}
		});
	});
}
