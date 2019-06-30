var isSaveGameAfterSignin = false;
var isSaveCommentAfterSignin = false;
var isGettingGame = false;
var game = null;
var clockIntervalId = null;
var flaggingCommentId = null;
var isOpeningHistory = false;
var moveFromSquare = null;

const board = new ReactiveVar();
const isInCheck = new ReactiveVar(false);
const isWaiting = new ReactiveVar(false);
const isClock = new ReactiveVar(false);
const isPlayers = new ReactiveVar(false);
const isLoadingComments = new ReactiveVar(false);
const clockTime = new ReactiveVar(MOVE_TIMEOUT / 1000);

Template.chessBoard.helpers({
	maxCommentLength : function() {
		return MAX_COMMENT_LENGTH;
	},

	formatDateTime : function(date) {
		return clientUtils.fromNow(date);
	},

	userColor : function(userId) {
		const _board = board.get();
		if (_board && _board.game && _board.game.players[userId]) {
			return _board.game.players[userId].isWhite ? "w" : "b";
		}
		return null;
	},

	commentUsername : function(comment) {
		const user = Meteor.users.findOne({
			_id : comment.userId
		});
		return user ? utils.getUsername(user) : "?";
	},

	comments : function() {
		const _board = board.get();
		const comments = [];
		if (_board && _board.game) {
			Comments.find({
				gameId : _board.game._id
			}, {
				sort : {
					date : 1
				}
			}).forEach(function(comment) {
				// show only comments for the current users's own side 
				if (comment.userId == Meteor.userId() ||
					(_board.game.players[comment.userId] && _board.game.players[comment.userId].isWhite == utils.isWhiteToMove(_board.game))) {
					comments.push(comment);
				}
			});
		}
		return comments;
	},

	isWhite : function() {
		return playingColor() == "w";
	},

	lowTimeClass : function() {
		return clockTime.get() <= 10 ? "low-time" : null;
	},

	isLoadingComments : function() {
		return isLoadingComments.get();
	},

	isInCheck : function() {
		return isInCheck.get();
	},

	isPlayers : function() {
		return isPlayers.get();
	},

	isClock : function() {
		return isClock.get();
	},

	isWaiting : function() {
		return isWaiting.get();
	},

	clockTime : function() {
		return clockTime.get();
	},

	playingColor : playingColor,

	formatTime : function(time) {
		const secs = (time % 60);
		return Math.floor(time / 60) + ":" + (secs < 10 ? "0" : "") + secs;
	},

	needToSignInCancel : function() {
		return function() {
			undoLastMove();
			dialog.set(null);
		};
	},

	flagCommentCancel : function() {
		return function() {
			flaggingCommentId = null;
			if (clientUtils.isMobile()) {
				$("#flag-comment").hide();
			} else {
				dialog.set(null);
			}
		};
	},

	game : function() {
		const _board = board.get();
		return _board && _board.game;
	},
});


