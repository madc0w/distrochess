var isSaveGameAfterSignin = false;
var clockIntervalId = null;
var isGettingGame = false;
var game = null;

board = new ReactiveVar();
const isInCheck = new ReactiveVar(false);
const isWaiting = new ReactiveVar(false);
const isPromotion = new ReactiveVar(false);
const isClock = new ReactiveVar(false);
const isPlayers = new ReactiveVar(false);
const isNeedToSignIn = new ReactiveVar(false);
const clockTime = new ReactiveVar(MOVE_TIMEOUT / 1000);

Template.chessBoard.helpers({
	isWhite : function() {
		return playingColor() == "w";
	},

	lowTimeClass : function() {
		return clockTime.get() <= 10 ? "low-time" : null;
	},

	formatInt : function(i) {
		return i ? Math.round(i) : "-";
	},

	isInCheck : function() {
		return isInCheck.get();
	},

	isNeedToSignIn : function() {
		return isNeedToSignIn.get();
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

	isPromotion : function() {
		return isPromotion.get();
	},

	clockTime : function() {
		return clockTime.get();
	},

	playingColor : playingColor,

	formatTime : function(time) {
		const secs = (time % 60);
		return Math.floor(time / 60) + ":" + (secs < 10 ? "0" : "") + secs;
	},

	gameId : function() {
		const _board = board.get();
		return _board && _board.game && _board.game.id;
	},

	formatDateTime : function(date) {
		return utils.moment(date).fromNow();
	},

	players : function(isWhite) {
		const players = [];
		const _board = board.get();
		if (_board.game && _board.game.players) {
			for (var playerId in _board.game.players) {
				if (_board.game.players[playerId].isWhite == isWhite) {
					const percent = 100 * _board.game.players[playerId].moves.length / _board.game.moves.length;
					const movesRatio = _board.game.players[playerId].moves.length + "/" + _board.game.moves.length + " (" + percent.toFixed(1) + "%)";
					players.push({
						username : _board.game.playerData[playerId].username,
						movesRatio : movesRatio,
						lastMoveTime : _board.game.players[playerId].lastMoveTime,
						rating : _board.game.playerData[playerId].rating,
					});
				}
			}
		}
		players.sort(function(player1, player2) {
			return player1.lastMoveTime < player2.lastMoveTime ? 1 : -1;
		});
		return players;
	},

	needToSignInCancel : function() {
		return function() {
			undoLastMove();
			isNeedToSignIn.set(false);
			isOverlay.set(false);
		};
	},
});


Template.chessBoard.events({
	"click #pass-button" : function(e) {
		getGame(board.get().game._id);
	},

	"click #need-to-sign-in-button" : function(e) {
		isNeedToSignIn.set(false);
		isOverlay.set(false);
		isSigninDialog.set(true);
	},
});


Template.chessBoard.onCreated(() => {
	isSaveGameAfterSignin = false;
	clockIntervalId = null;
	isGettingGame = false;
	isWaiting.set(false);
	isPromotion.set(false);
	isClock.set(false);
	isPlayers.set(false);
	clockTime.set(MOVE_TIMEOUT / 1000);

	Tracker.autorun(() => {
		const assigments = GameAssignments.find().fetch();
		console.log("assigments", assigments);
		if (assigments.length > 0) {
			getGame();
		}
	});

	var isUser = false;
	Tracker.autorun(() => {
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
			}
		} else if (isUser) {
			location.reload();
		}
	});
});

Template.chessBoard.onRendered(() => {
	const cfg = {
		draggable : true,
		dropOffBoard : "snapback", // this is the default
		onDrop : function(from, to) {
			if (to != "offboard") {
				const _board = board.get();
				//				if (!game) {
				//					game = new Chess(_board.fen() + " " + playingColor() + " - - 0 1");
				//				}

				const isWhiteToMove = _board.game && utils.isWhiteToMove(_board.game);
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
				if (move.piece == "p" && ((isWhiteToMove && to.endsWith("8")) || (!isWhiteToMove && to.endsWith("1")))) {
					isOverlay.set(true);
					isPromotion.set(true);
				} else {
					_board.move(move.from + "-" + move.to);
					saveGame();
				}
			}
		}
	};

	board.set(new ChessBoard("chess-board", cfg));
	getGame();
});


Template.chessBoard.onDestroyed(() => {
	Meteor.clearInterval(clockIntervalId);
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
		isPromotion.set(false);
		isOverlay.set(false);

		saveGame();
	},
});

///////////////////////////////////////////////////////////////////////////////////////////////////


function playingColor(isSwap) {
	const _board = board.get();
	var isWhite = (!_board.game || utils.isWhiteToMove(_board.game));
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
		isNeedToSignIn.set(true);
		isOverlay.set(true);
	}
}

function getGame() {
	if (!isGettingGame) {
		isGettingGame = true;
		isSpinner.set(true);
		Meteor.call("getGame", function(err, result) {
			if (result === "WAIT") {
				isClock.set(false);
				isWaiting.set(true);
				isPlayers.set(false);
				game = null;
			} else if (result) {
				isWaiting.set(false);
				isClock.set(true);
				isPlayers.set(true);
				clockTime.set(MOVE_TIMEOUT / 1000);
				Meteor.clearInterval(clockIntervalId);
				clockIntervalId = Meteor.setInterval(() => {
					clockTime.set(clockTime.get() - 1);
					if (clockTime.get() <= 0) {
						Meteor.clearInterval(clockIntervalId);
						getGame();
					}
				}, 1000);
				Meteor.setTimeout(() => {
					isSigninDialog.set(false);
					const _board = board.get();
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
				isInCheck.set(game.in_check());
			} else {
				isWaiting.set(false);
				isPlayers.set(false);
				board.get().start();
				game = new Chess();
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
