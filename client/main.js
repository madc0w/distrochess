var board = null;
const isPromotion = new ReactiveVar(false);
const isOverlay = new ReactiveVar(false);
const isNeedToSignIn = new ReactiveVar(false);

Template.main.helpers({
	isPromotion : function() {
		return isPromotion.get();
	},

	isOverlay : function() {
		return isOverlay.get();
	},

	isNeedToSignIn : function() {
		return isNeedToSignIn.get();
	},

	playingColor : playingColor,
});

Template.main.events({
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
	Tracker.autorun(() => {
		if (Meteor.user() && board) {
			saveGame();
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
	Meteor.call("getGame", function(err, game) {
		if (game) {
			board.game = game;
			board.position(game.position);
		} else {
			board.start();
		}
	});
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
		console.log("save game");
		Meteor.call("saveGame", board, function(err, result) {});
	} else {
		isNeedToSignIn.set(true);
		isOverlay.set(true);
	}
}

function undoLastMove() {
	board.position(board.prevPosition);
}