Template.chessBoard.events({
	"click #more-button" : function(e) {
		dialog.set("more-options-dialog");
	},

	"click #load-game-button" : function(e) {
		const gameId = $("#game-id-input").val();
		if (gameId && parseInt(gameId) == gameId) {
			isSpinner.set(true);
			Meteor.call("checkGameId", gameId, function(err, unavailableMessageKey) {
				isSpinner.set(false);
				if (unavailableMessageKey) {
					message.set(TAPi18n.__(unavailableMessageKey));
				} else {
					dialog.set(null);
					templateName.set(null);
					Router.go("/?id=" + gameId);
				}
			});
		} else {
			message.set(TAPi18n.__("invalid_game_id"));
		}
	},

	"click #load-game-dialog-button" : function(e) {
		$("#more-options-dialog").hide();
		dialog.set("load-game-dialog");
	},

	"click #show-players-button" : function(e) {
		$("#more-options-dialog").hide();
		dialog.set("players-dialog");
	},

	"click #show-comments-button" : function(e) {
		$("#more-options-dialog").hide();
		dialog.set("game-comments-container-dialog");
		Meteor.setTimeout(() => {
			const gameCommentsDiv = $("#game-comments")[0];
			if (gameCommentsDiv) {
				//						console.log("gameCommentsDiv.scrollHeight", gameCommentsDiv.scrollHeight);
				gameCommentsDiv.scrollTop = gameCommentsDiv.scrollHeight;
			}
		}, 20);
	},

	"click #flag-button" : function(e) {
		isSpinner.set(true);
		const text = $("#flag-reason-input").val();
		Meteor.call("flagComment", text, flaggingCommentId, function(err, result) {
			flaggingCommentId = null;
			if (clientUtils.isMobile()) {
				$("#flag-comment").hide();
			} else {
				dialog.set(null);
			}
			isSpinner.set(false);
			message.set(TAPi18n.__("comment_flagged"));
		});
	},

	"click .flag-container" : function(e) {
		flaggingCommentId = this._id;
		if (clientUtils.isMobile()) {
			$("#flag-comment").fadeIn(200);
		} else {
			dialog.set("flag-comment");
		}
	},

	"keyup #game-comment" : function(e) {
		if (e.key == "Enter") {
			saveComment();
		}
	},

	"click #submit-comment-button" : saveComment,

	"click #history-button" : function(e) {
		$("#more-options-dialog").hide();
		dialog.set(null);
		isOpeningHistory = true;
		Router.go("/history?id=" + board.get().game.id);
	},

	"click #pass-or-ignore-button" : function(e) {
		dialog.set("pass-dialog");
	},

	"click #pass-button" : function(e) {
		dialog.set(null);
		getGame();
	},

	"click #ignore-button" : function(e) {
		dialog.set(null);
		if (Meteor.userId()) {
			isSpinner.set(true);
			Meteor.call("ignoreGame", board.get().game._id, function(err, result) {
				getGame();
			});
		} else {
			message.set(TAPi18n.__("sign_in_for_feature"));
		}
	},

	"click #need-to-sign-in-button" : function(e) {
		dialog.set(null);
		Meteor.setTimeout(() => {
			dialog.set("signin-dialog");
		}, 0);
	},

	"touchend .square-55d63" : function(e) {
		const square = $(e.currentTarget);
		const img = square.children("img");
		if (img.attr("data-piece") && img.attr("data-piece").startsWith(playingColor())) {
			square.addClass("moving-piece");
			moveFromSquare = square.attr("data-square");
		} else {
			const _board = board.get();
			const isWhiteToMove = !_board.game || utils.isWhiteToMove(_board.game);
			game.setWhiteToMove(isWhiteToMove);
			const moveToSquare = square.attr("data-square");
			const move = game.move({
				from : moveFromSquare,
				to : moveToSquare,
				promotion : "q" // always promote to queen
			});

			if (move) {
				_board.lastMove = move;
				board.set(_board);
				if (move.piece == "p" && ((isWhiteToMove && moveToSquare.endsWith("8")) || (!isWhiteToMove && moveToSquare.endsWith("1")))) {
					dialog.set("promotion-dialog");
				} else {
					_board.move(move.from + "-" + move.to);
					board.set(_board);
					saveGame();
				}
			}
			$(".moving-piece").removeClass("moving-piece");
			moveFromSquare = null;
		}
	},
});


Template.chessBoard.onDestroyed(() => {
	Meteor.clearInterval(clockIntervalId);
});

