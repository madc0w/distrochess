import { Meteor } from "meteor/meteor";

const FLAG_CHECK_INTERVAL_MINS = 8;
const USER_QUEUE_CHECK_INTERVAL_SECS = 40;

const userQueue = [];
const moveTimeoutTimersIds = {};

const collections = [ Games, Meteor.users, SystemData, GameAssignments, SystemLog ];

var isGettingGame = false;

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

	// on server restart, make all games available
	Games.update({}, {
		$set : {
			currentUserId : null,
			assignmentTime : new Date(),
		}
	}, {
		multi : true
	});

	// check periodically to ensure a minimum number of active games
	Meteor.setInterval(() => {
		const now = new Date();
		const startingPosition = new Chess().fen();
		while (userQueue.length > 0) {
			const game = {
				id : getNextGameId(),
				history : [],
				moves : [],
				gameResult : null,
				currentUserId : null,
				assignmentTime : now,
				players : {},
				position : startingPosition,
				creationDate : now,
				lastMoveTime : now,
				isAutoCreated : true,
			};
			game._id = Games.insert(game);
			console.log("new game auto-created", game._id);

			// assign game to first user in the queue
			const queueUserId = userQueue.shift();
			console.log("assigning auto-created game " + game._id + " to user " + queueUserId);
			GameAssignments.update({
				userId : queueUserId,
			}, {
				userId : queueUserId,
				gameId : game._id,
				date : now,
			}, {
				upsert : true
			});
		}
	}, USER_QUEUE_CHECK_INTERVAL_SECS * 1000);

	// check for games to be flagged 
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
			console.log("game flagged for inactivity", game._id);

			GameAssignments.remove({
				gameId : game._id
			});

			updateRatings(game, gameResult);
		});
	}, FLAG_CHECK_INTERVAL_MINS * 60 * 1000);

	// assign authKey to new users, used to authenticate account deletion requests
	Meteor.users.find({
		authKey : null,
	}).observe({
		// not observerChanges, which fails due to record not having been added yet!
		// utterly undocumented behavior here https://docs.meteor.com/api/collections.html#Mongo-Cursor-observe
		// 2 hours lost
		added : function(user) {
			Meteor.users.update({
				_id : user._id
			}, {
				$set : {
					authKey : parseInt(Math.random() * 1e12).toString()
				}
			});
		}
	});

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
				utils.logError("error assigning sequential username for " + user._id, e);
			}
		}
	});
});

