import { Meteor } from "meteor/meteor";

const FLAG_CHECK_INTERVAL_MINS = 8;
const USER_QUEUE_CHECK_INTERVAL_SECS = 40;

const userQueue = [];
const moveTimeoutTimersIds = {};

const collections = [ Games, Meteor.users, SystemData, GameAssignments, Comments ];

var isGettingGame = false;

Meteor.startup(() => {
	// code to run on server at startup

	Accounts.emailTemplates.siteName = "Distrochess";
	Accounts.emailTemplates.from = "Distrochess <no-reply@distrochess.com>";
	Accounts.emailTemplates.resetPassword = {
		//		from : function(user) {
		//			// Overrides the value set in Accounts.emailTemplates.from when resetting passwords.
		//			return "Spoticle Admin <noreply@mail.spoticle.com>";
		//		},
		subject : function(user) {
			const language = user.language || "en";
			return TAPi18n.__("password_reset_subject", {}, language);
		},
		text : function(user, url) {
			url = url.replace("/#/", "/");
			return getEmail("passwordResetEmail", user, false, {
				url : url,
				email : utils.getEmail(user),
			});
		},
		html : function(user, url) {
			url = url.replace("/#/", "/");
			return getEmail("passwordResetEmail", user, true, {
				url : url,
				email : utils.getEmail(user),
			});
		}
	};

	const deny = function() {
		return true;
	};
	for (var i in collections) {
		const collection = collections[i];
		// deny every kind of write operation from client
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

	// warn users of games about to be flagged 
	Meteor.setInterval(() => {
		const now = new Date();
		const cutoffTime = new Date();
		cutoffTime.setHours(cutoffTime.getHours() - (FLAG_TIME_DAYS * 24 - FLAG_WARNING_TIME_HOURS));
		Games.find({
			gameResult : null,
			lastMoveTime : {
				$lt : cutoffTime
			}
		}).forEach(function(game) {
			for (var userId in game.players) {
				if (utils.isWhiteToMove(game) == game.players[userId].isWhite) {
					const user = Meteor.users.findOne({
						_id : userId
					});
					const flagWarningNotificationsSent = (user && user.flagWarningNotificationsSent) || {};
					if (user && user.isReceiveNotifications != false && !flagWarningNotificationsSent[game._id]) {
						const email = utils.getEmail(user);
						if (email) {
							flagWarningNotificationsSent[game._id] = now;
							Meteor.users.update({
								_id : userId
							}, {
								$set : {
									flagWarningNotificationsSent : flagWarningNotificationsSent
								}
							});
							const language = user.language || "en";
							const html = getEmail("gameFlagWarningNotification", user, true, {
								authKey : user.authKey,
								gameId : game.id,
								flagTime : FLAG_WARNING_TIME_HOURS,
							});
							console.log("sending flag warning notification", email, user._id, game._id);
							Email.send({
								from : "Distrochess Notification <notification@distrochess.com>",
								to : email,
								subject : TAPi18n.__("flag_warning_notification_subject", {}, language),
								html : html,
								headers : {
									"Content-Transfer-Encoding" : "8bit",
								}
							});
						}
					}
				}
			}
		});
	}, FLAG_CHECK_INTERVAL_MINS * 60 * 1000);

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

	// WARNING! extremely dangerous code here, which IS NOT WORKING!!!
	// the idea was was detect and rectify username collisions, and also to update usernames that 
	// were erroneously set to Anonymous instead of the Github username.
	// but instead, all usernames are set to null, for some reason!  and... other insanity.

	//	Meteor.users.find().observeChanges({
	//		added : function(userId) {
	//			//			console.log("added ", userId);
	//			const newUser = Meteor.users.findOne({
	//				_id : userId
	//			});
	//			const username = utils.getUsername(newUser);
	//			//			console.log("username", username);
	//
	//			Meteor.users.find().forEach(function(user) {
	//				const otherUsername = utils.getUsername(user);
	//				//				console.log("otherUsername ", otherUsername);
	//				if (otherUsername == username && user._id != userId) {
	//					console.log("username collision: " + username + " user._id: " + user._id + " and newUser._id: " + userId);
	//					Meteor.users.update({
	//						_id : userId
	//					}, {
	//						$set : {
	//							username : username + "-2"
	//						}
	//					});
	//				} else if (otherUsername && otherUsername.startsWith("Anonymous-")) {
	//					user.username = null;
	//					const updatedUsername = utils.getUsername(user);
	//					if (updatedUsername) {
	//						console.log("setting username to null on user with id ", userId);
	//						Meteor.users.update({
	//							_id : userId
	//						}, {
	//							$unset : {
	//								username : null
	//							}
	//						});
	//					}
	//				}
	//			});
	//		}
	//	});

	// assign sequential username if none provided
	Meteor.users.find().observe({
		// not observerChanges, which fails due to record not having been added yet!
		// utterly undocumented behavior here https://docs.meteor.com/api/collections.html#Mongo-Cursor-observe
		// 2 hours lost
		added : function(user) {
			if (!utils.getUsername(user)) {
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
			}
		}
	});
});

Meteor.methods({
	checkGameId : function(gameId) {
		gameId = parseInt(gameId);
		console.log("gameId", gameId);
		const game = Games.findOne({
			id : gameId
		});
		var unavailableMessageKey = null;
		if (game) {
			if (game.gameResult) {
				unavailableMessageKey = "game_already_decided";
			} else if (Meteor.userId() && game.players[Meteor.userId()] && game.players[Meteor.userId()].isWhite != utils.isWhiteToMove(game)) {
				unavailableMessageKey = "not_your_turn";
			}
		} else {
			unavailableMessageKey = "no_such_game";
		}
		return unavailableMessageKey;
	},

	sendResetPasswordEmail : function(emailOrUsername) {
		//		console.log("sendResetPasswordEmail : emailOrUsername ", emailOrUsername);
		//		this.unblock();
		const escapedEmailOrUsername = utils.escapeRegExp(emailOrUsername);
		const user = Meteor.users.findOne({
			$or : [ {
				username : {
					$regex : "^" + escapedEmailOrUsername + "$",
					$options : "i"
				}
			}, {
				"emails.address" : {
					$regex : "^" + escapedEmailOrUsername + "$",
					$options : "i"
				}
			} ]
		});
		//		console.log("sendResetPasswordEmail : user ", user);
		if (user) {
			const result = Accounts.sendResetPasswordEmail(user._id);
			console.log("sendResetPasswordEmail result: ", result);
			return true;
		}
		console.log("sendResetPasswordEmail : no user found having email or username " + emailOrUsername);
		return false;
	},

	setReceiveNotifcations : function(isReceiveNotifications) {
		Meteor.users.update({
			_id : Meteor.userId()
		}, {
			$set : {
				isReceiveNotifications : isReceiveNotifications
			}
		});
	},

	flagComment : function(reasonText, commentId) {
		const comment = Comments.findOne({
			_id : commentId
		});

		if (comment) {
			const flagId = CommentFlags.insert({
				reason : reasonText,
				commentId : commentId,
				userId : Meteor.userId(),
				commentText : comment.text,
				date : new Date()
			});

			var text = "";
			text += "comment ID    : " + commentId + "\n";
			text += "comment text  : " + comment.text + "\n";
			text += "flag reason   : " + reasonText + "\n";
			text += "flag ID       : " + flagId + "\n";
			Email.send({
				from : "Distrochess Flag <support@distrochess.com>",
				to : "admin@distrochess.com",
				subject : "comment flagged",
				text : text,
			});
			return true;
		} else {
			return false;
		}
	},

	setUserInfo : function(language, platform, userAgent, isCordova, screen) {
		Meteor.users.update({
			_id : Meteor.userId()
		}, {
			$set : {
				language : language,
				platform : platform,
				userAgent : userAgent,
				isCordova : isCordova,
				screen : screen,
			}
		});
	},

	saveComment : function(text, gameId, moveNum) {
		const now = new Date();
		if (Meteor.userId() && text && text.length <= MAX_COMMENT_LENGTH) {
			Comments.insert({
				text : text,
				userId : Meteor.userId(),
				gameId : gameId,
				date : now,
				moveNum : moveNum
			});
			return true;
		}
		return false;
	},

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

	getGame : function(excludeGameId, loadGameId) {
		if (isGettingGame) {
			console.log("getGame concurrency lock");
			return "LOCK";
		}
		isGettingGame = true;
		try {
			const now = new Date();
			var games = [];

			if (Meteor.userId()) {
				Meteor.users.update({
					_id : Meteor.userId()
				}, {
					$set : {
						lastActivity : now
					}
				});

				const ignoredGameIds = Meteor.user().ignoredGameIds || [];
				if (excludeGameId && excludeGameId != loadGameId) {
					ignoredGameIds.push(excludeGameId);
				}
				var gameToLoad = null;
				//				console.log("loadGameId", loadGameId);
				Games.find({
					gameResult : null,
					_id : {
						$nin : ignoredGameIds
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
						//						console.log("game.id", game.id);
						if (game.id == loadGameId) {
							gameToLoad = game;
						}
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

				//				console.log("gameToLoad", gameToLoad);
				if (gameToLoad) {
					games = [ gameToLoad ];
				} else {
					// if any of these games are games in which the user has made a move, then only choose among those
					const playerGames = [];
					for (var _game of games) {
						if (_game.players[Meteor.userId()]) {
							playerGames.push(_game);
						} //
					}
					if (playerGames.length > 0) {
						games = playerGames;
					}
				}

				GameAssignments.remove({
					userId : Meteor.userId()
				});

			} else {
				// no user
				//				console.log("loadGameId", loadGameId);
				if (loadGameId) {
					games = Games.find({
						gameResult : null,
						$or : [
							{
								currentUserId : null,
							},
							{
								currentUserId : "NONE",
							}
						],
						id : loadGameId,
					}).fetch();
				//					console.log("games ", games);
				}

				if (games.length == 0) {
					games = Games.find({
						gameResult : null,
						currentUserId : null,
					}).fetch();
				}
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

			if (moveTimeoutTimersIds[game._id]) {
				Meteor.clearTimeout(moveTimeoutTimersIds[game._id]);
			}
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
			}, SERVER_MOVE_TIMEOUT);

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

			if (game.history.length > 0 && game.history[game.history.length - 1].fen == fen) {
				console.error("attempt to make move which results in idential FEN to last FEN. game._id: " + game._id + "  game.id: " + game.id + "  user: " + utils.getUsername() + "  game.currentUserId: " + game.currentUserId);
				return null;
			}

			game.history.push({
				fen : fen,
				position : currentPosition,
				pieces : pieces,
				userId : Meteor.userId(),
				date : now,
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
			ratingDelta = updateRatings(board.game, gameResult, Meteor.userId());
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

	testEmail : function(pw) {
		if (pw == Meteor.settings.private.adminPw) {
			const user = {
				_id : "userid",
				language : "en",
				authKey : 11111111,
				emails : [ {
					address : "test@distrochess.com"
				} ],
			};
			const ratingDelta = -4.235;
			const game = {
				gameResult : "WIN_BLACK",
				players : {
					userid : true
				},
				id : 27,
			};
			game.players[user._id] = {
				isWhite : true
			};

			const email = utils.getEmail(user);
			const language = user.language || "en";
			const html = getEmail("gameFlagWarningNotification", user, true, {
				authKey : user.authKey,
				gameId : game.id,
				flagTime : FLAG_WARNING_TIME_HOURS,
			});
			Email.send({
				from : "Distrochess Notification <notification@distrochess.com>",
				to : email,
				subject : TAPi18n.__("flag_warning_notification_subject", {}, language),
				html : html,
				headers : {
					"Content-Transfer-Encoding" : "8bit",
				}
			});

		//			notifyGameEnd(user, ratingDelta, game);
		//			Email.send({
		//				from : "no-reply@distrochess.com",
		//				//				to : "bounce@simulator.amazonses.com",
		//				//				to : "complaint@simulator.amazonses.com",
		//				//				to : "chris.gilmore@gmail.com",
		//				to : "test@distrochess.com",
		//				subject : "test",
		//				text : "this be a test.\nsent at " + new Date()
		//			});
		} else {
			console.warn("somebody tried to call testEmail with bad password", pw);
		}
	},

	ensureUniqueUsernames : function(pw) {
		if (pw == Meteor.settings.private.adminPw) {
			return ensureUniqueUsernames();
		} else {
			console.warn("somebody tried to call ensureUniqueUsernames with bad password", pw);
		}
	},

	checkUsername : function(username) {
		const escapedUsername = utils.escapeRegExp(username);
		const existingUser = Meteor.users.findOne({
			$or : [
				{
					username : {
						$regex : escapedUsername,
						$options : "i"
					}
				},
				{
					username : null,
					"profile.name" : {
						$regex : escapedUsername,
						$options : "i"
					}
				},
				{
					username : null,
					"services.github.username" : {
						$regex : escapedUsername,
						$options : "i"
					}
				},
				{
					username : null,
					"services.facebook.name" : {
						$regex : escapedUsername,
						$options : "i"
					}
				},
			]
		});
		return !existingUser;
	},

	setEmail : function(email) {
		if (!Meteor.user()) {
			return false;
		}

		const escapedEmail = utils.escapeRegExp(email);
		if (Meteor.users.findOne({
				$or : [
					{
						"emails.address" : {
							$regex : "^" + escapedEmail + "$",
							$options : "i"
						}
					},
					{
						"services.google.email" : {
							$regex : "^" + escapedEmail + "$",
							$options : "i"
						}
					},
					{
						"services.github.email" : {
							$regex : "^" + escapedEmail + "$",
							$options : "i"
						}
					},
					{
						"services.facebook.email" : {
							$regex : "^" + escapedEmail + "$",
							$options : "i"
						}
					},
				]
			})) {
			return false;
		}

		const emails = Meteor.user().emails || [];
		emails[0].address = email;

		Meteor.users.update({
			_id : Meteor.userId()
		}, {
			$set : {
				emails : emails
			}
		});
		return true;
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
		if (Meteor.user()) {
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
		}
	},

	unsubscribe : function(authKey) {
		authKey = parseInt(authKey);
		console.log("unsubscribing user. authKey:", authKey);
		console.log(Meteor.users.update({
			authKey : authKey
		}, {
			$set : {
				isReceiveNotifications : false
			}
		}));
	},

	log : function(o) {
		console.log(o ? JSON.stringify(o) : null);
	},
});

///////////////////////////////////////////////////////////////////////////////////////////////////

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

function updateRatings(game, gameResult, currentUserId) {
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
	var userDelta = null;

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
		if (user._id == currentUserId) {
			userDelta = delta;
		}

		notifyGameEnd(user, delta, game);

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

function ensureUniqueUsernames() {
	var collisionCount = 0;
	const usernames = {};
	Meteor.users.find({}, {
		sort : {
			createdAt : -1
		}
	}).forEach(function(user) {
		const username = utils.getUsername(user);
		if (usernames[username]) {
			console.log("username collision: " + username + " user._id: ", user._id);
			collisionCount++;
			usernames[username]++;
			Meteor.users.update({
				_id : user._id
			}, {
				username : username + "-" + usernames[username]
			});
		} else {
			usernames[username] = 1;
		}
	});
	console.log("username collision count", collisionCount);
	return collisionCount;
}

function getEmail(baseFilename, user, isHtml, vars) {
	const language = user.language || "en";
	const filename = "emails/" + baseFilename + "_" + language + "." + (isHtml ? "html" : "txt");
	var text;
	try {
		text = Assets.getText(filename);
	} catch (e) {
		console.warn("No email file '" + filename + "' found.  Attempting English...");
		text = Assets.getText("emails/" + baseFilename + "_en." + (isHtml ? "html" : "txt"));
	}
	text = replaceVars(text, vars);
	//	console.log("text", text);
	return text;
}

function replaceVars(text, varsDict) {
	for (var name in varsDict) {
		const regExp = new RegExp("\\$\\b" + name + "\\b", "g");
		const value = utils.escapeHtml(varsDict[name]);
		text = text.replace(regExp, value);
	}
	return text;
}

// notify players that this game has been decided
function notifyGameEnd(user, ratingDelta, game) {
	const email = utils.getEmail(user);
	if (email && user.isReceiveNotifications != false) {
		var resultKey;
		if ((game.players[user._id].isWhite && game.gameResult == "WIN_WHITE") ||
			(!game.players[user._id].isWhite && game.gameResult == "WIN_BLACK")) {
			resultKey = "your_team_won";
		} else if (game.gameResult == "DRAW") {
			resultKey = "draw";
		} else {
			resultKey = "your_team_lost";
		}

		const html = getEmail("gameEndNotification", user, true, {
			ratingDelta : ratingDelta.toFixed(1),
			authKey : user.authKey,
			result : TAPi18n.__(resultKey),
			gameId : game.id,
		});
		const language = user.language || "en";
		console.log("sending game end notification to ", email, user._id, game._id);
		Email.send({
			from : "Distrochess Notification <notification@distrochess.com>",
			to : email,
			subject : TAPi18n.__("game_end_notification_subject", {}, language),
			html : html,
			headers : {
				"Content-Transfer-Encoding" : "8bit",
			}
		});
		return true;
	}
	return false
}