Template.chessBoard.onCreated(function() {
	isSaveGameAfterSignin = false;
	isGettingGame = false;
	isWaiting.set(false);
	isClock.set(false);
	isPlayers.set(false);
	clockTime.set(MOVE_TIMEOUT / 1000);

	var isClockPaused = false;
	clockIntervalId = Meteor.setInterval(() => {
		if (!isClockPaused) {
			clockTime.set(Math.max(0, clockTime.get() - 1));
			if (game && !game.isNew && clockTime.get() <= 0) {
				getGame();
			}
		}
	}, 1000);

	this.autorun(() => {
		isClockPaused = !!dialog.get();
	});

	this.autorun(() => {
		const _board = board.get();
		if (_board && _board.game) {
			Comments.find({
				gameId : _board.game._id
			}).observe({
				added : function(comment) {
					Meteor.setTimeout(() => {
						const gameCommentsDiv = $("#game-comments")[0];
						if (gameCommentsDiv) {
							//						console.log("gameCommentsDiv.scrollHeight", gameCommentsDiv.scrollHeight);
							gameCommentsDiv.scrollTop = gameCommentsDiv.scrollHeight;
						}
					}, 100);
				}
			});

			isLoadingComments.set(true);
			Meteor.subscribe("comments", _board.game._id, function() {
				const userIds = [];
				Comments.find({
					gameId : _board.game._id
				}).forEach(function(comment) {
					userIds.push(comment.userId);
				});
				Meteor.subscribe("usernames", userIds, function() {
					isLoadingComments.set(false);
				});
			});
		}
	});

	this.autorun(() => {
		const assigments = GameAssignments.find().fetch();
		console.log("assigments", assigments);
		if (assigments.length > 0) {
			getGame();
		}
	});

	var isUser = false;
	this.autorun(() => {
		var _board;
		Tracker.nonreactive(() => {
			_board = board.get();
		});

		// user is signing in/up
		if (Meteor.user()) {
			isUser = true;
			if (_board && isSaveGameAfterSignin) {
				isSaveGameAfterSignin = false;
				saveGame();
			} else if (isSaveCommentAfterSignin) {
				isSaveCommentAfterSignin = false;
				saveComment();
			}
		} else if (isUser) {
			location.reload();
		}
	});
});

Template.chessBoard.onRendered(function() {
	setBoard();
	getGame();

	if (clientUtils.isMobile()) {
		this.autorun(() => {
			const _board = board.get();
			const width = innerWidth - 12;
			$(".chess-board").css("width", width);
			$("#board-container").css("max-width", width);
			$("#board-container").hide();
			$("#clock").css("width", width - 18);
			$("#chess-board-header div").css("width", Math.min(200, innerWidth / 2));
			if (_board) {
				Meteor.setTimeout(() => {
					$("#board-container").show();
					_board.resize();
				}, 200);
			}
		});
	//		$(".dialog").detach().appendTo("body");
	//
	//	//		const scale = innerWidth / 480;
	//	//		$("#board-container").css("transform", "scale(" + scale + ")");
	//	} else {
	//		$("#chess-board-header").css("transform", "scale(2, 1)");
	}
});


Template.promotionPiece.helpers({
	playingColor : playingColor,
});

Template.promotionPiece.events({
	"click img" : function(e) {
		const _board = board.get();
		const position = _board.position();
		position[_board.lastMove.to] = playingColor() + this.piece;
		_board.position(position);
		board.set(_board);
		game.put({
			type : this.piece.toLowerCase(),
			color : playingColor()
		}, _board.lastMove.to);
		dialog.set(null);

		saveGame();
	},
});

///////////////////////////////////////////////////////////////////////////////////////////////////

function playingColor(isSwap) {
	const _board = board.get();
	var isWhite = !_board || !_board.game || utils.isWhiteToMove(_board.game);
	if (isSwap) {
		isWhite = !isWhite;
	}
	return isWhite ? "w" : "b";
}

function saveGame() {
	if (Meteor.userId()) {
		isSpinner.set(true);
		const _board = board.get();
		if (!game) {
			game = new Chess(_board.fen() + " " + playingColor(true) + " - - 0 1");
		}

		Meteor.call("saveGame", _board, game.fen(), function(err, result) {
			if (result == "WRONG_SIDE") {
				isSpinner.set(false);
				message.set(TAPi18n.__("wrong_side_message"));
				getGame();
			} else if (Meteor.user()) {
				if (result) {
					message.set(TAPi18n.__(result.gameResult == "DRAW" ? "draw_message" : "win_message", {
						ratingDelta : result.ratingDelta.toFixed(1)
					}));
				}
				getGame();
			}
		});
	} else {
		isSaveGameAfterSignin = true;
		dialog.set("need-to-sign-in");
	}
}

