var isSaveGameAfterSignin = false;
var clockIntervalId = null;
var isGettingGame = false;

board = new ReactiveVar();
const isPromotion = new ReactiveVar(false);
const isOverlay = new ReactiveVar(false);
const isNeedToSignIn = new ReactiveVar(false);
const isWaiting = new ReactiveVar(false);
const isSpinner = new ReactiveVar(false);
const isClock = new ReactiveVar(false);
const isPlayers = new ReactiveVar(false);
const clockTime = new ReactiveVar(MOVE_TIMEOUT / 1000);
const message = new ReactiveVar(null);

Template.main.helpers({
	gameId : function() {
		const _board = board.get();
		return _board && _board.game && _board.game.id;
	},

	formatDateTime : function(date) {
		return moment(date).fromNow();
	//		const minutes = date.getMinutes();
	//		if (minutes < 10) {
	//			minutes = "0" + minutes;
	//		}
	//		return date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() + " " + date.getHours() + ":" + minutes;
	},

	players : function(isWhite) {
		const players = [];
		const _board = board.get();
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
		return players;
	},

	message : function() {
		return message.get();
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

	isOverlay : function() {
		return isOverlay.get();
	},

	isSpinner : function() {
		return isSpinner.get();
	},

	isNeedToSignIn : function() {
		return isNeedToSignIn.get();
	},

	clockTime : function() {
		return clockTime.get();
	},

	playingColor : playingColor,

	formatTime : function(time) {
		const secs = (time % 60);
		return Math.floor(time / 60) + ":" + (secs < 10 ? "0" : "") + secs;
	},
});

Template.main.events({
	"click" : function(e) {
		message.set(null);
	},

	"click .login-close-text" : function(e) {
		undoLastMove();
	},

	"click #need-to-sign-in-cancel-button" : function(e) {
		undoLastMove();
		isNeedToSignIn.set(false);
		isOverlay.set(false);
	},

	"click #need-to-sign-in-button" : function(e) {
		isNeedToSignIn.set(false);
		isOverlay.set(false);
		$("#login-sign-in-link").click();
	},
});


Template.main.onCreated(() => {
	Accounts.ui.config({
		passwordSignupFields : "USERNAME_AND_EMAIL"
	});

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


Template.main.onRendered(() => {
	console.log("render");
	setBoard();
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
		isPromotion.set(false);
		isOverlay.set(false);

		saveGame();
	},
});

///////////////////////////////////////////////////////////////////////////////////////////////////


function playingColor() {
	const _board = board.get();
	return (!_board.game || utils.isWhiteToMove(_board.game)) ? "w" : "b";
}

function saveGame() {
	if (Meteor.userId()) {
		isSpinner.set(true);
		const _board = board.get();
		_board._position = _board.position();
		Meteor.call("saveGame", _board, function(err, result) {
			if (result == "WRONG_SIDE") {
				isSpinner.set(false);
				message.set(TAPi18n.__("wrong_side_message"));
			} else if (Meteor.user()) {
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
		console.log("getGame");
		isGettingGame = true;
		isSpinner.set(true);
		Meteor.call("getGame", function(err, result) {
			function setupBoard() {
				const _board = board.get();
				_board.game = result.game;
				_board.game.playerData = result.playerData;
				_board.position(result.game.position);
				const isWhiteToMove = utils.isWhiteToMove(_board.game);
				if ((!isWhiteToMove && _board.orientation() == "white") ||
					(isWhiteToMove && _board.orientation() == "black")) {
					console.log("flip");
					_board.flip();
				}
			}

			if (result === "WAIT") {
				isClock.set(false);
				isWaiting.set(true);
				isPlayers.set(false);
			} else if (result) {
				isWaiting.set(false);
				isClock.set(true);
				isPlayers.set(true);
				clockTime.set(MOVE_TIMEOUT / 1000);
				Meteor.clearInterval(clockIntervalId);
				clockIntervalId = Meteor.setInterval(() => {
					clockTime.set(clockTime.get() - 1);
					if (clockTime.get() == 0) {
						Meteor.clearInterval(clockIntervalId);
						getGame();
					}
				}, 1000);
				setupBoard();
			} else {
				isWaiting.set(false);
				isPlayers.set(false);
				board.get().start();
			}
			isSpinner.set(false);
			isGettingGame = false;
		});
	}
}

function setBoard() {
	const cfg = {
		draggable : true,
		dropOffBoard : "snapback", // this is the default
		onDrop : function(from, to) {
			if (to != "offboard") {
				const _board = board.get();
				const game = new Chess(_board.fen() + " " + playingColor() + " - - 0 1");

				const move = game.move({
					from : from,
					to : to,
					promotion : "q" // always promote to queen
				});

				// illegal move
				if (move === null) {
					return "snapback";
				}

				_board.prevPosition = _board.position();
				_board.lastMove = move;
				const isWhiteToMove = _board.game && utils.isWhiteToMove(_board.game);
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
}

function undoLastMove() {
	const _board = board.get();
	_board.position(_board.prevPosition);
}
