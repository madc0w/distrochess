var board = null;
var isSaveGameAfterSignin = false;
var clockIntervalId = null;

const isPromotion = new ReactiveVar(false);
const isOverlay = new ReactiveVar(false);
const isNeedToSignIn = new ReactiveVar(false);
const isWaiting = new ReactiveVar(false);
const isSpinner = new ReactiveVar(false);
const isClock = new ReactiveVar(false);
const clockTime = new ReactiveVar(MOVE_TIMEOUT / 1000);
const message = new ReactiveVar(null);

Template.main.helpers({
	message : function() {
		return message.get();
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
		// user is signing in/up
		if (Meteor.user() && board && isSaveGameAfterSignin) {
			isSaveGameAfterSignin = false;
			//			saveGame();
			getGame();
		}
	});
});


Template.main.onRendered(() => {
	function onDrop(from, to) {
		if (to != "offboard") {
			const game = new Chess(board.fen() + " " + playingColor() + " - - 0 1");

			const move = game.move({
				from : from,
				to : to,
				promotion : "q" // always promote to queen
			});

			// illegal move
			if (move === null) {
				return "snapback";
			}

			board.prevPosition = board.position();
			board.lastMove = move;
			const isWhiteToMove = board.game && board.game.isWhiteToMove;
			if (move.piece == "p" && ((isWhiteToMove && to.endsWith("8")) || (!isWhiteToMove && to.endsWith("1")))) {
				isOverlay.set(true);
				isPromotion.set(true);
			} else {
				saveGame();
			}
		}
	}

	const cfg = {
		draggable : true,
		dropOffBoard : "snapback", // this is the default
		onDrop : onDrop
	};

	board = new ChessBoard("chess-board", cfg);
	getGame();
});


Template.promotionPiece.helpers({
	playingColor : playingColor,
});

Template.promotionPiece.events({
	"click img" : function(e) {
		const position = board.position();
		position[board.lastMove.to] = playingColor() + this.piece;
		board.position(position);
		isPromotion.set(false);
		isOverlay.set(false);

		saveGame();
	},
});

///////////////////////////////////////////////////////////////////////////////////////////////////


function playingColor() {
	return (!board.game || board.game.isWhiteToMove) ? "w" : "b";
}

function saveGame() {
	if (Meteor.userId()) {
		isSpinner.set(true);
		board._position = board.position();
		Meteor.call("saveGame", board, function(err, result) {
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
	isSpinner.set(true);
	Meteor.call("getGame", function(err, result) {
		if (result === "WAIT") {
			isClock.set(false);
			isWaiting.set(true);
		} else if (result) {
			isWaiting.set(false);
			isClock.set(true);
			clockTime.set(MOVE_TIMEOUT / 1000);
			Meteor.clearInterval(clockIntervalId);
			clockIntervalId = Meteor.setInterval(() => {
				clockTime.set(clockTime.get() - 1);
				if (clockTime.get() == 0) {
					Meteor.clearInterval(clockIntervalId);
					getGame();
				}
			}, 1000);
			board.game = result;
			board.position(result.position);
		} else {
			isWaiting.set(false);
			board.start();
		}
		isSpinner.set(false);
	});
}

function undoLastMove() {
	board.position(board.prevPosition);
}
