var isSaveGameAfterSignin = false;
var isGettingGame = false;
var game = null;
var clockIntervalId = null;

const board = new ReactiveVar();
const isInCheck = new ReactiveVar(false);
const isWaiting = new ReactiveVar(false);
const isPromotion = new ReactiveVar(false);
const isClock = new ReactiveVar(false);
const isPlayers = new ReactiveVar(false);
const isNeedToSignIn = new ReactiveVar(false);
const isPassDialog = new ReactiveVar(false);
const clockTime = new ReactiveVar(MOVE_TIMEOUT / 1000);

Template.chessBoard.helpers({
	isWhite : function() {
		return playingColor() == "w";
	},

	lowTimeClass : function() {
		return clockTime.get() <= 10 ? "low-time" : null;
	},

	isPassDialog : function() {
		return isPassDialog.get();
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

	needToSignInCancel : function() {
		return function() {
			undoLastMove();
			isNeedToSignIn.set(false);
			isOverlay.set(false);
		};
	},

	passCancel : function() {
		return function() {
			isPassDialog.set(false);
		};
	},

	game : function() {
		return board.get().game;
	},
});


Template.chessBoard.events({
	"click #history-button" : function(e) {
		open("/history?id=" + board.get().game.id, location.pathname == "/history" ? null : "game-history");
	},

	"click #pass-or-ignore-button" : function(e) {
		isPassDialog.set(true);
	},

	"click #pass-button" : function(e) {
		isPassDialog.set(false);
		getGame();
	},

	"click #ignore-button" : function(e) {
		isPassDialog.set(false);
		isSpinner.set(true);
		Meteor.call("ignoreGame", board.get().game._id, function(err, result) {
			getGame();
			isSpinner.set(false);
		});
	},

	"click #need-to-sign-in-button" : function(e) {
		isNeedToSignIn.set(false);
		isOverlay.set(false);
		isSigninDialog.set(true);
	},
});


Template.chessBoard.onDestroyed(() => {
	Meteor.clearInterval(clockIntervalId);
});

Template.chessBoard.onCreated(() => {
	isSaveGameAfterSignin = false;
	isGettingGame = false;
	isWaiting.set(false);
	isPromotion.set(false);
	isClock.set(false);
	isPlayers.set(false);
	clockTime.set(MOVE_TIMEOUT / 1000);

	clockIntervalId = Meteor.setInterval(() => {
		clockTime.set(clockTime.get() - 1);
		if (clockTime.get() <= 0) {
			getGame();
		}
	}, 1000);

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
					isOverlay.set(true);
					isPromotion.set(true);
				} else {
					_board.move(move.from + "-" + move.to);
					board.set(_board);
					saveGame();
				}
			}
		}
	};

	board.set(new ChessBoard("chess-board", cfg));
	getGame();
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
			} else if (result) {
				isWaiting.set(false);
				isClock.set(true);
				isPlayers.set(true);
				clockTime.set(MOVE_TIMEOUT / 1000);
				Meteor.setTimeout(() => {
					isSigninDialog.set(false);
					const _board = board.get();
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
				if (result.game.moves.length > 0) {
					const lastMove = result.game.moves[result.game.moves.length - 1];
					console.log("lastMove", lastMove);
					const chessBoardDiv = $(".chess-board div");
					chessBoardDiv.removeClass("last-move-square");
					chessBoardDiv.removeClass("from-square");
					chessBoardDiv.removeClass("to-square");
					Meteor.setTimeout(() => {
						$(".square-" + lastMove.from).addClass("last-move-square from-square");
						$(".square-" + lastMove.to).addClass("last-move-square to-square");
					}, 200);
				}
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