function getGame() {
	if (!isGettingGame) {
		isGettingGame = true;
		isSpinner.set(true);
		Meteor.call("getGame", board.get() && board.get().game && board.get().game._id, historyGameId.get(), function(err, result) {
			historyGameId.set(null);
			if (result === "LOCK") {
				Meteor.setTimeout(() => {
					isGettingGame = false;
					getGame();
				}, 40);
				return;
			} else if (result === "WAIT") {
				isClock.set(false);
				isWaiting.set(true);
				isPlayers.set(false);
				game = null;
				board.set(null);
			} else if (result) {
				isWaiting.set(false);
				isClock.set(true);
				isPlayers.set(true);
				clockTime.set(MOVE_TIMEOUT / 1000);
				Meteor.setTimeout(() => {
					dialog.set(null);
					const _board = board.get() || setBoard();
					_board.lastMove = null;
					_board.game = result.game;
					_board.game.playerData = result.playerData;
					_board.position(result.game.position);
					const isWhiteToMove = utils.isWhiteToMove(_board.game);
					if ((!isWhiteToMove && _board.orientation() == "white") ||
						(isWhiteToMove && _board.orientation() == "black")) {
						//						console.log("flip");
						_board.flip();
					}
					board.set(_board);
				}, 0);
				game = new Chess(result.game.position);
				const chessBoardDiv = $(".chess-board div");
				chessBoardDiv.removeClass("last-move-square");
				chessBoardDiv.removeClass("from-square");
				chessBoardDiv.removeClass("to-square");
				if (result.game.moves.length > 0) {
					const lastMove = result.game.moves[result.game.moves.length - 1];
					//					console.log("lastMove", lastMove);
					Meteor.setTimeout(() => {
						$(".square-" + lastMove.from).addClass("last-move-square from-square");
						$(".square-" + lastMove.to).addClass("last-move-square to-square");
					}, clientUtils.isMobile() ? 600 : 200);
				}
				isInCheck.set(game.in_check());
			} else {
				isWaiting.set(false);
				isPlayers.set(false);
				board.get().start();
				game = new Chess();
				game.isNew = true;
			}
			console.log("game = ", (game ? game.fen() : null));
			isSpinner.set(false);
			isGettingGame = false;
		});
	}
}

function undoLastMove() {
	game.undo();
	const _board = board.get();
	_board.position(game.fen());
	board.set(_board);
}

function saveComment() {
	if (Meteor.userId()) {
		const text = $("#game-comment").val();
		Meteor.call("saveComment", text, board.get().game._id, board.get().game.moves.length, function(err, result) {
			$("#game-comment").val("");
		});
	} else {
		isSaveCommentAfterSignin = true;
		dialog.set("need-to-sign-in");
	}
}

function setBoard() {
	const cfg = {
		draggable : true,
		dropOffBoard : "snapback", // this is the default
		onDrop : function(from, to) {
			if (to != "offboard") {
				const _board = board.get();
				const isWhiteToMove = !_board.game || utils.isWhiteToMove(_board.game);
				game.setWhiteToMove(isWhiteToMove);
				const move = game.move({
					from : from,
					to : to,
					promotion : "q" // always promote to queen
				});

				// illegal move
				if (move === null) {
					return "snapback";
				}

				_board.lastMove = move;
				board.set(_board);
				if (move.piece == "p" && ((isWhiteToMove && to.endsWith("8")) || (!isWhiteToMove && to.endsWith("1")))) {
					dialog.set("promotion-dialog");
				} else {
					_board.move(move.from + "-" + move.to);
					board.set(_board);
					saveGame();
				}
			}
		}
	};

	const _board = new ChessBoard("chess-board", cfg);
	board.set(_board);
	return _board;
}