Meteor.methods({
	computeGameResult : function(gameId) {
		var game = Games.findOne({
			_id : gameId
		});
		const chess = new Chess(game.fen);
		const pieces = getPieces(chess);
		const result = computeGameResult(game, chess, pieces);
		console.log("game result", result);
		return result;
	},

	getPlayerData : function(gameId) {
		const game = Games.findOne({
			id : gameId
		});
		if (game) {
			const playerData = getPlayerData(game);
			return playerData;
		} else {
			console.error("getPlayerData : failed to find game with id ", gameId);
			return {};
		}
	},

	getGame : function() {
		if (isGettingGame) {
			console.log("getGame concurrency lock");
			return "LOCK";
		}
		isGettingGame = true;
		try {
			const now = new Date();
			var games;
			if (Meteor.userId()) {
				games = [];
				Games.find({
					gameResult : null,
					_id : {
						$nin : Meteor.user().ignoredGameIds || []
					},
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

			const game = games[Math.floor(Math.random() * games.length)];
			//		const gameIds = [];
			//		for (var i in games) {
			//			gameIds.push(games[i].id);
			//		}
			//		console.log("choose game " + game.id + " for user " + utils.getUsername() + " from ", gameIds);

			Games.update({
				currentUserId : Meteor.userId()
			}, {
				$set : {
					currentUserId : null,
					assignmentTime : now,
				}
			}, {
				multi : true
			});

			Games.update({
				_id : game._id
			}, {
				$set : {
					currentUserId : Meteor.userId() || "NONE",
					assignmentTime : now,
				}
			});
			moveTimeoutTimersIds[game._id] = Meteor.setTimeout(() => {
				console.log("move timer timed out for game " + game.id, game._id);
				Games.update({
					_id : game._id
				}, {
					$set : {
						currentUserId : null,
						assignmentTime : now,
					}
				});
			}, MOVE_TIMEOUT);

			const playerData = getPlayerData(game);
			return {
				game : game,
				playerData : playerData,
			};
		} finally {
			isGettingGame = false;
		}
	},

	saveGame : function(board, fen) {
		if (!Meteor.userId()) {
			return null;
		}

		const now = new Date();
		const players = (board.game && board.game.players) || {};
		if (players[Meteor.userId()] && players[Meteor.userId()].isWhite != utils.isWhiteToMove(board.game)) {
			return "WRONG_SIDE";
		}

		if (!players[Meteor.userId()]) {
			players[Meteor.userId()] = {
				isWhite : !board.game || utils.isWhiteToMove(board.game),
			};
		}
		players[Meteor.userId()].lastMoveTime = now;

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

			if (game.moves.length > 0 && game.moves[game.moves.length - 1].color == board.lastMove.color) {
				console.error("attempt to make move by same color twice in a row! game._id: " + game._id + "  game.id: " + game.id + "  user: " + utils.getUsername());
				return null;
			}

			// game.currentUserId may be null if the server was restarted. let's just allow that.
			if (game.currentUserId && game.currentUserId != "NONE" && game.currentUserId != Meteor.userId()) {
				console.error("attempt to make move by user who is not currently assigned user. game._id: " + game._id + "  game.id: " + game.id + "  user: " + utils.getUsername() + "  game.currentUserId: " + game.currentUserId);
				return null;
			}

			game.history.push({
				fen : fen,
				position : currentPosition,
				pieces : pieces,
				userId : Meteor.userId(),
			});

			gameResult = computeGameResult(game, chess, pieces);

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
			board.game.players = players;

			Games.update({
				_id : board.game._id
			}, {
				$set : {
					lastMoveTime : now,
					history : game.history,
					gameResult : gameResult,
					moves : game.moves,
					currentUserId : null,
					assignmentTime : now,
					players : players,
					position : fen,
				}
			});
		} else {
			// create a new game

			if (board.lastMove.color != "w") {
				console.error("attempt to create new game where first move is not white");
				return null;
			}

			players[Meteor.userId()].moves = [ board.lastMove ];

			const currGameId = getNextGameId();
			board.game = {
				id : currGameId,
				history : [ {
					fen : fen,
					position : currentPosition,
					pieces : pieces,
					userId : Meteor.userId(),
				} ],
				moves : [ board.lastMove ],
				gameResult : null,
				currentUserId : null,
				assignmentTime : now,
				players : players,
				position : fen,
				creationDate : now,
				lastMoveTime : now,
			};
			board.game._id = Games.insert(board.game);
		}

		var ratingDelta = null;
		if (gameResult) {
			ratingDelta = updateRatings(board.game, gameResult);
		} else {
			// assign game to first user in the queue who is eligible to play that game
			for (var i in userQueue) {
				const queueUserId = userQueue[i];
				//				console.log("board.game.players[" + queueUserId + "]", board.game.players[queueUserId]);
				//			console.log("board.game.isWhiteToMove", board.game.isWhiteToMove);
				if (!board.game.players[queueUserId] || board.game.players[queueUserId].isWhite == utils.isWhiteToMove(board.game)) {
					userQueue.splice(i, 1);
					console.log("assigning game " + board.game._id + " to user " + queueUserId);
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

		if (gameResult) {
			return {
				ratingDelta : ratingDelta,
				gameResult : gameResult
			};
		}
		return null;
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

	ignoreGame : function(gameId) {
		const ignoredGameIds = Meteor.user().ignoredGameIds || [];
		if (!ignoredGameIds.includes(gameId)) {
			ignoredGameIds.push(gameId);
			Meteor.users.update({
				_id : Meteor.userId()
			}, {
				$set : {
					ignoredGameIds : ignoredGameIds
				}
			});
		}
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
	//	console.log("game.players", game.players);
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
		const inc = numMoves * (user.rating || INITIAL_RATING);
		if (game.players[user._id].isWhite) {
			meanWhiteElo += inc;
			numWhite += numMoves;
		} else {
			meanBlackElo += inc;
			numBlack += numMoves;
		}
	});
	meanWhiteElo /= numWhite;
	meanBlackElo /= numBlack;

	//	console.log("meanWhiteElo", meanWhiteElo);
	//	console.log("meanBlackElo", meanBlackElo);
	//	console.log("gameResult", gameResult);
	const deltas = utils.computeEloDeltas(gameResult, meanWhiteElo, meanBlackElo);
	//	console.log("deltas ", deltas);
	var userDelta = 0;

	Meteor.users.find({
		_id : {
			$in : Object.keys(game.players)
		}
	}).forEach(function(user) {
		const ratio = RATING_DELTA_FACTOR * game.players[user._id].moves.length / game.moves.length;
		const delta = ratio * (game.players[user._id].isWhite ? deltas.deltaWhite : deltas.deltaBlack);
		//		console.log("user " + utils.getUsername(user) + " white?", game.players[user._id].isWhite);
		//		console.log("ratio for user " + utils.getUsername(user), ratio);
		//		console.log("delta for user " + utils.getUsername(user), delta);
		if (user._id == Meteor.userId()) {
			userDelta = delta;
		}
		user.rating = (user.rating || INITIAL_RATING) + delta;
		Meteor.users.update({
			_id : user._id
		}, {
			$set : {
				rating : user.rating
			}
		});
	});
	return userDelta;
}

function computeGameResult(game, chess, pieces) {
	var gameResult = null;
	if (chess.game_over()) {
		if (chess.in_checkmate()) {
			gameResult = chess.turn() == "w" ? "WIN_BLACK" : "WIN_WHITE";
		} else if (chess.in_draw()) {
			gameResult = "DRAW";
		} else {
			console.error("game is over... but neither win nor draw???", game._id);
		}
	} else {
		var maxRepeatCount = 0;
		const positionsMap = {};
		for (var i in game.history) {
			i = parseInt(i);
			const pos = game.history[i].position;
			if (pos) {
				if (!positionsMap[pos]) {
					positionsMap[pos] = 0;
				}
				positionsMap[pos]++;
				maxRepeatCount = Math.max(positionsMap[pos], maxRepeatCount);
			}
		}
		if (maxRepeatCount >= 3) {
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
	return gameResult;
}

function getNextGameId() {
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
	return currGameId;
}

function getPlayerData(game) {
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
	return playerData;
}
